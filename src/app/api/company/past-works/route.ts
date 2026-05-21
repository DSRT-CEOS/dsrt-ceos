import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const s = await createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const u = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const w = await prisma.pastWork.findMany({ where: { companyId: u.companyId }, orderBy: { completionDate: "desc" } });
    return NextResponse.json({ success: true, data: w });
  } catch (e: unknown) { return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Err" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const s = await createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const u = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const b = await request.json();
    const w = await prisma.pastWork.create({
      data: {
        companyId: u.companyId, workName: b.workName, department: b.department,
        workOrderNumber: b.workOrderNumber || null,
        workOrderDate: b.workOrderDate ? new Date(b.workOrderDate) : null,
        sector: b.sector, contractValue: parseFloat(b.contractValue),
        completionDate: b.completionDate ? new Date(b.completionDate) : null,
        location: b.location || null, district: b.district || null,
        state: b.state || "West Bengal", isCompleted: b.isCompleted ?? true,
        workNature: b.workNature || null, keywords: [],
      }
    });
    return NextResponse.json({ success: true, data: w });
  } catch (e: unknown) { return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Err" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  try {
    const s = await createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const u = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await prisma.pastWork.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) { return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Err" }, { status: 500 }); }
}