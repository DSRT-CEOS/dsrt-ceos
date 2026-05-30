export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const sub = await prisma.subContractor.findFirst({
      where: { id, companyId: dbUser.companyId }
    });
    if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const b = await request.json();
    const amount = parseFloat(b.amount);
    const tds = b.tdsDeducted ? parseFloat(b.tdsDeducted) : 0;

    const payment = await prisma.subContractorPayment.create({
      data: {
        subContractorId: id,
        projectId: b.projectId || null,
        amount,
        paymentDate: new Date(b.paymentDate),
        paymentMethod: b.paymentMethod || "BANK_TRANSFER",
        reference: b.reference || null,
        tdsDeducted: tds,
        notes: b.notes || null,
      }
    });

    await prisma.subContractor.update({
      where: { id },
      data: { totalPaid: { increment: amount } }
    });

    return NextResponse.json({ success: true, payment });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}