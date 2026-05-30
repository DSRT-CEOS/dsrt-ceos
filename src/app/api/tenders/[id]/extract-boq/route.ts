export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { extractBOQFromTender } from "@/lib/pdf/boq-extractor";

export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const tender = await prisma.tender.findFirst({
      where: { id, uploadedById: dbUser.companyId }
    });
    if (!tender) return NextResponse.json({ error: "Tender not found" }, { status: 404 });

    const result = await extractBOQFromTender(id);

    return NextResponse.json({
      success: true,
      count: result.count,
      items: result.items,
      message: `Extracted ${result.count} BOQ items`
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}