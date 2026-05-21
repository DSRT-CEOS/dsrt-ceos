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

    const b = await request.json();

    const bill = await prisma.rABill.findFirst({
      where: { id, project: { companyId: dbUser.companyId } }
    });
    if (!bill) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const paymentAmount = parseFloat(b.paymentAmount);

    const updated = await prisma.rABill.update({
      where: { id },
      data: {
        paymentDate: b.paymentDate ? new Date(b.paymentDate) : new Date(),
        paymentAmount,
        paymentReference: b.paymentReference || null,
        status: "PAID",
      }
    });

    // Update project totals
    await prisma.project.update({
      where: { id: bill.projectId },
      data: {
        totalReceived: { increment: paymentAmount },
        sdDeducted: { increment: Number(bill.sdDeduction) },
      }
    });

    return NextResponse.json({ success: true, bill: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}