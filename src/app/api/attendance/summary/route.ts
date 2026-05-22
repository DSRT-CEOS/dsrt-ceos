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
    const month = params.get("month"); // YYYY-MM format

    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const project = await prisma.project.findFirst({ where: { id: projectId, companyId: dbUser.companyId } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let startDate: Date, endDate: Date;
    if (month) {
      const [y, m] = month.split("-").map(Number);
      startDate = new Date(y, m - 1, 1);
      endDate = new Date(y, m, 0, 23, 59, 59);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const records = await prisma.attendanceRecord.findMany({
      where: { projectId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: "asc" },
    });

    // Aggregate by worker
    const workerMap = new Map<string, any>();
    records.forEach(r => {
      const key = r.workerName;
      if (!workerMap.has(key)) {
        workerMap.set(key, {
          workerName: r.workerName,
          workerAadhaar: r.workerAadhaar,
          skillType: r.skillType,
          dailyWage: Number(r.dailyWage),
          present: 0, halfDay: 0, absent: 0, overtimeHours: 0,
          totalWage: 0,
        });
      }
      const w = workerMap.get(key);
      if (r.status === "PRESENT") {
        w.present++;
        w.totalWage += Number(r.dailyWage);
      } else if (r.status === "HALF_DAY") {
        w.halfDay++;
        w.totalWage += Number(r.dailyWage) / 2;
      } else if (r.status === "ABSENT") {
        w.absent++;
      }
      if (r.overtimeHours) {
        w.overtimeHours += Number(r.overtimeHours);
        // OT pay = (daily wage / 8) * 2 * OT hours (1.5x to 2x)
        w.totalWage += (Number(r.dailyWage) / 8) * 2 * Number(r.overtimeHours);
      }
    });

    const workers = Array.from(workerMap.values()).sort((a, b) => a.workerName.localeCompare(b.workerName));
    const totals = {
      uniqueWorkers: workers.length,
      totalPresent: workers.reduce((s, w) => s + w.present, 0),
      totalHalfDay: workers.reduce((s, w) => s + w.halfDay, 0),
      totalAbsent: workers.reduce((s, w) => s + w.absent, 0),
      totalOvertimeHours: workers.reduce((s, w) => s + w.overtimeHours, 0),
      totalWages: workers.reduce((s, w) => s + w.totalWage, 0),
    };

    return NextResponse.json({
      success: true,
      period: `${startDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`,
      workers,
      totals,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}