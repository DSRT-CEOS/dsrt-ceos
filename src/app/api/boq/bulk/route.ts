import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { projectId, items } = await request.json();
    if (!projectId || !Array.isArray(items)) {
      return NextResponse.json({ error: "projectId and items required" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({ where: { id: projectId, companyId: dbUser.companyId } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const created = await prisma.projectBOQProgress.createMany({
      data: items.map((i: any, idx: number) => ({
        projectId,
        boqItemId: `BOQ-${Date.now()}-${idx}`,
        slNo: i.slNo || String(idx + 1),
        description: i.description,
        unit: i.unit || null,
        contractQty: parseFloat(i.contractQty),
        rate: parseFloat(i.rate),
        totalCompleted: 0,
      })),
    });

    return NextResponse.json({ success: true, count: created.count });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}