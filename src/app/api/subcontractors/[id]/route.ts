export const dynamic = "force-dynamic";

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

    const sub = await prisma.subContractor.findFirst({
      where: { id, companyId: dbUser.companyId },
      include: {
        assignments: {
          include: { project: { select: { name: true, department: true } } },
          orderBy: { createdAt: "desc" }
        },
        payments: {
          orderBy: { paymentDate: "desc" }
        }
      }
    });

    if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      success: true,
      subcontractor: {
        ...sub,
        totalAwarded: Number(sub.totalAwarded),
        totalPaid: Number(sub.totalPaid),
        assignments: sub.assignments.map(a => ({ ...a, contractAmount: Number(a.contractAmount) })),
        payments: sub.payments.map(p => ({ ...p, amount: Number(p.amount), tdsDeducted: Number(p.tdsDeducted) })),
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
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

    // If it's an assignment creation
    if (b.action === "assign") {
      const project = await prisma.project.findFirst({
        where: { id: b.projectId, companyId: dbUser.companyId }
      });
      if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

      const amount = parseFloat(b.contractAmount);
      const assignment = await prisma.subContractorAssignment.create({
        data: {
          subContractorId: id,
          projectId: b.projectId,
          workDescription: b.workDescription,
          contractAmount: amount,
          startDate: b.startDate ? new Date(b.startDate) : null,
          endDate: b.endDate ? new Date(b.endDate) : null,
          notes: b.notes || null,
        }
      });

      await prisma.subContractor.update({
        where: { id },
        data: { totalAwarded: { increment: amount } }
      });

      return NextResponse.json({ success: true, assignment });
    }

    // Regular update
    const sub = await prisma.subContractor.update({
      where: { id },
      data: {
        ...(b.name && { name: b.name }),
        ...(b.contactPerson !== undefined && { contactPerson: b.contactPerson }),
        ...(b.phone !== undefined && { phone: b.phone }),
        ...(b.email !== undefined && { email: b.email }),
        ...(b.rating !== undefined && { rating: b.rating ? parseInt(b.rating) : null }),
        ...(b.notes !== undefined && { notes: b.notes }),
      }
    });

    return NextResponse.json({ success: true, subcontractor: sub });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
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

    await prisma.subContractor.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}