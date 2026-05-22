import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const project = await prisma.project.findFirst({ where: { id: projectId, companyId: dbUser.companyId } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const expenses = await prisma.projectExpense.findMany({
      where: { projectId }, orderBy: { date: "desc" }, take: 200,
    });

    const byCategory: Record<string, number> = {};
    expenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.totalAmount);
    });

    const stats = {
      total: expenses.length,
      totalAmount: expenses.reduce((s, e) => s + Number(e.totalAmount), 0),
      paid: expenses.filter(e => e.paymentStatus === "PAID").length,
      pending: expenses.filter(e => e.paymentStatus === "PENDING").length,
      byCategory,
    };

    return NextResponse.json({
      success: true,
      expenses: expenses.map(e => ({
        ...e,
        amount: Number(e.amount),
        gstAmount: e.gstAmount ? Number(e.gstAmount) : null,
        totalAmount: Number(e.totalAmount),
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
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const amount = parseFloat(b.amount);
    const gstAmount = b.gstAmount ? parseFloat(b.gstAmount) : 0;
    const totalAmount = amount + gstAmount;

    const expense = await prisma.projectExpense.create({
      data: {
        projectId: b.projectId,
        date: b.date ? new Date(b.date) : new Date(),
        category: b.category,
        description: b.description,
        vendorName: b.vendorName || null,
        billNumber: b.billNumber || null,
        amount, gstAmount, totalAmount,
        paymentStatus: b.paymentStatus || "PENDING",
      }
    });

    // Update project totalExpenses
    await prisma.project.update({
      where: { id: b.projectId },
      data: { totalExpenses: { increment: totalAmount } }
    });

    return NextResponse.json({ success: true, expense });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}