import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groq, MODELS } from "@/lib/ai/groq";
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

    // Quick stats for context
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

    const systemPrompt = `You are CEOS — the AI assistant that CONTROLS DSRT CEOS (Construction Enterprise OS).
You are NOT a chatbot. You are an active assistant that can navigate, fetch data, and help users get things done.

COMPANY: ${c.name}
- Type: ${c.type} | Class: ${c.contractorClass || "Not set"}
- Location: ${c.city || ""}, ${c.state}

CURRENT LIVE STATUS:
- Total tenders: ${tenderCount} | Eligible: ${eligibleCount} | Urgent (7 days): ${urgentTendersCount}
- Active projects: ${activeProjects}
- Pending payments: Rs ${pendingAmount.toLocaleString("en-IN")} (${pendingBillsAgg._count} bills)
- User is currently on page: ${currentPath}

EXPERTISE:
- Indian govt tenders (PWD, CPWD, Railway, MES, GeM, WBPWD)
- GST 18%, IT-TDS 2%, GST-TDS 2%, Labour Cess 1%
- ESI 3.25% + 0.75% (wage up to Rs 21,000)
- EPF 12% + 12% (Basic+DA, EPS cap Rs 15,000)
- RA Bills, Security Deposit, Performance Guarantee
- Construction costing, BOQ analysis

${getToolSchema()}

LANGUAGE RULES:
- Detect language: Bengali→reply Bengali (বাংলা)
- Hindi→reply Hindi (हिंदी)
- English→reply English
- Match user's language exactly

RESPONSE STYLE:
- Be ACTIVE — when user asks for tenders, USE list_tenders tool, don't ask them to click
- When user says "show me bills" or "take me to bills", USE navigate tool
- When user asks calculations (e.g. "how much GST on 5 lakhs"), calculate directly
- Be concise, use bullet points, show real numbers
- After tool execution, present results clearly with markdown formatting
- Use **bold** for emphasis, bullets for lists

EXAMPLES:
User: "আমার urgent tenders দেখাও"
You: <tool>{"tool": "list_urgent_tenders"}</tool>

User: "Take me to compliance page"
You: <tool>{"tool": "navigate", "params": {"path": "/dashboard/compliance"}}</tool>

User: "How much GST on 5 lakhs?"
You: GST on Rs 5,00,000 at 18% = Rs 90,000. Total billable = Rs 5,90,000.`;

    // Step 1: First AI call - decide if tools needed
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.slice(-6).map((h: any) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    const firstCompletion = await groq.chat.completions.create({
      model: MODELS.BALANCED,
      messages,
      temperature: 0.3,
      max_tokens: 1500,
    });

    let firstResponse = firstCompletion.choices[0]?.message?.content || "";

    // Step 2: Check if AI used tools
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

      // Remove tool tags from response
      let cleaned = firstResponse.replace(/<tool>[\s\S]*?<\/tool>/g, "").trim();

      // Step 3: If we have tool results, get AI to synthesize a final response
      if (toolResults.length > 0 && toolResults.some(r => r.data)) {
        const toolContext = toolResults.map(r => {
          if (r.navigate) return `Navigated to: ${r.navigate}`;
          return `Tool ${r.tool} returned:\n${JSON.stringify(r.data, null, 2)}`;
        }).join("\n\n");

        const synthMessages = [
          { role: "system" as const, content: systemPrompt + "\n\nIMPORTANT: Tools have been executed. Now present results to user in their language. Be concise. Use markdown. DO NOT use any more <tool> tags." },
          ...history.slice(-4).map((h: any) => ({ role: h.role as "user" | "assistant", content: h.content })),
          { role: "user" as const, content: message },
          { role: "assistant" as const, content: cleaned || "Fetching data..." },
          { role: "user" as const, content: `TOOL RESULTS:\n${toolContext}\n\nNow give a final answer based on this data. No more tool calls.` },
        ];

        const synthCompletion = await groq.chat.completions.create({
          model: MODELS.BALANCED, messages: synthMessages, temperature: 0.4, max_tokens: 1500,
        });

        firstResponse = synthCompletion.choices[0]?.message?.content || cleaned;
        firstResponse = firstResponse.replace(/<tool>[\s\S]*?<\/tool>/g, "").trim();
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
    return NextResponse.json({ success: false, error: err.message || "Chat failed" }, { status: 500 });
  }
}