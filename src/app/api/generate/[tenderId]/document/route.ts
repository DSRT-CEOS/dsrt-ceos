import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import {
  generateCoveringLetter, generateAffidavit, generateExperienceStatement,
  generateTurnoverStatement, generateStaffDetails, generateMachineryList,
  generateChecklist
} from "@/lib/generators/content";
import { generatePDF, generateChecklistPDF } from "@/lib/generators/pdf";

export const maxDuration = 60;

const DOC_TITLES: Record<string, string> = {
  COVERING_LETTER: "Covering Letter",
  AFFIDAVIT_NON_BLACKLISTING: "Affidavit - Non-Blacklisting",
  AFFIDAVIT_AUTHENTICITY: "Affidavit - Document Authenticity",
  AFFIDAVIT_NO_RELATION: "Affidavit - No Relationship",
  EXPERIENCE_STATEMENT: "Statement of Experience",
  TURNOVER_STATEMENT: "Turnover Certificate",
  STAFF_DETAILS: "Staff Deployment",
  MACHINERY_LIST: "Machinery Deployment List",
  CHECKLIST: "Document Submission Checklist",
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ tenderId: string }> }) {
  try {
    const { tenderId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      include: { company: { include: { pastWorks: true, staff: { where: { isActive: true } }, machinery: { where: { isActive: true } } } } }
    });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const tender = await prisma.tender.findFirst({ where: { id: tenderId, uploadedById: dbUser.companyId } });
    if (!tender) return NextResponse.json({ error: "Tender not found" }, { status: 404 });

    const { docType } = await request.json();
    const company = dbUser.company;

    let content = "";
    let title = DOC_TITLES[docType] || docType;
    let pdfBytes: Uint8Array;

    if (docType === "COVERING_LETTER") {
      content = await generateCoveringLetter(tender, company);
    } else if (docType === "AFFIDAVIT_NON_BLACKLISTING") {
      content = await generateAffidavit("NON_BLACKLISTING", tender, company);
    } else if (docType === "AFFIDAVIT_AUTHENTICITY") {
      content = await generateAffidavit("AUTHENTICITY", tender, company);
    } else if (docType === "AFFIDAVIT_NO_RELATION") {
      content = await generateAffidavit("NO_RELATION", tender, company);
    } else if (docType === "EXPERIENCE_STATEMENT") {
      content = await generateExperienceStatement(tender, company, company.pastWorks);
    } else if (docType === "TURNOVER_STATEMENT") {
      content = await generateTurnoverStatement(tender, company);
    } else if (docType === "STAFF_DETAILS") {
      content = await generateStaffDetails(tender, company, company.staff);
    } else if (docType === "MACHINERY_LIST") {
      content = await generateMachineryList(tender, company, company.machinery);
    } else if (docType === "CHECKLIST") {
      const checklist = await generateChecklist(tender, company);
      pdfBytes = await generateChecklistPDF(checklist);
      content = JSON.stringify(checklist);
    } else {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    if (docType !== "CHECKLIST") {
      if (!content || content.length < 50) {
        return NextResponse.json({ error: "AI failed to generate content" }, { status: 500 });
      }
      pdfBytes = await generatePDF({
        title,
        subtitle: `Tender: ${tender.nitNumber || tender.workName.substring(0, 50)}`,
        content,
      });
    }

    // Upload to storage
    const service = createServiceClient();
    const fileName = `${title.replace(/\s/g, "_")}_${Date.now()}.pdf`;
    const filePath = `${company.id}/${tenderId}/${fileName}`;

    const { error: upErr } = await service.storage.from("generated-documents").upload(
      filePath,
      pdfBytes!,
      { contentType: "application/pdf", upsert: true }
    );

    if (upErr) {
      console.error("Upload err:", upErr);
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    const { data: { publicUrl } } = service.storage.from("generated-documents").getPublicUrl(filePath);

    // Mark previous versions as not latest
    await prisma.generatedDocument.updateMany({
      where: { companyId: company.id, tenderId, type: docType },
      data: { isLatest: false }
    });

    // Save record
    const doc = await prisma.generatedDocument.create({
      data: {
        companyId: company.id,
        tenderId,
        type: docType,
        name: title,
        fileUrl: publicUrl,
        filePath,
        generatedFrom: { content: content.substring(0, 500) },
        isLatest: true,
      }
    });

    return NextResponse.json({ success: true, document: doc, url: publicUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Generation failed";
    console.error("Gen err:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}