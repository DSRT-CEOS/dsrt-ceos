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

    const params = new URL(request.url).searchParams;
    const projectId = params.get("projectId");
    const date = params.get("date");

    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const project = await prisma.project.findFirst({ where: { id: projectId, companyId: dbUser.companyId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const where: any = { projectId };
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: d, lte: end };
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      orderBy: [{ date: "desc" }, { workerName: "asc" }],
      take: 500,
    });

    return NextResponse.json({
      success: true,
      records: records.map(r => ({ ...r, dailyWage: Number(r.dailyWage), overtimeHours: r.overtimeHours ? Number(r.overtimeHours) : null })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}