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

    const workers = await prisma.worker.findMany({
      where: {
        companyId: dbUser.companyId,
        isActive: true,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      workers: workers.map(w => ({ ...w, dailyWage: Number(w.dailyWage) })),
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
    const worker = await prisma.worker.create({
      data: {
        companyId: dbUser.companyId,
        projectId: b.projectId || null,
        name: b.name,
        aadhaarNumber: b.aadhaarNumber || null,
        phone: b.phone || null,
        skillType: b.skillType || "UNSKILLED",
        trade: b.trade || null,
        dailyWage: parseFloat(b.dailyWage),
        bankAccount: b.bankAccount || null,
        bankIfsc: b.bankIfsc || null,
        joiningDate: b.joiningDate ? new Date(b.joiningDate) : new Date(),
      }
    });
    return NextResponse.json({ success: true, worker });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}