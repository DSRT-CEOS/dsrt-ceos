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
    if (!dbUser || dbUser.role !== "OWNER") {
      return NextResponse.json({ error: "Only owner can modify team members" }, { status: 403 });
    }

    const target = await prisma.user.findFirst({ where: { id, companyId: dbUser.companyId } });
    if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    if (target.role === "OWNER" && target.id !== dbUser.id) {
      return NextResponse.json({ error: "Cannot modify other owners" }, { status: 403 });
    }

    const b = await request.json();
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(b.role && { role: b.role }),
        ...(b.isActive !== undefined && { isActive: b.isActive }),
      }
    });

    return NextResponse.json({ success: true, member: updated });
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
    if (!dbUser || dbUser.role !== "OWNER") {
      return NextResponse.json({ error: "Only owner can remove team members" }, { status: 403 });
    }

    if (id === dbUser.id) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

    const target = await prisma.user.findFirst({ where: { id, companyId: dbUser.companyId } });
    if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    if (target.role === "OWNER") {
      return NextResponse.json({ error: "Cannot remove other owners" }, { status: 403 });
    }

    // Soft delete: mark inactive
    await prisma.user.update({ where: { id }, data: { isActive: false } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}