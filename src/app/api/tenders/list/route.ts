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
    const status = params.get("status");
    const search = params.get("search");
    const sortBy = params.get("sortBy") || "newest";

    const tenders = await prisma.tender.findMany({
      where: {
        uploadedById: dbUser.companyId,
        isActive: true,
        ...(search ? { workName: { contains: search, mode: "insensitive" } } : {}),
      },
      include: {
        tracks: {
          where: { companyId: dbUser.companyId },
          take: 1,
        },
      },
      orderBy: sortBy === "deadline" ? { lastSubmissionDate: "asc" } :
               sortBy === "value" ? { estimatedCost: "desc" } :
               { createdAt: "desc" },
    });

    const filtered = status && status !== "ALL"
      ? tenders.filter(t => t.tracks[0]?.status === status)
      : tenders;

    const stats = {
      total: tenders.length,
      processing: tenders.filter(t => t.processingStatus === "PROCESSING" || t.processingStatus === "PENDING").length,
      completed: tenders.filter(t => t.processingStatus === "COMPLETED").length,
      failed: tenders.filter(t => t.processingStatus === "FAILED").length,
      eligible: tenders.filter(t => t.tracks[0]?.eligibilityStatus === "ELIGIBLE").length,
    };

    return NextResponse.json({
      success: true,
      tenders: filtered.map(t => ({
        ...t,
        estimatedCost: t.estimatedCost ? Number(t.estimatedCost) : null,
        emdAmount: t.emdAmount ? Number(t.emdAmount) : null,
        tenderFee: t.tenderFee ? Number(t.tenderFee) : null,
        track: t.tracks[0] || null,
      })),
      stats,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}