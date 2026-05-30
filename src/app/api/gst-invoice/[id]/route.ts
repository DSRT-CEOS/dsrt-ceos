export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { generatePDF } from "@/lib/generators/pdf";

export const maxDuration = 60;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      include: { company: true }
    });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const inv = await prisma.gSTInvoice.findFirst({
      where: { id, companyId: dbUser.companyId }
    });
    if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const c = dbUser.company;
    const fmt = (n: any) => Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const content = `TAX INVOICE

Invoice Number: ${inv.invoiceNumber}
Invoice Date: ${new Date(inv.invoiceDate).toLocaleDateString("en-IN")}


SELLER (You)

${c.name}
${[c.addressLine1, c.addressLine2, c.city, c.district, c.state, c.pincode].filter(Boolean).join(", ")}
GSTIN: ${c.gstNumber || "N/A"}
PAN: ${c.panNumber || "N/A"}
State: ${c.state}


BUYER

${inv.buyerName}
${inv.buyerAddress || ""}
GSTIN: ${inv.buyerGstin || "Unregistered"}
Place of Supply: ${inv.placeOfSupply || ""}


INVOICE ITEMS

Description: ${inv.itemDescription}
HSN/SAC Code: ${inv.hsnSacCode || "9954"}
Quantity: ${inv.quantity} ${inv.unit}
Rate: Rs ${fmt(inv.rate)}

                                            ---------------
Taxable Value                                 Rs ${fmt(inv.taxableValue)}
${inv.isInterState
  ? `IGST @ ${inv.igstRate}%                                 Rs ${fmt(inv.igstAmount)}`
  : `CGST @ ${inv.cgstRate}%                                 Rs ${fmt(inv.cgstAmount)}
SGST @ ${inv.sgstRate}%                                 Rs ${fmt(inv.sgstAmount)}`}
                                            ---------------
TOTAL AMOUNT                                  Rs ${fmt(inv.totalAmount)}
                                            ===============


Amount in Words: ${inv.amountInWords}


Tax Type: ${inv.isInterState ? "Inter-State (IGST)" : "Intra-State (CGST + SGST)"}

${inv.notes ? `Notes: ${inv.notes}` : ""}


Certified that this invoice has been issued as per the GST Act.



_______________________
For ${c.name}
Authorized Signatory


Date: ${new Date().toLocaleDateString("en-IN")}
Place: ${c.city || c.state}`;

    const pdfBytes = await generatePDF({
      title: `Tax Invoice - ${inv.invoiceNumber}`,
      subtitle: `Date: ${new Date(inv.invoiceDate).toLocaleDateString("en-IN")}`,
      content,
    });

    const service = createServiceClient();
    const filePath = `${c.id}/gst-invoices/${inv.invoiceNumber.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.pdf`;
    const { error: upErr } = await service.storage.from("generated-documents").upload(filePath, pdfBytes, {
      contentType: "application/pdf", upsert: true
    });

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { data: { publicUrl } } = service.storage.from("generated-documents").getPublicUrl(filePath);

    await prisma.gSTInvoice.update({
      where: { id },
      data: { invoiceFileUrl: publicUrl }
    });

    return NextResponse.json({ success: true, url: publicUrl });
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
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.gSTInvoice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}