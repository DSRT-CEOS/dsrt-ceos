export const dynamic = "force-dynamic";

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
      include: {
        company: {
          include: {
            pastWorks: true,
            staff: { where: { isActive: true } },
            machinery: { where: { isActive: true } }
          }
        }
      }
    });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const tender = await prisma.tender.findFirst({ where: { id: tenderId, uploadedById: dbUser.companyId } });
    if (!tender) return NextResponse.json({ error: "Tender not found" }, { status: 404 });

    // Check if tender has been processed
    if (tender.processingStatus !== "COMPLETED") {
      return NextResponse.json({
        success: false,
        error: "Please wait for tender analysis to complete first. AI is still processing this tender."
      }, { status: 400 });
    }

    if (!tender.workName || tender.workName === "Extraction Failed - Please retry") {
      return NextResponse.json({
        success: false,
        error: "Tender data extraction failed. Please click 'Retry AI' on the tender page first."
      }, { status: 400 });
    }

    const { docType } = await request.json();
    const company = dbUser.company;

    let content = "";
    const title = DOC_TITLES[docType] || docType;
    let pdfBytes: Uint8Array;

    try {
      if (docType === "COVERING_LETTER") {
        content = await generateCoveringLetter(tender, company);
      } else if (docType === "AFFIDAVIT_NON_BLACKLISTING") {
        content = await generateAffidavit("NON_BLACKLISTING", tender, company);
      } else if (docType === "AFFIDAVIT_AUTHENTICITY") {
        content = await generateAffidavit("AUTHENTICITY", tender, company);
      } else if (docType === "AFFIDAVIT_NO_RELATION") {
        content = await generateAffidavit("NO_RELATION", tender, company);
      } else if (docType === "EXPERIENCE_STATEMENT") {
        if (company.pastWorks.length === 0) {
          return NextResponse.json({
            success: false,
            error: "No past works in your profile. Add past works in Settings > Past Works first."
          }, { status: 400 });
        }
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
    } catch (genErr: any) {
      console.error("Content generation error:", genErr);
      return NextResponse.json({
        success: false,
        error: genErr.isRateLimit
          ? "AI quota exhausted. Try in a few minutes."
          : `Content generation failed: ${genErr.message}`
      }, { status: 500 });
    }

    if (docType !== "CHECKLIST") {
      if (!content || content.length < 50) {
        return NextResponse.json({
          success: false,
          error: "AI returned empty content. This may be due to quota or temporary error. Please retry."
        }, { status: 500 });
      }
      pdfBytes = await generatePDF({
        title,
        subtitle: `Tender: ${tender.nitNumber || tender.workName.substring(0, 60)}`,
        content,
      });
    }

    // Upload to storage
    const service = createServiceClient();
    const fileName = `${title.replace(/\s/g, "_")}_${Date.now()}.pdf`;
    const filePath = `${company.id}/${tenderId}/${fileName}`;

    const { error: upErr } = await service.storage.from("generated-documents").upload(
      filePath, pdfBytes!,
      { contentType: "application/pdf", upsert: true }
    );

    if (upErr) {
      console.error("Upload err:", upErr);
      return NextResponse.json({
        error: `Storage upload failed: ${upErr.message}. Check 'generated-documents' bucket exists.`
      }, { status: 500 });
    }

    const { data: signedData } = await service.storage
      .from("generated-documents")
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    await prisma.generatedDocument.updateMany({
      where: { companyId: company.id, tenderId, type: docType },
      data: { isLatest: false }
    });

    const doc = await prisma.generatedDocument.create({
      data: {
        companyId: company.id,
        tenderId,
        type: docType,
        name: title,
        fileUrl: signedData?.signedUrl || "",
        filePath,
        generatedFrom: { content: content.substring(0, 500) },
        isLatest: true,
      }
    });

    return NextResponse.json({ success: true, document: doc, url: signedData?.signedUrl });
  } catch (err: any) {
    console.error("Generation err:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}