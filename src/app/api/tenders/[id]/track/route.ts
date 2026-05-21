import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();

    const track = await prisma.tenderTrack.upsert({
      where: { companyId_tenderId: { companyId: dbUser.companyId, tenderId: id } },
      update: {
        ...(body.status && { status: body.status }),
        ...(body.userNotes !== undefined && { userNotes: body.userNotes }),
        ...(body.bidPercentage !== undefined && { bidPercentage: parseFloat(body.bidPercentage) }),
        ...(body.bidAmount !== undefined && { bidAmount: parseFloat(body.bidAmount) }),
      },
      create: {
        companyId: dbUser.companyId,
        tenderId: id,
        status: body.status || "DISCOVERED",
        userNotes: body.userNotes || null,
      },
    });

    return NextResponse.json({ success: true, track });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}