import prisma from "@/lib/prisma";
import { groq, MODELS } from "@/lib/ai/groq";
import { createServiceClient } from "@/lib/supabase/server";

export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    if (mimeType === "application/pdf") {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      if (data.text && data.text.trim().length > 50) return data.text.trim();
    }
    return "";
  } catch (err) {
    console.error("PDF parse error:", err);
    return "";
  }
}

export async function classifyDocument(text: string, fileName: string) {
  const fn = fileName.toLowerCase();
  const combined = (fn + " " + text.substring(0, 500)).toLowerCase();

  const rules = [
    { kw: ["pan", "permanent account"], cat: "PAN_GST", sub: "PAN_CARD" },
    { kw: ["gst", "gstin", "goods and service"], cat: "PAN_GST", sub: "GST_CERTIFICATE" },
    { kw: ["esi", "employee state insurance"], cat: "ESI_EPF", sub: "ESI_CERTIFICATE" },
    { kw: ["epf", "provident fund", "epfo"], cat: "ESI_EPF", sub: "EPF_CERTIFICATE" },
    { kw: ["contractor registration", "enlistment"], cat: "REGISTRATION", sub: "CONTRACTOR_REG" },
    { kw: ["balance sheet", "ca certificate", "turnover", "auditor"], cat: "TURNOVER_CA", sub: "CA_CERTIFICATE" },
    { kw: ["solvency", "bank certificate"], cat: "BANK_SOLVENCY", sub: "SOLVENCY" },
    { kw: ["work order", "letter of intent"], cat: "WORK_ORDER", sub: "WORK_ORDER" },
    { kw: ["completion certificate"], cat: "COMPLETION_CERT", sub: "COMPLETION" },
    { kw: ["performance certificate"], cat: "PERFORMANCE_CERT", sub: "PERFORMANCE" },
    { kw: ["labour license"], cat: "LABOUR_LICENSE", sub: "LABOUR" },
    { kw: ["electrical license"], cat: "ELECTRICAL_LICENSE", sub: "ELECTRICAL" },
    { kw: ["insurance policy", "premium"], cat: "INSURANCE", sub: "POLICY" },
  ];

  for (const r of rules) {
    if (r.kw.some(k => combined.includes(k))) {
      return { category: r.cat, subCategory: r.sub };
    }
  }
  return { category: "OTHER", subCategory: "DOCUMENT" };
}

export async function extractDocumentData(text: string, category: string, fileName: string) {
  if (!text || text.length < 50) {
    return { extractedData: {}, issueDate: null, expiryDate: null, name: fileName.replace(/\.[^/.]+$/, "") };
  }

  const prompts: Record<string, string> = {
    PAN_GST: `Extract: {panNumber, gstNumber, name, address, issueDate, documentType}`,
    ESI_EPF: `Extract: {registrationCode, entityName, issueDate, validUntil, documentType}`,
    REGISTRATION: `Extract: {registrationNumber, department, class, validFrom, validUntil, financialLimit}`,
    TURNOVER_CA: `Extract: {companyName, financialYear, turnover, netWorth, caName, issueDate}`,
    BANK_SOLVENCY: `Extract: {bankName, accountHolder, amount, issueDate, validUntil}`,
    WORK_ORDER: `Extract: {workOrderNumber, department, workName, contractValue, startDate, completionDate, location}`,
    COMPLETION_CERT: `Extract: {workOrderNumber, workName, contractValue, completionDate}`,
    INSURANCE: `Extract: {policyNumber, insurer, coverageType, sumInsured, startDate, expiryDate}`,
  };

  const prompt = prompts[category] || `Extract: {name, number, date, validUntil, amount}`;

  try {
    const c = await groq.chat.completions.create({
      model: MODELS.FAST,
      messages: [
        { role: "system", content: "Extract structured data. Return JSON only. Dates ISO format YYYY-MM-DD. Null for missing." },
        { role: "user", content: `${prompt}\n\nText:\n${text.substring(0, 2000)}` }
      ],
      temperature: 0.1, max_tokens: 500, response_format: { type: "json_object" }
    });

    const data = JSON.parse(c.choices[0]?.message?.content || "{}");
    const parseDate = (v: any): Date | null => {
      if (!v) return null;
      try { const d = new Date(v); return isNaN(d.getTime()) ? null : d; } catch { return null; }
    };

    const issueDate = parseDate(data.issueDate || data.validFrom || data.startDate || data.workOrderDate);
    const expiryDate = parseDate(data.expiryDate || data.validUntil || data.validTo);
    const name = data.workName || data.companyName || data.entityName || data.accountHolder ||
      fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

    return { extractedData: data, issueDate, expiryDate, name };
  } catch (err) {
    console.error("Extract err:", err);
    return { extractedData: {}, issueDate: null, expiryDate: null, name: fileName.replace(/\.[^/.]+$/, "") };
  }
}

export async function processCompanyDocument(docId: string) {
  const doc = await prisma.companyDocument.findUnique({ where: { id: docId } });
  if (!doc) return;

  try {
    const supabase = createServiceClient();
    const { data: file, error } = await supabase.storage.from("company-documents").download(doc.filePath);
    if (error || !file) { console.error("Download err:", error); return; }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractText(buffer, doc.mimeType || "application/pdf");
    const { category, subCategory } = await classifyDocument(text, doc.name);
    const { extractedData, issueDate, expiryDate, name } = await extractDocumentData(text, category, doc.name);
    const isExpired = expiryDate ? expiryDate < new Date() : false;

    await prisma.companyDocument.update({
      where: { id: docId },
      data: {
        rawText: text.substring(0, 10000),
        category: doc.category === "OTHER" ? category : doc.category,
        subCategory,
        name: name || doc.name,
        extractedData,
        issueDate,
        expiryDate,
        isExpired,
        isProcessed: true,
      }
    });
  } catch (err) {
    console.error("Process err:", err);
    await prisma.companyDocument.update({ where: { id: docId }, data: { isProcessed: false } });
  }
}