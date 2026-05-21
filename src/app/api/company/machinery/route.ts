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
    const m = await prisma.machinery.findMany({ where: { companyId: u.companyId, isActive: true }, orderBy: { name: "asc" } });
    return NextResponse.json({ success: true, data: m });
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
    const m = await prisma.machinery.create({
      data: { companyId: u.companyId, name: b.name, category: b.category, make: b.make || null,
        yearOfMfg: b.yearOfMfg ? parseInt(b.yearOfMfg) : null,
        ownershipType: b.ownershipType || "OWNED", registrationNo: b.registrationNo || null }
    });
    return NextResponse.json({ success: true, data: m });
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
    await prisma.machinery.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (e: unknown) { return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Err" }, { status: 500 }); }
}