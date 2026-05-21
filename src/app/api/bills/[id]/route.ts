import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id }, include: { company: true } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const bill = await prisma.rABill.findFirst({
      where: { id, project: { companyId: dbUser.companyId } },
      include: { project: true, billItems: { orderBy: { id: "asc" } } },
    });
    if (!bill) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      success: true,
      bill: {
        ...bill,
        grossAmount: Number(bill.grossAmount),
        netPayable: Number(bill.netPayable),
        gstAmount: Number(bill.gstAmount),
        sdDeduction: Number(bill.sdDeduction),
        itTdsDeduction: Number(bill.itTdsDeduction),
        gstTdsDeduction: Number(bill.gstTdsDeduction),
        labourCess: Number(bill.labourCess),
        royaltyDeduction: Number(bill.royaltyDeduction),
        advanceRecovery: Number(bill.advanceRecovery),
        otherDeductions: Number(bill.otherDeductions),
        ldDeduction: Number(bill.ldDeduction),
        paymentAmount: bill.paymentAmount ? Number(bill.paymentAmount) : null,
        project: {
          ...bill.project,
          contractValue: Number(bill.project.contractValue),
          totalBilled: Number(bill.project.totalBilled),
          totalReceived: Number(bill.project.totalReceived),
        },
      },
      company: dbUser.company,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const b = await request.json();

    const bill = await prisma.rABill.update({
      where: { id },
      data: {
        ...(b.status && { status: b.status }),
        ...(b.submittedDate && { submittedDate: new Date(b.submittedDate) }),
        ...(b.gstInvoiceNumber && { gstInvoiceNumber: b.gstInvoiceNumber }),
      }
    });

    return NextResponse.json({ success: true, bill });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.rABill.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}