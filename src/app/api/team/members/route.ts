import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [members, invites] = await Promise.all([
      prisma.user.findMany({
        where: { companyId: dbUser.companyId },
        select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
        orderBy: [{ role: "asc" }, { name: "asc" }]
      }),
      prisma.teamInvite.findMany({
        where: { companyId: dbUser.companyId, status: "PENDING" },
        orderBy: { createdAt: "desc" }
      })
    ]);

    return NextResponse.json({ success: true, members, invites, currentUser: { id: dbUser.id, role: dbUser.role } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}