import { groq, MODELS } from "@/lib/ai/groq";
import { createServiceClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function extractTenderText(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text?.trim() || "";
  } catch (err) {
    console.error("Tender PDF parse err:", err);
    return "";
  }
}

interface ExtractedTender {
  tenderNumber?: string;
  nitNumber?: string;
  department?: string;
  organization?: string;
  workName: string;
  workDescription?: string;
  workLocation?: string;
  district?: string;
  state?: string;
  sector?: string;
  estimatedCost?: number;
  emdAmount?: number;
  tenderFee?: number;
  publishedDate?: string;
  lastSubmissionDate?: string;
  openingDate?: string;
  completionPeriod?: string;
  completionDays?: number;
  requiredClass?: string;
  requiredTurnover?: number;
  requiredExperience?: string;
  securityDepositPct?: number;
  performanceGuarPct?: number;
  mobilizationAdv?: boolean;
  mobilizationAdvPct?: number;
  paymentTerms?: string;
  ldClause?: string;
  defectLiabilityPeriod?: string;
  eligibilityCriteria?: any;
  requiredDocuments?: string[];
  riskFlags?: Array<{ type: string; message: string }>;
}

export async function extractTenderFields(text: string): Promise<ExtractedTender> {
  const truncated = text.substring(0, 12000);

  const prompt = `Extract tender info from this Indian government NIT document.

Return ONLY valid JSON with this structure:
{
  "tenderNumber": "string or null",
  "nitNumber": "string or null",
  "department": "department name",
  "organization": "organization name",
  "workName": "main work title",
  "workDescription": "detailed description",
  "workLocation": "location",
  "district": "district name",
  "state": "state name",
  "sector": "CIVIL or ELECTRICAL or MECHANICAL or ROAD or BRIDGE or WATER_SUPPLY or SEWERAGE",
  "estimatedCost": number_only_in_rupees_or_null,
  "emdAmount": number_only_in_rupees_or_null,
  "tenderFee": number_only_in_rupees_or_null,
  "publishedDate": "YYYY-MM-DD or null",
  "lastSubmissionDate": "YYYY-MM-DD or null",
  "openingDate": "YYYY-MM-DD or null",
  "completionPeriod": "e.g. 6 months or 180 days",
  "completionDays": number_or_null,
  "requiredClass": "Class I/II/III/IV/V or null",
  "requiredTurnover": number_or_null,
  "requiredExperience": "experience requirement summary",
  "securityDepositPct": number_or_null,
  "performanceGuarPct": number_or_null,
  "mobilizationAdv": true_or_false,
  "mobilizationAdvPct": number_or_null,
  "paymentTerms": "payment terms summary",
  "ldClause": "liquidated damages clause",
  "defectLiabilityPeriod": "e.g. 12 months",
  "requiredDocuments": ["list", "of", "documents"],
  "riskFlags": [{"type": "HIGH/MEDIUM/LOW", "message": "risk description"}]
}

If amount written as "Rs 5 Lakhs" convert to 500000. If "1.5 Cr" convert to 15000000.
For dates parse from any format (DD/MM/YYYY, DD-MM-YYYY etc).
Identify risks: tight deadline, harsh LD, no escalation clause, high SD.

DOCUMENT TEXT:
${truncated}`;

  try {
    const c = await groq.chat.completions.create({
      model: MODELS.BALANCED,
      messages: [
        { role: "system", content: "You are an expert at parsing Indian government tender documents. Return only valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 3000,
      response_format: { type: "json_object" }
    });
    return JSON.parse(c.choices[0]?.message?.content || "{}");
  } catch (err) {
    console.error("AI extract err:", err);
    return { workName: "Unknown Work" };
  }
}

export async function generateTenderSummary(text: string, lang: "en" | "bn" | "hi"): Promise<string> {
  const langMap = {
    en: "English",
    bn: "Bengali (বাংলা)",
    hi: "Hindi (हिंदी)"
  };

  try {
    const c = await groq.chat.completions.create({
      model: MODELS.BALANCED,
      messages: [
        { role: "system", content: `Summarize Indian tender documents concisely in ${langMap[lang]}. Use bullet points. Be specific with numbers and dates.` },
        { role: "user", content: `Create a 6-8 bullet summary in ${langMap[lang]} of this tender:\n\n${text.substring(0, 8000)}\n\nInclude: work name, department, estimated cost, EMD, deadline, key eligibility, completion period, important conditions.` }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });
    return c.choices[0]?.message?.content || "";
  } catch (err) {
    console.error("Summary err:", err);
    return "";
  }
}

export async function calculateEligibility(tender: any, company: any) {
  const checks: Array<{ criterion: string; status: "PASS" | "FAIL" | "WARN"; note: string }> = [];

  // Sector match
  const tSector = tender.sector?.toUpperCase() || "";
  const cSectors = company.primarySector.map((s: string) => s.toUpperCase());
  if (tSector && cSectors.some((s: string) => tSector.includes(s) || s.includes(tSector))) {
    checks.push({ criterion: "Sector", status: "PASS", note: `Matches your sector: ${tSector}` });
  } else if (tSector) {
    checks.push({ criterion: "Sector", status: "WARN", note: `Tender sector ${tSector} not in your primary` });
  }

  // Class
  if (tender.requiredClass && company.contractorClass) {
    const tClass = tender.requiredClass.replace(/\s/g, "_").toUpperCase();
    const cClass = company.contractorClass.toUpperCase();
    if (tClass === cClass || cClass <= tClass) {
      checks.push({ criterion: "Contractor Class", status: "PASS", note: `You have ${company.contractorClass}` });
    } else {
      checks.push({ criterion: "Contractor Class", status: "FAIL", note: `Need ${tender.requiredClass}, you have ${company.contractorClass}` });
    }
  }

  // Financial limit
  if (tender.estimatedCost && company.financialLimit) {
    const tCost = Number(tender.estimatedCost);
    const cLimit = Number(company.financialLimit);
    if (tCost <= cLimit) {
      checks.push({ criterion: "Financial Capacity", status: "PASS", note: `Within your limit of ₹${(cLimit / 100000).toFixed(1)}L` });
    } else {
      checks.push({ criterion: "Financial Capacity", status: "FAIL", note: `Exceeds your limit ₹${(cLimit / 100000).toFixed(1)}L vs ₹${(tCost / 100000).toFixed(1)}L` });
    }
  }

  // Location
  if (tender.state && tender.state.toLowerCase().includes(company.state.toLowerCase())) {
    checks.push({ criterion: "Location", status: "PASS", note: `Same state: ${company.state}` });
  }

  let status: "ELIGIBLE" | "PARTIAL" | "NOT_ELIGIBLE" = "PARTIAL";
  const fails = checks.filter(c => c.status === "FAIL").length;
  const passes = checks.filter(c => c.status === "PASS").length;
  if (fails === 0 && passes >= 2) status = "ELIGIBLE";
  else if (fails >= 2) status = "NOT_ELIGIBLE";

  // Match score
  let score = 50;
  score += passes * 12;
  score -= fails * 20;
  score = Math.max(0, Math.min(100, score));

  return { status, checks, score };
}

export async function processTender(tenderId: string) {
  const tender = await prisma.tender.findUnique({ where: { id: tenderId } });
  if (!tender || !tender.originalFilePath) return;

  await prisma.tender.update({ where: { id: tenderId }, data: { processingStatus: "PROCESSING" } });

  try {
    const supabase = createServiceClient();
    const { data: file, error } = await supabase.storage.from("tender-documents").download(tender.originalFilePath);
    if (error || !file) throw new Error("Download failed");

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTenderText(buffer);

    if (!text || text.length < 100) {
      throw new Error("Could not extract text from PDF (may be scanned image)");
    }

    const fields = await extractTenderFields(text);

    const [summaryEn, summaryBn, summaryHi] = await Promise.all([
      generateTenderSummary(text, "en"),
      generateTenderSummary(text, "bn"),
      generateTenderSummary(text, "hi"),
    ]);

    const parseDate = (v?: string): Date | null => {
      if (!v) return null;
      try { const d = new Date(v); return isNaN(d.getTime()) ? null : d; } catch { return null; }
    };

    await prisma.tender.update({
      where: { id: tenderId },
      data: {
        tenderNumber: fields.tenderNumber || null,
        nitNumber: fields.nitNumber || null,
        department: fields.department || null,
        organization: fields.organization || null,
        workName: fields.workName || tender.workName,
        workDescription: fields.workDescription || null,
        workLocation: fields.workLocation || null,
        district: fields.district || null,
        state: fields.state || null,
        sector: fields.sector || null,
        estimatedCost: fields.estimatedCost || null,
        emdAmount: fields.emdAmount || null,
        tenderFee: fields.tenderFee || null,
        publishedDate: parseDate(fields.publishedDate),
        lastSubmissionDate: parseDate(fields.lastSubmissionDate),
        openingDate: parseDate(fields.openingDate),
        completionPeriod: fields.completionPeriod || null,
        completionDays: fields.completionDays || null,
        requiredClass: fields.requiredClass || null,
        requiredTurnover: fields.requiredTurnover || null,
        requiredExperience: fields.requiredExperience || null,
        securityDepositPct: fields.securityDepositPct || null,
        performanceGuarPct: fields.performanceGuarPct || null,
        mobilizationAdv: fields.mobilizationAdv || false,
        mobilizationAdvPct: fields.mobilizationAdvPct || null,
        paymentTerms: fields.paymentTerms || null,
        ldClause: fields.ldClause || null,
        defectLiabilityPeriod: fields.defectLiabilityPeriod || null,
        eligibilityCriteria: fields.eligibilityCriteria || undefined,
        requiredDocuments: fields.requiredDocuments || undefined,
        riskFlags: fields.riskFlags || undefined,
        extractedData: fields as any,
        rawText: text.substring(0, 50000),
        aiSummaryEn: summaryEn,
        aiSummaryBn: summaryBn,
        aiSummaryHi: summaryHi,
        processingStatus: "COMPLETED",
        processedAt: new Date(),
      }
    });

    // Auto-create track + calculate eligibility for company
    const company = await prisma.company.findUnique({ where: { id: tender.uploadedById } });
    if (company) {
      const eligibility = await calculateEligibility(fields, company);
      await prisma.tenderTrack.upsert({
        where: { companyId_tenderId: { companyId: company.id, tenderId } },
        update: {
          eligibilityStatus: eligibility.status,
          eligibilityDetails: { checks: eligibility.checks } as any,
          matchScore: eligibility.score,
        },
        create: {
          companyId: company.id,
          tenderId,
          status: "DISCOVERED",
          eligibilityStatus: eligibility.status,
          eligibilityDetails: { checks: eligibility.checks } as any,
          matchScore: eligibility.score,
        }
      });
    }

  } catch (err: any) {
    console.error("Process tender err:", err);
    await prisma.tender.update({
      where: { id: tenderId },
      data: { processingStatus: "FAILED", processingError: err.message }
    });
  }
}