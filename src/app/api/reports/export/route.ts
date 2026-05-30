export const dynamic = "force-dynamic";

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

    const type = new URL(request.url).searchParams.get("type") || "bills";
    const format = new URL(request.url).searchParams.get("format") || "csv";

    let rows: any[] = [];
    let headers: string[] = [];
    let filename = "";

    if (type === "bills") {
      const bills = await prisma.rABill.findMany({
        where: { project: { companyId: dbUser.companyId } },
        include: { project: { select: { name: true, department: true } } },
        orderBy: { createdAt: "desc" }
      });
      headers = ["Bill Number", "Project", "Department", "Bill Date", "Gross Amount", "GST", "SD", "IT TDS", "GST TDS", "Labour Cess", "Net Payable", "Status", "Payment Date", "Paid Amount"];
      rows = bills.map(b => [
        b.billNumber, b.project.name, b.project.department,
        new Date(b.billDate).toLocaleDateString("en-IN"),
        Number(b.grossAmount), Number(b.gstAmount),
        Number(b.sdDeduction), Number(b.itTdsDeduction),
        Number(b.gstTdsDeduction), Number(b.labourCess),
        Number(b.netPayable), b.status,
        b.paymentDate ? new Date(b.paymentDate).toLocaleDateString("en-IN") : "",
        b.paymentAmount ? Number(b.paymentAmount) : 0,
      ]);
      filename = `bills-export-${Date.now()}`;
    } else if (type === "projects") {
      const projects = await prisma.project.findMany({
        where: { companyId: dbUser.companyId },
        orderBy: { createdAt: "desc" }
      });
      headers = ["Name", "Department", "Work Order", "Contract Value", "Total Billed", "Total Received", "Total Expenses", "Status", "Start Date", "Completion Date"];
      rows = projects.map(p => [
        p.name, p.department, p.workOrderNumber || "",
        Number(p.contractValue), Number(p.totalBilled),
        Number(p.totalReceived), Number(p.totalExpenses),
        p.status,
        p.startDate ? new Date(p.startDate).toLocaleDateString("en-IN") : "",
        p.completionDate ? new Date(p.completionDate).toLocaleDateString("en-IN") : "",
      ]);
      filename = `projects-export-${Date.now()}`;
    } else if (type === "tenders") {
      const tenders = await prisma.tender.findMany({
        where: { uploadedById: dbUser.companyId, isActive: true },
        include: { tracks: { where: { companyId: dbUser.companyId }, take: 1 } },
        orderBy: { createdAt: "desc" }
      });
      headers = ["Work Name", "Department", "NIT Number", "Estimated Cost", "EMD", "Tender Fee", "Submission Date", "Match Score", "Eligibility", "Status"];
      rows = tenders.map(t => [
        t.workName, t.department || "", t.nitNumber || "",
        t.estimatedCost ? Number(t.estimatedCost) : 0,
        t.emdAmount ? Number(t.emdAmount) : 0,
        t.tenderFee ? Number(t.tenderFee) : 0,
        t.lastSubmissionDate ? new Date(t.lastSubmissionDate).toLocaleDateString("en-IN") : "",
        t.tracks[0]?.matchScore || 0,
        t.tracks[0]?.eligibilityStatus || "",
        t.tracks[0]?.status || "",
      ]);
      filename = `tenders-export-${Date.now()}`;
    }

    if (format === "csv") {
      const csv = [
        headers.join(","),
        ...rows.map(row => row.map((cell: any) => {
          const str = String(cell ?? "");
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(","))
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv;charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        }
      });
    }

    return NextResponse.json({ success: true, headers, rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}