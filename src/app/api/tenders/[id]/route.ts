export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const tender = await prisma.tender.findFirst({
      where: { id, uploadedById: dbUser.companyId },
      include: {
        tracks: { where: { companyId: dbUser.companyId }, take: 1 },
        boqItems: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!tender) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Generate fresh signed URL for PDF viewing
    let freshUrl = tender.originalFileUrl;
    if (tender.originalFilePath) {
      try {
        const service = createServiceClient();
        const { data: signedData } = await service.storage
          .from("tender-documents")
          .createSignedUrl(tender.originalFilePath, 60 * 60); // 1 hour
        if (signedData?.signedUrl) freshUrl = signedData.signedUrl;
      } catch (e) {
        console.error("Signed URL err:", e);
      }
    }

    return NextResponse.json({
      success: true,
      tender: {
        ...tender,
        originalFileUrl: freshUrl,
        estimatedCost: tender.estimatedCost ? Number(tender.estimatedCost) : null,
        emdAmount: tender.emdAmount ? Number(tender.emdAmount) : null,
        tenderFee: tender.tenderFee ? Number(tender.tenderFee) : null,
        requiredTurnover: tender.requiredTurnover ? Number(tender.requiredTurnover) : null,
        track: tender.tracks[0] || null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const tender = await prisma.tender.findFirst({ where: { id, uploadedById: dbUser.companyId } });
    if (!tender) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (tender.originalFilePath) {
      const service = createServiceClient();
      await service.storage.from("tender-documents").remove([tender.originalFilePath]).catch(e => console.error("Delete err:", e));
    }
    await prisma.tender.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}