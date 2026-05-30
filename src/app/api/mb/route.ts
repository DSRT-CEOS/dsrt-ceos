export const dynamic = "force-dynamic";

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

    const entries = await prisma.mBEntry.findMany({
      where: { projectId },
      orderBy: [{ mbNumber: "asc" }, { date: "asc" }]
    });

    // Group by item for summary
    const itemSummary = entries.reduce((acc: any, e) => {
      const key = e.itemDescription;
      if (!acc[key]) acc[key] = { description: e.itemDescription, unit: e.unit, totalQty: 0, count: 0 };
      acc[key].totalQty += Number(e.netQuantity);
      acc[key].count += 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      entries: entries.map(e => ({
        ...e,
        length: e.length ? Number(e.length) : null,
        breadth: e.breadth ? Number(e.breadth) : null,
        height: e.height ? Number(e.height) : null,
        number: e.number ? Number(e.number) : 1,
        deduction: e.deduction ? Number(e.deduction) : 0,
        netQuantity: Number(e.netQuantity),
      })),
      itemSummary: Object.values(itemSummary),
      totalEntries: entries.length,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
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

    // Calculate net quantity: (L × B × H × Nos) - Deduction
    const L = parseFloat(b.length) || 1;
    const B = parseFloat(b.breadth) || 1;
    const H = parseFloat(b.height) || 1;
    const N = parseFloat(b.number) || 1;
    const D = parseFloat(b.deduction) || 0;
    const netQty = (L * B * H * N) - D;

    const entry = await prisma.mBEntry.create({
      data: {
        projectId: b.projectId,
        mbNumber: b.mbNumber || "MB-01",
        pageNumber: b.pageNumber || null,
        date: new Date(b.date || Date.now()),
        boqItemId: b.boqItemId || null,
        itemDescription: b.itemDescription,
        unit: b.unit,
        location: b.location || null,
        length: b.length ? parseFloat(b.length) : null,
        breadth: b.breadth ? parseFloat(b.breadth) : null,
        height: b.height ? parseFloat(b.height) : null,
        number: parseFloat(b.number || "1"),
        deduction: parseFloat(b.deduction || "0"),
        netQuantity: netQty,
        remarks: b.remarks || null,
        measuredBy: b.measuredBy || null,
        checkedBy: b.checkedBy || null,
      }
    });

    return NextResponse.json({ success: true, entry });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}