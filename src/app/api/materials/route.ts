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

    const records = await prisma.materialLedger.findMany({
      where: { projectId },
      orderBy: { date: "desc" },
      take: 200,
    });

    return NextResponse.json({
      success: true,
      records: records.map(r => ({
        ...r,
        quantity: Number(r.quantity),
        rate: r.rate ? Number(r.rate) : null,
        amount: r.amount ? Number(r.amount) : null,
      })),
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

    const qty = parseFloat(b.quantity);
    const rate = b.rate ? parseFloat(b.rate) : null;
    const amount = rate ? qty * rate : (b.amount ? parseFloat(b.amount) : null);

    const record = await prisma.materialLedger.create({
      data: {
        projectId: b.projectId,
        date: b.date ? new Date(b.date) : new Date(),
        transactionType: b.transactionType, // RECEIPT, ISSUE, RETURN
        itemName: b.itemName,
        category: b.category || "OTHER",
        unit: b.unit,
        quantity: qty,
        rate, amount,
        vendorName: b.vendorName || null,
        billNumber: b.billNumber || null,
        vehicleNumber: b.vehicleNumber || null,
        workDescription: b.workDescription || null,
      }
    });

    return NextResponse.json({ success: true, record });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}