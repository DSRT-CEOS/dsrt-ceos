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

    const tenderId = new URL(request.url).searchParams.get("tenderId");
    const where: any = { companyId: dbUser.companyId, isLatest: true };
    if (tenderId) where.tenderId = tenderId;

    const docs = await prisma.generatedDocument.findMany({ where, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ success: true, documents: docs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}