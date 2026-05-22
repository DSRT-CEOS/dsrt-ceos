import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const companyId = dbUser.companyId;

    // Parallel queries
    const [tenders, tenderTracks, projects, bills, docs, staff, machinery, pastWorks] = await Promise.all([
      prisma.tender.findMany({
        where: { uploadedById: companyId, isActive: true },
        select: { id: true, processingStatus: true, estimatedCost: true, createdAt: true, sector: true, department: true }
      }),
      prisma.tenderTrack.findMany({
        where: { companyId },
        select: { status: true, eligibilityStatus: true, matchScore: true, createdAt: true }
      }),
      prisma.project.findMany({
        where: { companyId },
        select: { status: true, contractValue: true, totalBilled: true, totalReceived: true, department: true, createdAt: true }
      }),
      prisma.rABill.findMany({
        where: { project: { companyId } },
        select: { status: true, netPayable: true, grossAmount: true, billDate: true, paymentAmount: true, paymentDate: true, sdDeduction: true, itTdsDeduction: true, gstTdsDeduction: true, labourCess: true }
      }),
      prisma.companyDocument.count({ where: { companyId, isLatest: true } }),
      prisma.staffMember.count({ where: { companyId, isActive: true } }),
      prisma.machinery.count({ where: { companyId, isActive: true } }),
      prisma.pastWork.count({ where: { companyId } }),
    ]);

    // Tender stats
    const tenderStats = {
      total: tenders.length,
      analyzed: tenders.filter(t => t.processingStatus === "COMPLETED").length,
      bySector: groupBy(tenders, "sector"),
      byDept: groupBy(tenders, "department"),
      totalValue: tenders.reduce((s, t) => s + Number(t.estimatedCost || 0), 0),
    };

    // Tracking stats
    const trackStats = {
      eligible: tenderTracks.filter(t => t.eligibilityStatus === "ELIGIBLE").length,
      partial: tenderTracks.filter(t => t.eligibilityStatus === "PARTIAL").length,
      notEligible: tenderTracks.filter(t => t.eligibilityStatus === "NOT_ELIGIBLE").length,
      byStatus: groupBy(tenderTracks, "status"),
      avgMatchScore: tenderTracks.filter(t => t.matchScore).reduce((s, t) => s + (t.matchScore || 0), 0) / (tenderTracks.filter(t => t.matchScore).length || 1),
      submitted: tenderTracks.filter(t => ["SUBMITTED", "WON", "LOST"].includes(t.status)).length,
      won: tenderTracks.filter(t => t.status === "WON").length,
      lost: tenderTracks.filter(t => t.status === "LOST").length,
    };
    const winRate = trackStats.submitted > 0 ? (trackStats.won / trackStats.submitted) * 100 : 0;

    // Project stats
    const projectStats = {
      total: projects.length,
      active: projects.filter(p => p.status === "ACTIVE").length,
      completed: projects.filter(p => p.status === "COMPLETED").length,
      totalContractValue: projects.reduce((s, p) => s + Number(p.contractValue), 0),
      totalBilled: projects.reduce((s, p) => s + Number(p.totalBilled), 0),
      totalReceived: projects.reduce((s, p) => s + Number(p.totalReceived), 0),
      byDept: groupBy(projects, "department"),
    };

    // Financial stats
    const totalDeductions = bills.reduce((s, b) => s + Number(b.sdDeduction) + Number(b.itTdsDeduction) + Number(b.gstTdsDeduction) + Number(b.labourCess), 0);

    const billStats = {
      total: bills.length,
      draft: bills.filter(b => b.status === "DRAFT").length,
      submitted: bills.filter(b => ["SUBMITTED", "UNDER_CHECK", "PASSED"].includes(b.status)).length,
      paid: bills.filter(b => b.status === "PAID").length,
      totalGross: bills.reduce((s, b) => s + Number(b.grossAmount), 0),
      totalNet: bills.reduce((s, b) => s + Number(b.netPayable), 0),
      totalReceived: bills.filter(b => b.status === "PAID").reduce((s, b) => s + (b.paymentAmount ? Number(b.paymentAmount) : 0), 0),
      totalDeductions,
      pending: bills.filter(b => b.status !== "PAID" && b.status !== "DRAFT").reduce((s, b) => s + Number(b.netPayable), 0),
    };

    // Monthly trend (last 12 months)
    const monthlyTrend = generateMonthlyTrend(bills);

    // Top departments by value
    const topDepts = Object.entries(projectStats.byDept)
      .map(([dept, count]) => {
        const deptProjects = projects.filter(p => p.department === dept);
        return {
          department: dept,
          projectCount: count,
          totalValue: deptProjects.reduce((s, p) => s + Number(p.contractValue), 0),
          received: deptProjects.reduce((s, p) => s + Number(p.totalReceived), 0),
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        company: {
          docs, staff, machinery, pastWorks,
        },
        tenders: tenderStats,
        tracks: { ...trackStats, winRate },
        projects: projectStats,
        bills: billStats,
        monthlyTrend,
        topDepts,
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    console.error("Reports err:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

function groupBy<T>(items: T[], key: keyof T): Record<string, number> {
  return items.reduce((acc, item) => {
    const k = String(item[key] || "Unknown");
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

function generateMonthlyTrend(bills: any[]): any[] {
  const months: Record<string, { billed: number; received: number; count: number }> = {};
  const now = new Date();

  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    months[key] = { billed: 0, received: 0, count: 0 };
  }

  bills.forEach(b => {
    const d = new Date(b.billDate);
    const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    if (months[key]) {
      months[key].billed += Number(b.netPayable);
      months[key].count += 1;
      if (b.status === "PAID" && b.paymentAmount) {
        months[key].received += Number(b.paymentAmount);
      }
    }
  });

  return Object.entries(months).map(([month, data]) => ({ month, ...data }));
}