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
    const month = params.get("month"); // YYYY-MM
    const cid = dbUser.companyId;

    let startDate: Date, endDate: Date;
    if (month) {
      const [y, m] = month.split("-").map(Number);
      startDate = new Date(y, m - 1, 1);
      endDate = new Date(y, m, 0, 23, 59, 59);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
    }

    const [tenders, bills, docs, regs, projects] = await Promise.all([
      // Tender submission deadlines
      prisma.tender.findMany({
        where: {
          uploadedById: cid, isActive: true,
          lastSubmissionDate: { gte: startDate, lte: endDate }
        },
        select: { id: true, workName: true, department: true, lastSubmissionDate: true, emdAmount: true, estimatedCost: true }
      }),
      // Pre-bid meetings
      prisma.tender.findMany({
        where: {
          uploadedById: cid, isActive: true,
          preBidMeetingDate: { gte: startDate, lte: endDate }
        },
        select: { id: true, workName: true, preBidMeetingDate: true }
      }),
      // Document expiry
      prisma.companyDocument.findMany({
        where: {
          companyId: cid, isLatest: true,
          expiryDate: { gte: startDate, lte: endDate }
        },
        select: { id: true, name: true, category: true, expiryDate: true }
      }),
      // Registration expiry
      prisma.contractorRegistration.findMany({
        where: { companyId: cid, validUntil: { gte: startDate, lte: endDate } },
        select: { id: true, department: true, registrationNo: true, validUntil: true }
      }),
      // Project milestones (start, completion)
      prisma.project.findMany({
        where: {
          companyId: cid,
          OR: [
            { startDate: { gte: startDate, lte: endDate } },
            { completionDate: { gte: startDate, lte: endDate } },
            { dlpEndDate: { gte: startDate, lte: endDate } },
          ]
        },
        select: { id: true, name: true, startDate: true, completionDate: true, dlpEndDate: true, department: true }
      }),
    ]);

    const events: any[] = [];

    tenders[0]?.lastSubmissionDate && tenders.forEach((t: any) => {
      events.push({
        id: `tender-${t.id}`,
        title: t.workName,
        date: t.lastSubmissionDate,
        type: "TENDER_DEADLINE",
        category: "tender",
        color: "red",
        url: `/dashboard/tenders/${t.id}`,
        meta: { dept: t.department, amount: t.estimatedCost ? Number(t.estimatedCost) : null }
      });
    });

    bills.forEach((b: any) => {
      events.push({
        id: `prebid-${b.id}`,
        title: `Pre-bid: ${b.workName}`,
        date: b.preBidMeetingDate,
        type: "PRE_BID",
        category: "tender",
        color: "blue",
        url: `/dashboard/tenders/${b.id}`,
      });
    });

    docs.forEach((d: any) => {
      events.push({
        id: `doc-${d.id}`,
        title: `${d.name} expires`,
        date: d.expiryDate,
        type: "DOC_EXPIRY",
        category: "document",
        color: "yellow",
        url: `/dashboard/documents`,
        meta: { category: d.category }
      });
    });

    regs.forEach((r: any) => {
      events.push({
        id: `reg-${r.id}`,
        title: `${r.department} registration expires`,
        date: r.validUntil,
        type: "REG_EXPIRY",
        category: "registration",
        color: "orange",
        url: `/dashboard/settings/registrations`,
        meta: { regNo: r.registrationNo }
      });
    });

    projects.forEach((p: any) => {
      if (p.startDate && p.startDate >= startDate && p.startDate <= endDate) {
        events.push({
          id: `project-start-${p.id}`, title: `Start: ${p.name}`,
          date: p.startDate, type: "PROJECT_START", category: "project",
          color: "green", url: `/dashboard/projects/${p.id}`,
        });
      }
      if (p.completionDate && p.completionDate >= startDate && p.completionDate <= endDate) {
        events.push({
          id: `project-end-${p.id}`, title: `Due: ${p.name}`,
          date: p.completionDate, type: "PROJECT_END", category: "project",
          color: "purple", url: `/dashboard/projects/${p.id}`,
        });
      }
    });

    // Compliance reminders (auto-generated)
    const now = new Date();
    for (let i = 0; i <= 2; i++) {
      const m = new Date(now.getFullYear(), now.getMonth() + i, 1);
      if (m < startDate || m > endDate) continue;

      // GSTR-1 - 11th
      const gstr1 = new Date(m.getFullYear(), m.getMonth(), 11);
      if (gstr1 >= startDate && gstr1 <= endDate) {
        events.push({ id: `gstr1-${i}`, title: "GSTR-1 Filing", date: gstr1, type: "COMPLIANCE", category: "compliance", color: "cyan", url: "/dashboard/compliance" });
      }
      // ESI/EPF - 15th
      const esiEpf = new Date(m.getFullYear(), m.getMonth(), 15);
      if (esiEpf >= startDate && esiEpf <= endDate) {
        events.push({ id: `esi-${i}`, title: "ESI + EPF Filing", date: esiEpf, type: "COMPLIANCE", category: "compliance", color: "cyan", url: "/dashboard/compliance" });
      }
      // GSTR-3B - 20th
      const gstr3b = new Date(m.getFullYear(), m.getMonth(), 20);
      if (gstr3b >= startDate && gstr3b <= endDate) {
        events.push({ id: `gstr3b-${i}`, title: "GSTR-3B Filing", date: gstr3b, type: "COMPLIANCE", category: "compliance", color: "cyan", url: "/dashboard/compliance" });
      }
      // TDS - 7th
      const tds = new Date(m.getFullYear(), m.getMonth(), 7);
      if (tds >= startDate && tds <= endDate) {
        events.push({ id: `tds-${i}`, title: "TDS Filing (Form 26Q)", date: tds, type: "COMPLIANCE", category: "compliance", color: "cyan", url: "/dashboard/compliance" });
      }
    }

    return NextResponse.json({
      success: true,
      events: events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      period: { start: startDate, end: endDate }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}