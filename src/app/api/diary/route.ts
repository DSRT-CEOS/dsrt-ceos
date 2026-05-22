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

    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const project = await prisma.project.findFirst({ where: { id: projectId, companyId: dbUser.companyId } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const entries = await prisma.siteDiary.findMany({
      where: { projectId },
      orderBy: { date: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, entries });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const b = await request.json();
    const project = await prisma.project.findFirst({ where: { id: b.projectId, companyId: dbUser.companyId } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const date = new Date(b.date);
    date.setHours(0, 0, 0, 0);

    const entry = await prisma.siteDiary.upsert({
      where: { projectId_date: { projectId: b.projectId, date } },
      update: {
        weather: b.weather || null,
        temperature: b.temperature || null,
        manpowerCount: b.manpowerCount ? parseInt(b.manpowerCount) : null,
        workDescription: b.workDescription,
        workCompleted: b.workCompleted || null,
        materialReceived: b.materialReceived || null,
        machineryUsed: b.machineryUsed || null,
        visitors: b.visitors || null,
        issues: b.issues || null,
        instructions: b.instructions || null,
        safetyNotes: b.safetyNotes || null,
      },
      create: {
        projectId: b.projectId,
        date,
        weather: b.weather || null,
        temperature: b.temperature || null,
        manpowerCount: b.manpowerCount ? parseInt(b.manpowerCount) : null,
        workDescription: b.workDescription,
        workCompleted: b.workCompleted || null,
        materialReceived: b.materialReceived || null,
        machineryUsed: b.machineryUsed || null,
        visitors: b.visitors || null,
        issues: b.issues || null,
        instructions: b.instructions || null,
        safetyNotes: b.safetyNotes || null,
        createdById: dbUser.id,
      }
    });

    return NextResponse.json({ success: true, entry });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}