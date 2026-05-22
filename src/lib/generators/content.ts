import { groq, MODELS } from "@/lib/ai/groq";

export async function generateCoveringLetter(tender: any, company: any): Promise<string> {
  const prompt = `Generate a professional covering letter for tender submission. Indian government format.

TENDER:
- Work: ${tender.workName}
- NIT No: ${tender.nitNumber || "N/A"}
- Department: ${tender.department || "Concerned Department"}
- Estimated Cost: ${tender.estimatedCost ? `Rs ${Number(tender.estimatedCost).toLocaleString("en-IN")}` : "N/A"}
- Last Submission: ${tender.lastSubmissionDate ? new Date(tender.lastSubmissionDate).toLocaleDateString("en-IN") : "N/A"}

COMPANY:
- Name: ${company.name}
- Address: ${[company.addressLine1, company.city, company.district, company.state, company.pincode].filter(Boolean).join(", ")}
- PAN: ${company.panNumber || "N/A"}
- GST: ${company.gstNumber || "N/A"}
- Contractor Class: ${company.contractorClass || "N/A"}

Write a formal covering letter in standard Indian PWD/CPWD format. Include:
1. Date and address block
2. Subject line referencing tender
3. Salutation
4. Body expressing intent to submit bid, mentioning enclosed documents, agreeing to terms
5. Closing with authorized signatory line

Return ONLY the letter text, no markdown.`;

  try {
    const c = await groq.chat.completions.create({
      model: MODELS.FAST,
      messages: [
        { role: "system", content: "You are an expert at drafting Indian government tender documents in formal English." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });
    return c.choices[0]?.message?.content || "";
  } catch { return ""; }
}

export async function generateAffidavit(type: string, tender: any, company: any): Promise<string> {
  const types: Record<string, string> = {
    NON_BLACKLISTING: "non-blacklisting/non-debarment affidavit declaring company has never been blacklisted by any government department",
    AUTHENTICITY: "authenticity affidavit declaring all submitted documents are true, correct, and authentic",
    NO_RELATION: "no-relationship affidavit declaring no relation with any official of the tendering authority",
  };

  const prompt = `Generate ${types[type]} for Indian government tender submission.

COMPANY: ${company.name}
PROPRIETOR/AUTHORIZED PERSON: ${company.authSignatoryName || "Authorized Signatory"}
ADDRESS: ${[company.addressLine1, company.city, company.state].filter(Boolean).join(", ")}
PAN: ${company.panNumber || "N/A"}

TENDER REFERENCE: ${tender.nitNumber || tender.tenderNumber || "Tender"}
DEPARTMENT: ${tender.department || ""}
WORK: ${tender.workName}

Use standard Indian affidavit format with:
- "AFFIDAVIT" heading
- "I, [name], son/daughter of [father's name], aged about [age] years, resident of [address], do hereby solemnly affirm and declare as under:"
- Numbered declaration points
- Verification clause at end
- Deponent and date placeholder
- To be sworn before Notary Public on Rs. 100 stamp paper

Return ONLY the affidavit text. Use [BRACKETS] for fields to be filled manually by signatory.`;

  try {
    const c = await groq.chat.completions.create({
      model: MODELS.FAST,
      messages: [
        { role: "system", content: "You are an expert at drafting Indian legal affidavits for tender submissions." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });
    return c.choices[0]?.message?.content || "";
  } catch { return ""; }
}

export async function generateExperienceStatement(tender: any, company: any, pastWorks: any[]): Promise<string> {
  // Select most relevant past works using AI
  const selected = await selectRelevantPastWorks(tender, pastWorks);

  const prompt = `Generate a Statement of Experience for tender submission.

COMPANY: ${company.name}
TENDER REFERENCE: ${tender.nitNumber || tender.workName}

RELEVANT PAST WORKS:
${selected.map((w, i) => `${i + 1}. ${w.workName}
   Department: ${w.department}
   Value: Rs ${Number(w.contractValue).toLocaleString("en-IN")}
   Work Order: ${w.workOrderNumber || "On record"}
   Completed: ${w.completionDate ? new Date(w.completionDate).toLocaleDateString("en-IN") : "N/A"}
   Location: ${w.location || "N/A"}
   Nature: ${w.workNature || w.sector}`).join("\n\n")}

Format as a professional statement with table-style listing. Include:
1. Header with company name and tender reference
2. Declaration: "We hereby submit the following list of similar works executed by us in last X years"
3. Tabular list of works (Sl.No, Work Description, Department, Value, Period, Status)
4. Total experience value calculated
5. Footer with date and signature placeholder

Return clean text, ready to print.`;

  try {
    const c = await groq.chat.completions.create({
      model: MODELS.FAST,
      messages: [
        { role: "system", content: "You are an expert at preparing tender experience statements in Indian government format." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 2000,
    });
    return c.choices[0]?.message?.content || "";
  } catch { return ""; }
}

async function selectRelevantPastWorks(tender: any, pastWorks: any[]): Promise<any[]> {
  if (pastWorks.length === 0) return [];
  if (pastWorks.length <= 5) return pastWorks;

  // Filter by sector match
  const tSector = tender.sector?.toUpperCase() || "";
  const filtered = pastWorks.filter(w => {
    const wSector = w.sector?.toUpperCase() || "";
    return !tSector || wSector === tSector || wSector.includes(tSector);
  });

  // Sort by value (descending) and completion date (recent first)
  const sorted = (filtered.length > 0 ? filtered : pastWorks).sort((a, b) => {
    const aVal = Number(a.contractValue || 0);
    const bVal = Number(b.contractValue || 0);
    if (bVal !== aVal) return bVal - aVal;
    const aDate = a.completionDate ? new Date(a.completionDate).getTime() : 0;
    const bDate = b.completionDate ? new Date(b.completionDate).getTime() : 0;
    return bDate - aDate;
  });

  return sorted.slice(0, 8);
}

export async function generateTurnoverStatement(tender: any, company: any): Promise<string> {
  const prompt = `Generate a Turnover Certificate/Statement for tender submission.

COMPANY: ${company.name}
PAN: ${company.panNumber || "N/A"}
TENDER REF: ${tender.nitNumber || tender.workName}

Generate a Chartered Accountant certified turnover statement template with:
1. Header on letterhead format
2. Declaration by CA: "This is to certify that the annual turnover of M/s [Company Name] for last three financial years is as under"
3. Table format:
   - FY 2021-22: Rs [amount]
   - FY 2022-23: Rs [amount]
   - FY 2023-24: Rs [amount]
   - Average Annual Turnover: Rs [average]
4. Footer with CA signature, membership number, UDIN placeholder

Use [BRACKETS] for amounts that need to be filled from actual CA certificate.
Return the template ready for CA to certify.`;

  try {
    const c = await groq.chat.completions.create({
      model: MODELS.FAST,
      messages: [
        { role: "system", content: "Expert at Indian CA-certified financial statements." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 1000,
    });
    return c.choices[0]?.message?.content || "";
  } catch { return ""; }
}

export async function generateStaffDetails(tender: any, company: any, staff: any[]): Promise<string> {
  if (staff.length === 0) {
    return `STAFF DEPLOYMENT FOR THE PROJECT\n\nNo staff members on record. Please add staff in Settings > Staff Members.`;
  }

  const prompt = `Generate Staff Deployment Statement for tender.

COMPANY: ${company.name}
TENDER REF: ${tender.nitNumber || tender.workName}

PROPOSED STAFF FOR THIS PROJECT:
${staff.map((s, i) => `${i + 1}. ${s.name} - ${s.designation}
   Qualification: ${s.qualification || "N/A"}
   Experience: ${s.experienceYears || 0} years`).join("\n")}

Generate a formal staff deployment statement in table format with columns:
Sl.No | Name | Designation | Qualification | Experience | Role on Project

Include header declaring proposed deployment for this specific work.
Add footer with company signature and date.`;

  try {
    const c = await groq.chat.completions.create({
      model: MODELS.FAST,
      messages: [
        { role: "system", content: "Expert at Indian tender staff deployment documents." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });
    return c.choices[0]?.message?.content || "";
  } catch { return ""; }
}

export async function generateMachineryList(tender: any, company: any, machinery: any[]): Promise<string> {
  if (machinery.length === 0) {
    return `MACHINERY DEPLOYMENT FOR THE PROJECT\n\nNo machinery on record. Please add equipment in Settings > Machinery.`;
  }

  const prompt = `Generate Machinery Deployment List for tender.

COMPANY: ${company.name}
TENDER REF: ${tender.nitNumber || tender.workName}

AVAILABLE MACHINERY:
${machinery.map((m, i) => `${i + 1}. ${m.name} (${m.category})
   Make: ${m.make || "N/A"}, Year: ${m.yearOfMfg || "N/A"}
   Ownership: ${m.ownershipType}`).join("\n")}

Generate formal machinery deployment statement in table format:
Sl.No | Equipment | Make/Model | Year | Owned/Hired | To Be Deployed On Site

Include declaration of availability for this project. Format for tender submission.`;

  try {
    const c = await groq.chat.completions.create({
      model: MODELS.FAST,
      messages: [
        { role: "system", content: "Expert at Indian tender machinery deployment documents." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });
    return c.choices[0]?.message?.content || "";
  } catch { return ""; }
}

export async function generateChecklist(tender: any, company: any): Promise<any> {
  const requiredDocs = tender.requiredDocuments || [
    "Tender Fee Receipt",
    "EMD Receipt",
    "Covering Letter",
    "Authority Letter",
    "PAN Card Copy",
    "GST Registration Certificate",
    "Contractor Registration Certificate",
    "Turnover Certificate (last 3 years)",
    "Income Tax Returns (last 3 years)",
    "Bank Solvency Certificate",
    "Experience Statement with Work Orders",
    "Completion Certificates",
    "Non-Blacklisting Affidavit",
    "Authenticity Affidavit",
    "Staff Deployment Plan",
    "Machinery Deployment List",
    "Technical Bid Documents",
    "Financial Bid / BOQ"
  ];

  return {
    tenderRef: tender.nitNumber || tender.workName,
    companyName: company.name,
    items: requiredDocs.map((doc: string, i: number) => ({
      slNo: i + 1,
      document: doc,
      status: "REQUIRED",
      pageNo: "",
    }))
  };
}