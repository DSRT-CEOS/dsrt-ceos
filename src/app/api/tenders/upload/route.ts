export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { processTender } from "@/lib/pdf/tender-processor";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const fd = await request.formData();
    const files = fd.getAll("files") as File[];
    if (!files || files.length === 0) return NextResponse.json({ error: "No files" }, { status: 400 });

    const service = createServiceClient();
    const results: any[] = [];

    for (const file of files) {
      try {
        if (file.size === 0) {
          results.push({ name: file.name, success: false, error: "Empty file" });
          continue;
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const path = `${dbUser.companyId}/${Date.now()}_${sanitized}`;

        console.log("Uploading to tender-documents bucket, path:", path, "size:", buffer.length);

        const { data: upData, error: upError } = await service.storage
          .from("tender-documents")
          .upload(path, buffer, {
            contentType: file.type || "application/pdf",
            upsert: false,
          });

        if (upError) {
          console.error("Storage upload error:", JSON.stringify(upError));
          results.push({
            name: file.name,
            success: false,
            error: `Upload failed: ${upError.message}. Check that 'tender-documents' bucket exists in Supabase.`
          });
          continue;
        }

        console.log("Upload successful:", upData?.path);

        // Use signed URL instead of public URL (since bucket is private)
        const { data: signedData } = await service.storage
          .from("tender-documents")
          .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year

        const tender = await prisma.tender.create({
          data: {
            uploadedById: dbUser.companyId,
            sourceType: "USER_UPLOAD",
            workName: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
            originalFileUrl: signedData?.signedUrl || "",
            originalFilePath: path,
            originalFileName: file.name,
            processingStatus: "PENDING",
            isActive: true,
          }
        });

        // Process in background
        processTender(tender.id).catch(err => console.error("Background process err:", err));

        results.push({ id: tender.id, name: file.name, success: true });
      } catch (err: any) {
        console.error("File processing error:", err);
        results.push({ name: file.name, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return NextResponse.json({
      success: true,
      results,
      message: `${successCount} of ${files.length} tenders uploaded. AI analyzing in background.`
    });
  } catch (err: any) {
    console.error("Upload API err:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}