import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { calculateBill } from "@/lib/billing/calculator";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const projectId = new URL(request.url).searchParams.get("projectId");

    const bills = await prisma.rABill.findMany({
      where: {
        project: { companyId: dbUser.companyId },
        ...(projectId ? { projectId } : {}),
      },
      include: { project: { select: { name: true, department: true } } },
      orderBy: { createdAt: "desc" },
    });

    const stats = {
      total: bills.length,
      draft: bills.filter(b => b.status === "DRAFT").length,
      submitted: bills.filter(b => ["SUBMITTED", "UNDER_CHECK", "PASSED"].includes(b.status)).length,
      paid: bills.filter(b => b.status === "PAID").length,
      totalBilled: bills.reduce((s, b) => s + Number(b.netPayable), 0),
      totalReceived: bills.filter(b => b.status === "PAID").reduce((s, b) => s + (b.paymentAmount ? Number(b.paymentAmount) : 0), 0),
      pending: bills.filter(b => b.status !== "PAID").reduce((s, b) => s + Number(b.netPayable), 0),
    };

    return NextResponse.json({
      success: true,
      bills: bills.map(b => ({
        ...b,
        grossAmount: Number(b.grossAmount),
        netPayable: Number(b.netPayable),
        gstAmount: Number(b.gstAmount),
        sdDeduction: Number(b.sdDeduction),
        itTdsDeduction: Number(b.itTdsDeduction),
        gstTdsDeduction: Number(b.gstTdsDeduction),
        labourCess: Number(b.labourCess),
        paymentAmount: b.paymentAmount ? Number(b.paymentAmount) : null,
      })),
      stats,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const b = await request.json();

    const project = await prisma.project.findFirst({ where: { id: b.projectId, companyId: dbUser.companyId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Auto-generate bill number: RA-001, RA-002...
    const billCount = await prisma.rABill.count({ where: { projectId: b.projectId } });
    const billNumber = b.billType === "FINAL"
      ? `FINAL-${String(billCount + 1).padStart(3, "0")}`
      : `RA-${String(billCount + 1).padStart(3, "0")}`;

    const calc = calculateBill({
      grossAmount: parseFloat(b.grossAmount),
      gstRate: parseFloat(b.gstRate ?? 18),
      sdPct: parseFloat(b.sdPct ?? 10),
      itTdsPct: parseFloat(b.itTdsPct ?? 2),
      gstTdsPct: parseFloat(b.gstTdsPct ?? 2),
      labourCessPct: parseFloat(b.labourCessPct ?? 1),
      royalty: parseFloat(b.royalty ?? 0),
      advanceRecovery: parseFloat(b.advanceRecovery ?? 0),
      otherDeductions: parseFloat(b.otherDeductions ?? 0),
      ldDeduction: parseFloat(b.ldDeduction ?? 0),
    });

    const bill = await prisma.rABill.create({
      data: {
        projectId: b.projectId,
        billNumber,
        billType: b.billType || "RA",
        billDate: b.billDate ? new Date(b.billDate) : new Date(),
        periodFrom: b.periodFrom ? new Date(b.periodFrom) : null,
        periodTo: b.periodTo ? new Date(b.periodTo) : null,
        grossAmount: calc.grossAmount,
        gstAmount: calc.gstAmount,
        gstRate: parseFloat(b.gstRate ?? 18),
        sdDeduction: calc.sdDeduction,
        itTdsDeduction: calc.itTdsDeduction,
        gstTdsDeduction: calc.gstTdsDeduction,
        labourCess: calc.labourCess,
        royaltyDeduction: calc.royaltyDeduction,
        advanceRecovery: calc.advanceRecovery,
        otherDeductions: calc.otherDeductions,
        ldDeduction: calc.ldDeduction,
        netPayable: calc.netPayable,
        status: "DRAFT",
      }
    });

    return NextResponse.json({ success: true, bill });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}