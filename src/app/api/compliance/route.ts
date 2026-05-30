export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { calculateESI, calculateEPF, calculateGST } from "@/lib/billing/calculator";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      include: { company: { include: { staff: { where: { isActive: true } } } } }
    });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get current month bills for GST calculation
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const bills = await prisma.rABill.findMany({
      where: {
        project: { companyId: dbUser.companyId },
        billDate: { gte: monthStart, lte: monthEnd }
      }
    });

    const totalGstCollected = bills.reduce((s, b) => s + Number(b.gstAmount), 0);
    const totalGstTdsPaid = bills.reduce((s, b) => s + Number(b.gstTdsDeduction), 0);
    const totalItTdsPaid = bills.reduce((s, b) => s + Number(b.itTdsDeduction), 0);
    const totalLabourCess = bills.reduce((s, b) => s + Number(b.labourCess), 0);

    // Calculate staff ESI/EPF
    const staffEsi = dbUser.company.staff.map(s => {
      const wage = s.monthlySalary ? Number(s.monthlySalary) : 15000;
      return { staff: s.name, designation: s.designation, wage, ...calculateESI(wage) };
    });

    const staffEpf = dbUser.company.staff.map(s => {
      const basic = s.monthlySalary ? Number(s.monthlySalary) * 0.5 : 7500;
      return { staff: s.name, designation: s.designation, basic, ...calculateEPF(basic) };
    });

    const totalEsi = staffEsi.reduce((s, x) => s + x.total, 0);
    const totalEpf = staffEpf.reduce((s, x) => s + x.total, 0);

    return NextResponse.json({
      success: true,
      data: {
        period: now.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
        gst: {
          collected: totalGstCollected,
          tdsReceived: totalGstTdsPaid,
          netPayable: totalGstCollected - totalGstTdsPaid,
        },
        incomeTax: {
          tdsPaid: totalItTdsPaid,
        },
        labourCess: {
          collected: totalLabourCess,
        },
        esi: {
          totalMonthly: totalEsi,
          staffBreakdown: staffEsi,
        },
        epf: {
          totalMonthly: totalEpf,
          staffBreakdown: staffEpf,
        },
        upcoming: [
          { type: "GST", form: "GSTR-3B", dueDate: "20th of next month", amount: totalGstCollected - totalGstTdsPaid },
          { type: "GST", form: "GSTR-1", dueDate: "11th of next month", amount: 0 },
          { type: "ESI", form: "Monthly Return", dueDate: "15th of next month", amount: totalEsi },
          { type: "EPF", form: "ECR Filing", dueDate: "15th of next month", amount: totalEpf },
          { type: "TDS", form: "Form 26Q", dueDate: "7th of next month", amount: totalItTdsPaid },
        ],
      }
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}