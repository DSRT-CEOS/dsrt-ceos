import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const projects = await prisma.project.findMany({
      where: { companyId: dbUser.companyId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { bills: true } } },
    });

    const stats = {
      total: projects.length,
      active: projects.filter(p => p.status === "ACTIVE").length,
      completed: projects.filter(p => p.status === "COMPLETED").length,
      totalValue: projects.reduce((s, p) => s + Number(p.contractValue), 0),
      totalBilled: projects.reduce((s, p) => s + Number(p.totalBilled), 0),
      totalReceived: projects.reduce((s, p) => s + Number(p.totalReceived), 0),
    };

    return NextResponse.json({
      success: true,
      projects: projects.map(p => ({
        ...p,
        contractValue: Number(p.contractValue),
        totalBilled: Number(p.totalBilled),
        totalReceived: Number(p.totalReceived),
        totalExpenses: Number(p.totalExpenses),
        progressPercent: p.progressPercent ? Number(p.progressPercent) : 0,
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

    const project = await prisma.project.create({
      data: {
        companyId: dbUser.companyId,
        tenderTrackId: b.tenderTrackId || null,
        name: b.name,
        projectCode: b.projectCode || null,
        department: b.department,
        workOrderNumber: b.workOrderNumber || null,
        workOrderDate: b.workOrderDate ? new Date(b.workOrderDate) : null,
        contractValue: parseFloat(b.contractValue),
        startDate: b.startDate ? new Date(b.startDate) : null,
        completionDate: b.completionDate ? new Date(b.completionDate) : null,
        status: b.status || "ACTIVE",
      }
    });

    // If from tender, update track status to WON
    if (b.tenderTrackId) {
      await prisma.tenderTrack.update({
        where: { id: b.tenderTrackId },
        data: { status: "WON" }
      });
    }

    return NextResponse.json({ success: true, project });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}