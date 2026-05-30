export const dynamic = "force-dynamic";

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

    const { tenderIds } = await request.json();
    if (!Array.isArray(tenderIds) || tenderIds.length < 2) {
      return NextResponse.json({ error: "Select at least 2 tenders" }, { status: 400 });
    }

    const tenders = await prisma.tender.findMany({
      where: { id: { in: tenderIds }, uploadedById: dbUser.companyId },
      include: { tracks: { where: { companyId: dbUser.companyId }, take: 1 } }
    });

    return NextResponse.json({
      success: true,
      tenders: tenders.map(t => ({
        id: t.id,
        workName: t.workName,
        department: t.department,
        location: t.workLocation,
        district: t.district,
        sector: t.sector,
        estimatedCost: t.estimatedCost ? Number(t.estimatedCost) : null,
        emdAmount: t.emdAmount ? Number(t.emdAmount) : null,
        tenderFee: t.tenderFee ? Number(t.tenderFee) : null,
        lastSubmissionDate: t.lastSubmissionDate,
        openingDate: t.openingDate,
        completionPeriod: t.completionPeriod,
        completionDays: t.completionDays,
        requiredClass: t.requiredClass,
        requiredTurnover: t.requiredTurnover ? Number(t.requiredTurnover) : null,
        securityDepositPct: t.securityDepositPct ? Number(t.securityDepositPct) : null,
        performanceGuarPct: t.performanceGuarPct ? Number(t.performanceGuarPct) : null,
        mobilizationAdv: t.mobilizationAdv,
        mobilizationAdvPct: t.mobilizationAdvPct ? Number(t.mobilizationAdvPct) : null,
        defectLiabilityPeriod: t.defectLiabilityPeriod,
        eligibilityStatus: t.tracks[0]?.eligibilityStatus,
        matchScore: t.tracks[0]?.matchScore,
        status: t.tracks[0]?.status,
        riskFlags: t.riskFlags,
        daysToDeadline: t.lastSubmissionDate
          ? Math.ceil((new Date(t.lastSubmissionDate).getTime() - Date.now()) / 86400000)
          : null,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}