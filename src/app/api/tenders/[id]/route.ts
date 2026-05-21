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

    return NextResponse.json({
      success: true,
      tender: {
        ...tender,
        estimatedCost: tender.estimatedCost ? Number(tender.estimatedCost) : null,
        emdAmount: tender.emdAmount ? Number(tender.emdAmount) : null,
        tenderFee: tender.tenderFee ? Number(tender.tenderFee) : null,
        requiredTurnover: tender.requiredTurnover ? Number(tender.requiredTurnover) : null,
        track: tender.tracks[0] || null,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
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
      await service.storage.from("tender-documents").remove([tender.originalFilePath]);
    }
    await prisma.tender.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}