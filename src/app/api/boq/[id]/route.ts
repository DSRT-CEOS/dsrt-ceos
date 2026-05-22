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

    const b = await request.json();
    const item = await prisma.projectBOQProgress.update({
      where: { id },
      data: {
        ...(b.description && { description: b.description }),
        ...(b.contractQty !== undefined && { contractQty: parseFloat(b.contractQty) }),
        ...(b.rate !== undefined && { rate: parseFloat(b.rate) }),
        ...(b.totalCompleted !== undefined && { totalCompleted: parseFloat(b.totalCompleted) }),
        ...(b.unit && { unit: b.unit }),
      }
    });

    // Update project progress
    const allItems = await prisma.projectBOQProgress.findMany({ where: { projectId: item.projectId } });
    const totalContract = allItems.reduce((s, i) => s + Number(i.contractQty) * Number(i.rate), 0);
    const totalCompleted = allItems.reduce((s, i) => s + Number(i.totalCompleted) * Number(i.rate), 0);
    const progress = totalContract > 0 ? (totalCompleted / totalContract) * 100 : 0;

    await prisma.project.update({
      where: { id: item.projectId },
      data: { progressPercent: progress }
    });

    return NextResponse.json({ success: true, item });
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

    await prisma.projectBOQProgress.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}