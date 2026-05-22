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

    const items = await prisma.projectBOQProgress.findMany({
      where: { projectId },
      orderBy: { slNo: "asc" },
    });

    const totals = {
      itemCount: items.length,
      totalContractValue: items.reduce((s, i) => s + (Number(i.contractQty) * Number(i.rate)), 0),
      totalCompleted: items.reduce((s, i) => s + (Number(i.totalCompleted) * Number(i.rate)), 0),
      avgProgress: items.length > 0
        ? items.reduce((s, i) => s + (Number(i.contractQty) > 0 ? (Number(i.totalCompleted) / Number(i.contractQty)) * 100 : 0), 0) / items.length
        : 0,
    };

    return NextResponse.json({
      success: true,
      items: items.map(i => ({
        ...i,
        contractQty: Number(i.contractQty),
        rate: Number(i.rate),
        totalCompleted: Number(i.totalCompleted),
        lastBilledQty: Number(i.lastBilledQty),
        amount: Number(i.contractQty) * Number(i.rate),
        completedAmount: Number(i.totalCompleted) * Number(i.rate),
        progress: Number(i.contractQty) > 0 ? (Number(i.totalCompleted) / Number(i.contractQty)) * 100 : 0,
      })),
      totals,
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

    const item = await prisma.projectBOQProgress.create({
      data: {
        projectId: b.projectId,
        boqItemId: b.boqItemId || `BOQ-${Date.now()}`,
        slNo: b.slNo,
        description: b.description,
        unit: b.unit || null,
        contractQty: parseFloat(b.contractQty),
        rate: parseFloat(b.rate),
        totalCompleted: 0,
      }
    });

    return NextResponse.json({ success: true, item });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}