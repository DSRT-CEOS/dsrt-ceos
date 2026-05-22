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

    const q = new URL(request.url).searchParams.get("q") || "";
    if (q.length < 2) return NextResponse.json({ success: true, results: [] });

    const [tenders, projects, bills, docs] = await Promise.all([
      prisma.tender.findMany({
        where: {
          uploadedById: dbUser.companyId, isActive: true,
          OR: [
            { workName: { contains: q, mode: "insensitive" } },
            { department: { contains: q, mode: "insensitive" } },
            { nitNumber: { contains: q, mode: "insensitive" } },
          ]
        },
        select: { id: true, workName: true, department: true, nitNumber: true },
        take: 5,
      }),
      prisma.project.findMany({
        where: {
          companyId: dbUser.companyId,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { department: { contains: q, mode: "insensitive" } },
            { workOrderNumber: { contains: q, mode: "insensitive" } },
          ]
        },
        select: { id: true, name: true, department: true, status: true },
        take: 5,
      }),
      prisma.rABill.findMany({
        where: {
          project: { companyId: dbUser.companyId },
          OR: [
            { billNumber: { contains: q, mode: "insensitive" } },
            { gstInvoiceNumber: { contains: q, mode: "insensitive" } },
          ]
        },
        select: { id: true, billNumber: true, status: true, netPayable: true, project: { select: { name: true } } },
        take: 5,
      }),
      prisma.companyDocument.findMany({
        where: {
          companyId: dbUser.companyId, isLatest: true,
          name: { contains: q, mode: "insensitive" }
        },
        select: { id: true, name: true, category: true },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      success: true,
      results: {
        tenders: tenders.map(t => ({ ...t, type: "tender", url: `/dashboard/tenders/${t.id}` })),
        projects: projects.map(p => ({ ...p, type: "project", url: `/dashboard/projects/${p.id}` })),
        bills: bills.map(b => ({ ...b, type: "bill", netPayable: Number(b.netPayable), url: `/dashboard/billing/${b.id}` })),
        docs: docs.map(d => ({ ...d, type: "doc", url: `/dashboard/documents` })),
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}