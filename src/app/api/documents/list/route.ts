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
    const category = params.get("category");
    const search = params.get("search");

    const where: any = { companyId: dbUser.companyId, isLatest: true };
    if (category && category !== "ALL") where.category = category;
    if (search) where.name = { contains: search, mode: "insensitive" };

    const docs = await prisma.companyDocument.findMany({ where, orderBy: { createdAt: "desc" } });

    const allDocs = await prisma.companyDocument.findMany({
      where: { companyId: dbUser.companyId, isLatest: true },
      select: { category: true, isExpired: true, expiryDate: true }
    });

    const now = new Date();
    const thirtyDays = new Date(Date.now() + 30 * 86400000);
    const stats = {
      total: allDocs.length,
      expired: allDocs.filter(d => d.isExpired || (d.expiryDate && new Date(d.expiryDate) < now)).length,
      expiringSoon: allDocs.filter(d => !d.isExpired && d.expiryDate && new Date(d.expiryDate) <= thirtyDays && new Date(d.expiryDate) >= now).length,
      byCategory: allDocs.reduce((acc: any, d) => { acc[d.category] = (acc[d.category] || 0) + 1; return acc; }, {})
    };

    return NextResponse.json({ success: true, documents: docs, stats });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}