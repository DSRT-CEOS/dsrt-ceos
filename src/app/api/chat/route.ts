import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chatCompletion, MODELS } from "@/lib/ai/groq";
import { executeToolCall, getToolSchema, ToolCall } from "@/lib/ai/tools";
import prisma from "@/lib/prisma";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message, history = [], currentPath = "/dashboard" } = await request.json();

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      include: { company: true }
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const cid = dbUser.companyId;
    const c = dbUser.company;

    // Quick stats
    const [tenderCount, eligibleCount, activeProjects, pendingBillsAgg, urgentTendersCount] = await Promise.all([
      prisma.tender.count({ where: { uploadedById: cid, isActive: true } }),
      prisma.tenderTrack.count({ where: { companyId: cid, eligibilityStatus: "ELIGIBLE" } }),
      prisma.project.count({ where: { companyId: cid, status: "ACTIVE" } }),
      prisma.rABill.aggregate({
        where: { project: { companyId: cid }, status: { in: ["SUBMITTED", "UNDER_CHECK", "PASSED"] } },
        _sum: { netPayable: true }, _count: true
      }),
      prisma.tender.count({
        where: {
          uploadedById: cid, isActive: true,
          lastSubmissionDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) },
        }
      }),
    ]);

    const pendingAmount = Number(pendingBillsAgg._sum.netPayable || 0);

    const systemPrompt = `You are CEOS — the AI assistant that CONTROLS DSRT CEOS.

COMPANY: ${c.name} | Type: ${c.type} | Class: ${c.contractorClass || "Not set"} | Location: ${c.city || ""}, ${c.state}

LIVE STATUS:
- Tenders: ${tenderCount} total, ${eligibleCount} eligible, ${urgentTendersCount} urgent (7d)
- Projects: ${activeProjects} active
- Pending payments: Rs ${pendingAmount.toLocaleString("en-IN")} (${pendingBillsAgg._count} bills)
- Current page: ${currentPath}

EXPERTISE: Indian govt tenders, GST 18%, IT-TDS 2%, ESI 3.25%+0.75%, EPF 12%+12%, RA bills

${getToolSchema()}

LANGUAGE: Match user input language exactly (Bengali/Hindi/English).
STYLE: Active, concise, use tools when asked for data, navigate when asked. Use markdown.`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.slice(-6).map((h: any) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    // Try chat with fallback chain (uses 8b-instant first - 5x more quota!)
    let firstResponse: string;
    try {
      firstResponse = await chatCompletion(messages, {
        fallbackChain: [
          "llama-3.1-8b-instant",        // try fast model first - 500K TPD
          "llama-3.3-70b-versatile",     // fallback to balanced
          "mixtral-8x7b-32768",          // last resort
        ],
        temperature: 0.3,
        maxTokens: 1500,
      });
    } catch (err: any) {
      if (err.isRateLimit) {
        return NextResponse.json({
          success: false,
          error: `All AI models exhausted today. ${err.retryAfter ? `Try in ${Math.ceil(err.retryAfter / 60)} minutes.` : "Try tomorrow."} Free tier limit reached.`,
          isRateLimit: true,
        }, { status: 429 });
      }
      throw err;
    }

    // Check for tool calls
    const toolMatches = [...firstResponse.matchAll(/<tool>([\s\S]*?)<\/tool>/g)];
    const toolResults: any[] = [];
    let navigate: string | null = null;

    if (toolMatches.length > 0) {
      for (const match of toolMatches) {
        try {
          const toolCall: ToolCall = JSON.parse(match[1].trim());
          const result = await executeToolCall(toolCall, cid);
          toolResults.push(result);
          if (result.navigate) navigate = result.navigate;
        } catch (e) {
          console.error("Tool parse error:", e);
        }
      }

      let cleaned = firstResponse.replace(/<tool>[\s\S]*?<\/tool>/g, "").trim();

      // Synthesize final response with tool results
      if (toolResults.length > 0 && toolResults.some(r => r.data)) {
        const toolContext = toolResults.map(r => {
          if (r.navigate) return `Navigated to: ${r.navigate}`;
          return `Tool ${r.tool} returned:\n${JSON.stringify(r.data, null, 2)}`;
        }).join("\n\n");

        const synthMessages = [
          { role: "system" as const, content: systemPrompt + "\n\nTools executed. Present results concisely. NO more tool tags." },
          ...history.slice(-4).map((h: any) => ({ role: h.role as "user" | "assistant", content: h.content })),
          { role: "user" as const, content: message },
          { role: "assistant" as const, content: cleaned || "Fetching..." },
          { role: "user" as const, content: `RESULTS:\n${toolContext}\n\nGive final answer.` },
        ];

        try {
          firstResponse = await chatCompletion(synthMessages, {
            fallbackChain: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
            temperature: 0.4,
            maxTokens: 1000,
          });
          firstResponse = firstResponse.replace(/<tool>[\s\S]*?<\/tool>/g, "").trim();
        } catch (err: any) {
          // If synthesis fails, return cleaned + raw data
          firstResponse = cleaned || "Here is the data you requested.";
        }
      } else {
        firstResponse = cleaned;
      }
    }

    return NextResponse.json({
      success: true,
      response: firstResponse,
      toolResults: toolResults.length > 0 ? toolResults : undefined,
      navigate,
    });
  } catch (err: any) {
    console.error("Chat err:", err);
    if (err.isRateLimit) {
      return NextResponse.json({
        success: false,
        error: err.message,
        isRateLimit: true,
        retryAfter: err.retryAfter,
      }, { status: 429 });
    }
    return NextResponse.json({
      success: false,
      error: err.message || "Chat failed"
    }, { status: 500 });
  }
}