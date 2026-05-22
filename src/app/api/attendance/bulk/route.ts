import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { projectId, date, records } = await request.json();
    if (!projectId || !date || !Array.isArray(records)) {
      return NextResponse.json({ error: "projectId, date, records required" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({ where: { id: projectId, companyId: dbUser.companyId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const attDate = new Date(date);
    attDate.setHours(0, 0, 0, 0);

    // Delete existing records for that date+project
    await prisma.attendanceRecord.deleteMany({ where: { projectId, date: attDate } });

    // Insert new records
    const created = await prisma.attendanceRecord.createMany({
      data: records.map((r: any) => ({
        date: attDate,
        projectId,
        workerName: r.workerName,
        workerAadhaar: r.workerAadhaar || null,
        skillType: r.skillType || "UNSKILLED",
        status: r.status,
        overtimeHours: r.overtimeHours ? parseFloat(r.overtimeHours) : null,
        dailyWage: parseFloat(r.dailyWage),
      })),
    });

    return NextResponse.json({ success: true, count: created.count });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}