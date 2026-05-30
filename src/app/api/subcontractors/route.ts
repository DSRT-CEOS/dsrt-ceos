export const dynamic = "force-dynamic";

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

    const subs = await prisma.subContractor.findMany({
      where: { companyId: dbUser.companyId, isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { assignments: true, payments: true } }
      }
    });

    const stats = {
      total: subs.length,
      totalAwarded: subs.reduce((s, c) => s + Number(c.totalAwarded), 0),
      totalPaid: subs.reduce((s, c) => s + Number(c.totalPaid), 0),
      outstanding: subs.reduce((s, c) => s + (Number(c.totalAwarded) - Number(c.totalPaid)), 0),
    };

    return NextResponse.json({
      success: true,
      subcontractors: subs.map(s => ({
        ...s,
        totalAwarded: Number(s.totalAwarded),
        totalPaid: Number(s.totalPaid),
        outstanding: Number(s.totalAwarded) - Number(s.totalPaid),
      })),
      stats,
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
    const sub = await prisma.subContractor.create({
      data: {
        companyId: dbUser.companyId,
        name: b.name,
        contactPerson: b.contactPerson || null,
        phone: b.phone || null,
        email: b.email || null,
        panNumber: b.panNumber || null,
        gstNumber: b.gstNumber || null,
        address: b.address || null,
        specialization: b.specialization || [],
        bankAccount: b.bankAccount || null,
        bankIfsc: b.bankIfsc || null,
        notes: b.notes || null,
        rating: b.rating ? parseInt(b.rating) : null,
      }
    });

    return NextResponse.json({ success: true, subcontractor: sub });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}