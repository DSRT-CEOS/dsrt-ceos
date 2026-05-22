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
      include: { company: true }
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const cid = dbUser.companyId;

    // Build live context from database
    const [tenderCount, eligibleCount, activeProjects, pendingBillsAgg, paidBillsAgg, urgentTenders, expiringDocs] = await Promise.all([
      prisma.tender.count({ where: { uploadedById: cid, isActive: true } }),
      prisma.tenderTrack.count({ where: { companyId: cid, eligibilityStatus: "ELIGIBLE" } }),
      prisma.project.count({ where: { companyId: cid, status: "ACTIVE" } }),
      prisma.rABill.aggregate({
        where: { project: { companyId: cid }, status: { in: ["SUBMITTED", "UNDER_CHECK", "PASSED"] } },
        _sum: { netPayable: true }, _count: true
      }),
      prisma.rABill.aggregate({
        where: { project: { companyId: cid }, status: "PAID" },
        _sum: { paymentAmount: true }
      }),
      prisma.tender.findMany({
        where: {
          uploadedById: cid, isActive: true,
          lastSubmissionDate: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) },
          tracks: { some: { companyId: cid, status: { in: ["DISCOVERED", "SHORTLISTED", "PREPARING"] } } }
        },
        select: { workName: true, lastSubmissionDate: true, department: true, estimatedCost: true },
        take: 5
      }),
      prisma.companyDocument.count({
        where: { companyId: cid, isLatest: true, expiryDate: { lte: new Date(Date.now() + 30 * 86400000), gte: new Date() } }
      }),
    ]);

    const c = dbUser.company;
    const pendingAmount = Number(pendingBillsAgg._sum.netPayable || 0);
    const receivedAmount = Number(paidBillsAgg._sum.paymentAmount || 0);

    const urgentList = urgentTenders.map(t => {
      const days = Math.ceil((new Date(t.lastSubmissionDate!).getTime() - Date.now()) / 86400000);
      return `- "${t.workName}" (${t.department}, closes in ${days} days, value: ${t.estimatedCost ? `Rs ${Number(t.estimatedCost).toLocaleString("en-IN")}` : "N/A"})`;
    }).join("\n");

    const systemPrompt = `You are CEOS, AI assistant for Indian construction enterprises.

COMPANY: ${c.name}
- Type: ${c.type} | Class: ${c.contractorClass || "Not set"} 
- Location: ${c.city || ""}, ${c.state}
- PAN: ${c.panNumber || "Not set"} | GST: ${c.gstNumber || "Not set"}

CURRENT LIVE STATUS (real data):
- Total tenders uploaded: ${tenderCount}
- Eligible tenders: ${eligibleCount}
- Active projects: ${activeProjects}
- Pending payments: Rs ${pendingAmount.toLocaleString("en-IN")} (from ${pendingBillsAgg._count} bills)
- Total received: Rs ${receivedAmount.toLocaleString("en-IN")}
- Documents expiring in 30 days: ${expiringDocs}

${urgentTenders.length > 0 ? `URGENT TENDERS CLOSING IN 7 DAYS:\n${urgentList}` : "No urgent tender deadlines."}

EXPERTISE: 
- Indian government tendering (PWD, CPWD, Railway, MES, GeM, WBPWD)
- CPWD Schedule of Rates, BOQ analysis
- GST 18%, IT-TDS 2%, GST-TDS 2%, Labour Cess 1%
- ESI (3.25% employer + 0.75% employee on wages up to Rs 21,000/month)
- EPF (12% + 12% on Basic+DA, EPS capped at Rs 15,000)
- RA Bills, Security Deposit (5-10%), Performance Guarantee
- WB e-Tender portal, BOCW registration

LANGUAGE RULES: 
- Detect language from user input
- Reply in SAME language: Bengali→Bengali (বাংলা), Hindi→Hindi (हिंदी), English→English
- Be practical, specific, use real numbers when answering about user's data
- Show calculations step by step for cost/deduction questions
- Reference user's actual tenders/projects/bills when relevant`;

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
      max_tokens: 1500,
    });

    const response = completion.choices[0]?.message?.content || "Sorry, could not process request.";
    return NextResponse.json({ success: true, response });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Chat failed";
    console.error("Chat err:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}