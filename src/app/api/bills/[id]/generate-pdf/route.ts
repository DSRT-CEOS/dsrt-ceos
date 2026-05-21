import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { generatePDF } from "@/lib/generators/pdf";

export const maxDuration = 60;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const bill = await prisma.rABill.findFirst({
      where: { id, project: { companyId: dbUser.companyId } },
      include: { project: true }
    });
    if (!bill) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const c = dbUser.company;
    const p = bill.project;
    const fmt = (n: any) => `Rs ${Number(n).toLocaleString("en-IN")}`;

    const content = `RUNNING ACCOUNT BILL

Bill Number: ${bill.billNumber}
Bill Date: ${new Date(bill.billDate).toLocaleDateString("en-IN")}
Period: ${bill.periodFrom ? new Date(bill.periodFrom).toLocaleDateString("en-IN") : "N/A"} to ${bill.periodTo ? new Date(bill.periodTo).toLocaleDateString("en-IN") : "N/A"}


CONTRACTOR DETAILS

Name: ${c.name}
Address: ${[c.addressLine1, c.city, c.district, c.state, c.pincode].filter(Boolean).join(", ")}
PAN: ${c.panNumber || "N/A"}
GST: ${c.gstNumber || "N/A"}


PROJECT DETAILS

Project: ${p.name}
Department: ${p.department}
Work Order: ${p.workOrderNumber || "N/A"}
Contract Value: ${fmt(p.contractValue)}


BILL AMOUNT BREAKDOWN

Gross Bill Amount         : ${fmt(bill.grossAmount)}
Add: GST @ ${bill.gstRate}%             : ${fmt(bill.gstAmount)}
                            -----------------
Total Amount Payable      : ${fmt(Number(bill.grossAmount) + Number(bill.gstAmount))}


DEDUCTIONS

Security Deposit          : ${fmt(bill.sdDeduction)}
Income Tax TDS (2%)       : ${fmt(bill.itTdsDeduction)}
GST TDS (2%)              : ${fmt(bill.gstTdsDeduction)}
Labour Cess (1%)          : ${fmt(bill.labourCess)}
Royalty Deduction         : ${fmt(bill.royaltyDeduction)}
Advance Recovery          : ${fmt(bill.advanceRecovery)}
Liquidated Damages        : ${fmt(bill.ldDeduction)}
Other Deductions          : ${fmt(bill.otherDeductions)}
                            -----------------
Total Deductions          : ${fmt(Number(bill.sdDeduction) + Number(bill.itTdsDeduction) + Number(bill.gstTdsDeduction) + Number(bill.labourCess) + Number(bill.royaltyDeduction) + Number(bill.advanceRecovery) + Number(bill.ldDeduction) + Number(bill.otherDeductions))}


NET AMOUNT PAYABLE         : ${fmt(bill.netPayable)}


Amount in Words: Rs ${numberToWords(Number(bill.netPayable))}


We hereby certify that the work mentioned in this bill has been executed as per
the agreement and the quantities mentioned are correct.



_______________________                          _______________________
For ${c.name}                                    Authorized Signatory
Contractor                                       Department


Date: ${new Date().toLocaleDateString("en-IN")}
Place: ${c.city || ""}`;

    const pdfBytes = await generatePDF({
      title: `RA Bill - ${bill.billNumber}`,
      subtitle: `${p.name} | ${p.department}`,
      content,
    });

    const service = createServiceClient();
    const filePath = `${c.id}/bills/${bill.billNumber}_${Date.now()}.pdf`;
    const { error: upErr } = await service.storage.from("generated-documents").upload(filePath, pdfBytes, {
      contentType: "application/pdf", upsert: true
    });

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    const { data: { publicUrl } } = service.storage.from("generated-documents").getPublicUrl(filePath);

    await prisma.rABill.update({
      where: { id },
      data: { billDocumentUrl: publicUrl }
    });

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const intNum = Math.floor(num);
  if (intNum < 0) return "Minus " + numberToWords(-intNum);
  if (intNum < 20) return ones[intNum];
  if (intNum < 100) return tens[Math.floor(intNum / 10)] + (intNum % 10 ? " " + ones[intNum % 10] : "");
  if (intNum < 1000) return ones[Math.floor(intNum / 100)] + " Hundred" + (intNum % 100 ? " " + numberToWords(intNum % 100) : "");
  if (intNum < 100000) return numberToWords(Math.floor(intNum / 1000)) + " Thousand" + (intNum % 1000 ? " " + numberToWords(intNum % 1000) : "");
  if (intNum < 10000000) return numberToWords(Math.floor(intNum / 100000)) + " Lakh" + (intNum % 100000 ? " " + numberToWords(intNum % 100000) : "");
  return numberToWords(Math.floor(intNum / 10000000)) + " Crore" + (intNum % 10000000 ? " " + numberToWords(intNum % 10000000) : "") + " Only";
}