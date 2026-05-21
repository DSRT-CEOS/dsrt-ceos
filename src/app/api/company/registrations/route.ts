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
    const r = await prisma.contractorRegistration.findMany({ where: { companyId: u.companyId }, orderBy: { validUntil: "asc" } });
    return NextResponse.json({ success: true, data: r });
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
    const r = await prisma.contractorRegistration.create({
      data: {
        companyId: u.companyId, department: b.department, registrationNo: b.registrationNo,
        class: b.class || null,
        validFrom: b.validFrom ? new Date(b.validFrom) : new Date(),
        validUntil: new Date(b.validUntil),
        financialLimit: b.financialLimit ? parseFloat(b.financialLimit) : null,
      }
    });
    return NextResponse.json({ success: true, data: r });
  } catch (e: unknown) { return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Err" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  try {
    const s = await createClient();
    const { data: { user } } = await s.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await prisma.contractorRegistration.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) { return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Err" }, { status: 500 }); }
}