export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { calculateGSTInvoice, numberToWords, isInterStateTransaction } from "@/lib/billing/gst-invoice";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const invoices = await prisma.gSTInvoice.findMany({
      where: { companyId: dbUser.companyId },
      orderBy: { invoiceDate: "desc" }
    });

    const stats = {
      total: invoices.length,
      totalValue: invoices.reduce((s, i) => s + Number(i.totalAmount), 0),
      totalGST: invoices.reduce((s, i) => s + Number(i.cgstAmount) + Number(i.sgstAmount) + Number(i.igstAmount), 0),
    };

    return NextResponse.json({
      success: true,
      invoices: invoices.map(i => ({
        ...i,
        taxableValue: Number(i.taxableValue),
        cgstAmount: Number(i.cgstAmount),
        sgstAmount: Number(i.sgstAmount),
        igstAmount: Number(i.igstAmount),
        totalAmount: Number(i.totalAmount),
      })),
      stats,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      include: { company: true }
    });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const b = await request.json();

    // Auto-generate invoice number if not provided
    const count = await prisma.gSTInvoice.count({ where: { companyId: dbUser.companyId } });
    const fyYear = new Date().getMonth() >= 3
      ? `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(2)}`
      : `${new Date().getFullYear() - 1}-${new Date().getFullYear().toString().slice(2)}`;
    const invoiceNumber = b.invoiceNumber || `INV/${fyYear}/${String(count + 1).padStart(4, "0")}`;

    const taxableValue = parseFloat(b.taxableValue);
    const interState = isInterStateTransaction(b.buyerGstin, dbUser.company.gstNumber || "");
    const calc = calculateGSTInvoice({
      taxableValue,
      isInterState: interState,
      gstRate: b.gstRate ? parseFloat(b.gstRate) : 18,
    });

    const invoice = await prisma.gSTInvoice.create({
      data: {
        companyId: dbUser.companyId,
        projectId: b.projectId || null,
        billId: b.billId || null,
        invoiceNumber,
        invoiceDate: b.invoiceDate ? new Date(b.invoiceDate) : new Date(),
        buyerName: b.buyerName,
        buyerGstin: b.buyerGstin || null,
        buyerAddress: b.buyerAddress || null,
        buyerStateCode: b.buyerGstin ? b.buyerGstin.substring(0, 2) : null,
        placeOfSupply: b.placeOfSupply || null,
        itemDescription: b.itemDescription,
        hsnSacCode: b.hsnSacCode || "9954",
        quantity: parseFloat(b.quantity || "1"),
        unit: b.unit || "Job",
        rate: taxableValue,
        taxableValue: calc.taxableValue,
        cgstRate: calc.cgstRate,
        cgstAmount: calc.cgstAmount,
        sgstRate: calc.sgstRate,
        sgstAmount: calc.sgstAmount,
        igstRate: calc.igstRate,
        igstAmount: calc.igstAmount,
        totalAmount: calc.totalAmount,
        amountInWords: numberToWords(calc.totalAmount),
        isInterState: interState,
        notes: b.notes || null,
      }
    });

    return NextResponse.json({ success: true, invoice });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}