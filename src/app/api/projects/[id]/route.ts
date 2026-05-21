import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const project = await prisma.project.findFirst({
      where: { id, companyId: dbUser.companyId },
      include: {
        bills: { orderBy: { createdAt: "desc" } },
        tenderTrack: { include: { tender: true } },
      },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      success: true,
      project: {
        ...project,
        contractValue: Number(project.contractValue),
        totalBilled: Number(project.totalBilled),
        totalReceived: Number(project.totalReceived),
        totalExpenses: Number(project.totalExpenses),
        sdDeducted: Number(project.sdDeducted),
        sdReleased: Number(project.sdReleased),
        bills: project.bills.map(b => ({
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
      },
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
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(b.name && { name: b.name }),
        ...(b.status && { status: b.status }),
        ...(b.progressPercent !== undefined && { progressPercent: parseFloat(b.progressPercent) }),
        ...(b.actualCompletionDate && { actualCompletionDate: new Date(b.actualCompletionDate) }),
      }
    });

    return NextResponse.json({ success: true, project });
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

    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}