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

    const c = dbUser.company;
    const systemPrompt = `You are CEOS, AI assistant for Indian construction enterprises.

COMPANY: ${c.name} | Type: ${c.type} | Class: ${c.contractorClass || "Not set"} | City: ${c.city || ""}, ${c.state}

EXPERTISE: Indian government tendering (PWD, CPWD, Railway, MES, GeM), CPWD SOR, BOQ analysis, GST 18%, TDS 2%, ESI 3.25%+0.75%, EPF 12%+12%, RA Bill deductions (SD, IT-TDS, GST-TDS, Labour Cess 1%), WB e-Tender portal.

LANGUAGE RULE: Detect language from user input. Reply in SAME language. Bengali→Bengali, Hindi→Hindi, English→English. Be practical and specific.`;

    const completion = await groq.chat.completions.create({
      model: MODELS.BALANCED,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-8).map((h: { role: string; content: string }) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
        { role: "user", content: message },
      ],
      temperature: 0.4,
      max_tokens: 1024,
    });

    const response = completion.choices[0]?.message?.content || "Sorry, could not process request.";
    return NextResponse.json({ success: true, response });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}