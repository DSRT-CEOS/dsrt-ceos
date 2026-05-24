import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chatCompletion } from "@/lib/ai/groq";
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

    // Get REAL counts so AI never hallucinates
    const [tenderCount, eligibleCount, activeProjects, pendingBillsAgg, urgentTendersCount, docsCount, billsCount] = await Promise.all([
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
      prisma.companyDocument.count({ where: { companyId: cid, isLatest: true } }),
      prisma.rABill.count({ where: { project: { companyId: cid } } }),
    ]);

    const pendingAmount = Number(pendingBillsAgg._sum.netPayable || 0);

    const systemPrompt = `You are CEOS — AI assistant for DSRT CEOS Construction OS.

═══════════════════════════════════════════════
CRITICAL RULES — VIOLATE = SYSTEM FAILURE
═══════════════════════════════════════════════
1. NEVER invent or hallucinate data. If user asks about their data, you MUST use tools.
2. NEVER make up tender names, IDs, amounts, or any specifics.
3. If a tool returns empty array [] or no data, tell user "You have no [items] yet" and suggest they upload/create one.
4. Detect language: Bengali→reply Bengali, Hindi→reply Hindi, English→reply English.
5. Be concise. Use markdown.

═══════════════════════════════════════════════
COMPANY (USE THESE EXACT FACTS)
═══════════════════════════════════════════════
Name: ${c.name}
Type: ${c.type} | Class: ${c.contractorClass || "Not set"}
Location: ${c.city || ""}, ${c.state}

REAL-TIME DATABASE COUNTS (THESE ARE FACTS):
- Total tenders uploaded: ${tenderCount}
- Eligible tenders: ${eligibleCount}
- Urgent tenders (closing 7 days): ${urgentTendersCount}
- Active projects: ${activeProjects}
- Total bills: ${billsCount}
- Pending payment bills: ${pendingBillsAgg._count} worth Rs ${pendingAmount.toLocaleString("en-IN")}
- Documents in vault: ${docsCount}
- Current page user is on: ${currentPath}

═══════════════════════════════════════════════
TOOLS — USE THESE TO FETCH REAL DATA
═══════════════════════════════════════════════
${getToolSchema()}

═══════════════════════════════════════════════
BEHAVIOR RULES
═══════════════════════════════════════════════
- User asks "show my tenders" → IF tenderCount is 0, say "You have not uploaded any tenders yet. Upload your first tender PDF at /dashboard/tenders to begin." DO NOT call tool.
- User asks "show my tenders" → IF tenderCount > 0, USE list_tenders tool.
- User asks "last tender" or "my last tender" → IF 0, tell them no tenders exist. IF > 0, use list_tenders tool.
- User asks calculations (GST, TDS, etc.) → calculate directly, no tools needed.
- User says "go to X" or "open X" → use navigate tool.

═══════════════════════════════════════════════
EXPERTISE
═══════════════════════════════════════════════
- Indian govt tendering (PWD, CPWD, Railway, MES, GeM)
- GST 18%, IT-TDS 2%, GST-TDS 2%, Labour Cess 1%
- ESI 3.25%+0.75% (wage cap Rs 21,000)
- EPF 12%+12% (Basic+DA, EPS cap Rs 15,000)`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.slice(-6).map((h: any) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    let firstResponse: string;
    try {
      firstResponse = await chatCompletion(messages, {
        fallbackChain: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
        temperature: 0.2,
        maxTokens: 1200,
      });
    } catch (err: any) {
      if (err.isRateLimit) {
        return NextResponse.json({
          success: false,
          error: err.message,
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

      if (toolResults.length > 0) {
        const toolContext = toolResults.map(r => {
          if (r.navigate) return `Navigated to: ${r.navigate}`;
          if (!r.success) return `Tool ${r.tool} failed: ${r.error}`;
          const dataStr = JSON.stringify(r.data, null, 2);
          // If empty array, make it crystal clear
          if (Array.isArray(r.data) && r.data.length === 0) {
            return `Tool ${r.tool} returned EMPTY (no records exist).`;
          }
          return `Tool ${r.tool} returned:\n${dataStr}`;
        }).join("\n\n");

        const synthSystemPrompt = systemPrompt + `\n\n═══════════════════════════════════════════════
IMPORTANT: Tools have run. Present results honestly.
- If tool returned empty array, say "No [items] found. You have not added any yet."
- DO NOT invent data not in the results.
- Be concise.
- NO more <tool> tags.
═══════════════════════════════════════════════`;

        const synthMessages = [
          { role: "system" as const, content: synthSystemPrompt },
          ...history.slice(-4).map((h: any) => ({ role: h.role as "user" | "assistant", content: h.content })),
          { role: "user" as const, content: message },
          { role: "user" as const, content: `[SYSTEM] Tool results:\n${toolContext}\n\nNow respond to the original user question based on this real data. If data is empty, say so honestly.` },
        ];

        try {
          firstResponse = await chatCompletion(synthMessages, {
            fallbackChain: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"],
            temperature: 0.3,
            maxTokens: 800,
          });
          firstResponse = firstResponse.replace(/<tool>[\s\S]*?<\/tool>/g, "").trim();
        } catch (err: any) {
          if (err.isRateLimit) {
            firstResponse = cleaned || "Data fetched but response generation failed due to quota. Try again later.";
          } else {
            firstResponse = cleaned || "Data fetched.";
          }
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