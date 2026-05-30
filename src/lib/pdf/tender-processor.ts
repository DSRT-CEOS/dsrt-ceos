import { chatCompletion } from "@/lib/ai/groq";
import { createServiceClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function extractTenderText(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text?.trim() || "";
  } catch (err) {
    console.error("PDF parse err:", err);
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
  const truncated = text.substring(0, 15000);

  const prompt = `Extract tender information from this Indian government NIT document text.

CRITICAL INSTRUCTIONS:
1. Use ONLY information actually present in the text. Do NOT guess or invent.
2. If a field is not clearly mentioned, set it to null.
3. For amounts: Parse Indian format carefully:
   - "Rs 20,00,000" = 2000000 (20 Lakhs)
   - "Rs 5,00,000" = 500000 (5 Lakhs)  
   - "Rs 1,00,00,000" = 10000000 (1 Crore)
   - "Rs 40,000" = 40000 (40 Thousand)
4. For dates: Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD format
5. For completion period: extract days (e.g. "365 days" = 365, "6 months" = 180, "1 year" = 365)

Return ONLY valid JSON in this exact structure:
{
  "tenderNumber": "string or null",
  "nitNumber": "string or null - e.g. NIT-123/2025-26 or No.GM/AFK/EO/PRC/30/2026-27",
  "department": "exact dept name from doc",
  "organization": "organization name",
  "workName": "main work title - exact text",
  "workDescription": "detailed description",
  "workLocation": "specific location like Range Hills Estate, Khadki",
  "district": "district name only - e.g. Pune",
  "state": "state name - e.g. Maharashtra",
  "sector": "CIVIL or ELECTRICAL or MECHANICAL or ROAD or BRIDGE or WATER_SUPPLY or SEWERAGE",
  "estimatedCost": exact_number_in_rupees_or_null,
  "emdAmount": exact_number_in_rupees_or_null,
  "tenderFee": exact_number_in_rupees_or_null,
  "publishedDate": "YYYY-MM-DD or null",
  "lastSubmissionDate": "YYYY-MM-DD or null",
  "openingDate": "YYYY-MM-DD or null",
  "completionPeriod": "e.g. 365 days or 6 months",
  "completionDays": number_or_null,
  "requiredClass": "Class I/II/III/IV/V or null",
  "requiredTurnover": number_or_null,
  "requiredExperience": "summary of experience required",
  "securityDepositPct": number_or_null,
  "performanceGuarPct": number_or_null,
  "mobilizationAdv": true_or_false,
  "mobilizationAdvPct": number_or_null,
  "paymentTerms": "string or null",
  "ldClause": "string or null",
  "defectLiabilityPeriod": "e.g. 12 months",
  "requiredDocuments": ["array of docs"],
  "riskFlags": [{"type": "HIGH/MEDIUM/LOW", "message": "description"}]
}

EXAMPLES of correct parsing:
- "Estimated Amount Rs. 20,00,000/-" → estimatedCost: 2000000
- "EMD: Rs 40,000" → emdAmount: 40000  
- "Time for Completion: 365 days" → completionDays: 365, completionPeriod: "365 days"
- "30/05/2026 & 10:00 hrs" → lastSubmissionDate: "2026-05-30"
- "AFK, Range Hills Estate" → workLocation: "Range Hills Estate, AFK"
- "Ministry of Defence, Ammunition Factory Khadki" → department: "Ministry of Defence", organization: "Ammunition Factory Khadki", district: "Pune", state: "Maharashtra"

DOCUMENT TEXT:
${truncated}`;

  try {
    const response = await chatCompletion([
      { role: "system", content: "You are a precise data extractor. NEVER guess. NEVER round. NEVER convert units. Extract EXACTLY what is written. Return only valid JSON." },
      { role: "user", content: prompt }
    ], {
      fallbackChain: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
      temperature: 0.0,
      maxTokens: 3000,
      responseFormat: "json_object",
    });

    const parsed = JSON.parse(response);
    return parsed;
  } catch (err) {
    console.error("AI extract err:", err);
    return { workName: "Extraction Failed - Please retry" };
  }
}

export async function generateTenderSummary(text: string, lang: "en" | "bn" | "hi"): Promise<string> {
  const langMap = { en: "English", bn: "Bengali (বাংলা)", hi: "Hindi (हिंदी)" };

  try {
    const response = await chatCompletion([
      { role: "system", content: `Summarize Indian tender documents in ${langMap[lang]}. Use ONLY information present in text. NEVER invent. Use bullet points.` },
      { role: "user", content: `Create 6-8 bullet summary in ${langMap[lang]} of this tender. Include: exact work name, exact department, exact estimated cost, exact EMD, exact deadline, exact eligibility, exact completion period, important conditions. DO NOT INVENT any data.\n\n${text.substring(0, 10000)}` }
    ], {
      fallbackChain: ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"],
      temperature: 0.1,
      maxTokens: 1000,
    });
    return response;
  } catch (err) {
    console.error("Summary err:", err);
    return "";
  }
}

export async function calculateEligibility(tender: any, company: any) {
  const checks: Array<{ criterion: string; status: "PASS" | "FAIL" | "WARN"; note: string }> = [];

  const tSector = tender.sector?.toUpperCase() || "";
  const cSectors = company.primarySector.map((s: string) => s.toUpperCase());
  if (tSector && cSectors.some((s: string) => tSector.includes(s) || s.includes(tSector))) {
    checks.push({ criterion: "Sector", status: "PASS", note: `Matches your sector: ${tSector}` });
  } else if (tSector) {
    checks.push({ criterion: "Sector", status: "WARN", note: `Tender sector ${tSector} not in your primary` });
  }

  if (tender.requiredClass && company.contractorClass) {
    const tClass = tender.requiredClass.replace(/\s/g, "_").toUpperCase();
    const cClass = company.contractorClass.toUpperCase();
    if (tClass === cClass || cClass <= tClass) {
      checks.push({ criterion: "Contractor Class", status: "PASS", note: `You have ${company.contractorClass}` });
    } else {
      checks.push({ criterion: "Contractor Class", status: "FAIL", note: `Need ${tender.requiredClass}, you have ${company.contractorClass}` });
    }
  }

  if (tender.estimatedCost && company.financialLimit) {
    const tCost = Number(tender.estimatedCost);
    const cLimit = Number(company.financialLimit);
    if (tCost <= cLimit) {
      checks.push({ criterion: "Financial Capacity", status: "PASS", note: `Within your limit of Rs ${(cLimit / 100000).toFixed(1)}L` });
    } else {
      checks.push({ criterion: "Financial Capacity", status: "FAIL", note: `Exceeds your limit Rs ${(cLimit / 100000).toFixed(1)}L vs Rs ${(tCost / 100000).toFixed(1)}L` });
    }
  }

  if (tender.state && company.state && tender.state.toLowerCase().includes(company.state.toLowerCase())) {
    checks.push({ criterion: "Location", status: "PASS", note: `Same state: ${company.state}` });
  } else if (tender.state) {
    checks.push({ criterion: "Location", status: "WARN", note: `Different state: tender in ${tender.state}` });
  }

  let status: "ELIGIBLE" | "PARTIAL" | "NOT_ELIGIBLE" = "PARTIAL";
  const fails = checks.filter(c => c.status === "FAIL").length;
  const passes = checks.filter(c => c.status === "PASS").length;
  if (fails === 0 && passes >= 2) status = "ELIGIBLE";
  else if (fails >= 2) status = "NOT_ELIGIBLE";

  let score = 50;
  score += passes * 12;
  score -= fails * 20;
  score = Math.max(0, Math.min(100, score));

  return { status, checks, score };
}

export async function processTender(tenderId: string) {
  const tender = await prisma.tender.findUnique({ where: { id: tenderId } });
  if (!tender || !tender.originalFilePath) {
    console.error("Tender or path missing:", tenderId);
    return;
  }

  await prisma.tender.update({ where: { id: tenderId }, data: { processingStatus: "PROCESSING" } });

  try {
    const supabase = createServiceClient();

    // CRITICAL FIX: Use service client to download directly from bucket
    // Don't rely on public URL since bucket is private
    console.log("Downloading from bucket: tender-documents, path:", tender.originalFilePath);

    const { data: file, error } = await supabase.storage
      .from("tender-documents")
      .download(tender.originalFilePath);

    if (error) {
      console.error("Storage download error:", JSON.stringify(error));
      throw new Error(`Storage download failed: ${error.message}. Check bucket name 'tender-documents' exists and has policies.`);
    }

    if (!file) throw new Error("No file returned from storage");

    const buffer = Buffer.from(await file.arrayBuffer());
    console.log("Downloaded PDF size:", buffer.length, "bytes");

    if (buffer.length < 100) throw new Error("PDF file is too small or empty");

    const text = await extractTenderText(buffer);
    console.log("Extracted text length:", text.length);

    if (!text || text.length < 100) {
      throw new Error("Could not extract text from PDF. It may be a scanned image or password-protected.");
    }

    const fields = await extractTenderFields(text);
    console.log("Extracted fields:", JSON.stringify(fields).substring(0, 500));

    // Generate summaries in parallel - but with error handling per language
    const [summaryEn, summaryBn, summaryHi] = await Promise.allSettled([
      generateTenderSummary(text, "en"),
      generateTenderSummary(text, "bn"),
      generateTenderSummary(text, "hi"),
    ]);

    const parseDate = (v?: string): Date | null => {
      if (!v) return null;
      try {
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
      } catch { return null; }
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
        aiSummaryEn: summaryEn.status === "fulfilled" ? summaryEn.value : "",
        aiSummaryBn: summaryBn.status === "fulfilled" ? summaryBn.value : "",
        aiSummaryHi: summaryHi.status === "fulfilled" ? summaryHi.value : "",
        processingStatus: "COMPLETED",
        processedAt: new Date(),
      }
    });

    // Calculate eligibility against company
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

    console.log("Tender processed successfully:", tenderId);
  } catch (err: any) {
    console.error("Process tender err:", err.message);
    await prisma.tender.update({
      where: { id: tenderId },
      data: { processingStatus: "FAILED", processingError: err.message }
    });
  }
}