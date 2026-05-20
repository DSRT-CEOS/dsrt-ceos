import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { groq, MODELS } from "@/lib/ai/groq";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message, history = [] } = await request.json();

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      include: { company: true },
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const company = dbUser.company;

    const systemPrompt = `You are CEOS, an AI assistant for Indian construction enterprises.

COMPANY: ${company.name}
- Type: ${company.type}
- Class: ${company.contractorClass || "Not set"}
- Location: ${company.city || ""}, ${company.state}
- PAN: ${company.panNumber || "Not set"}
- GST: ${company.gstNumber || "Not set"}

YOUR EXPERTISE:
- Indian government tendering (NIT, BOQ, PWD, CPWD, Railway, MES, GeM)
- Construction estimation, CPWD Schedule of Rates
- GST 18%, TDS 2%, ESI 3.25%, EPF 12%
- RA Bill preparation with all deductions
- West Bengal PWD processes specifically

RULES:
- If user writes in Bengali, respond in Bengali
- If user writes in Hindi, respond in Hindi
- If user writes in English, respond in English
- Be practical like an experienced construction manager
- Show calculations step by step
- Keep responses concise but complete`;

    const messages = [
      ...history.slice(-8).map((h: { role: string; content: string }) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    const completion = await groq.chat.completions.create({
      model: MODELS.BALANCED,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.4,
      max_tokens: 1024,
    });

    const response = completion.choices[0]?.message?.content || "Sorry, I could not process your request.";

    return NextResponse.json({ success: true, response });
  } catch (err: unknown) {
    console.error("Chat error:", err);
    const msg = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}