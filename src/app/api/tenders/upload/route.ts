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
        const buffer = Buffer.from(await file.arrayBuffer());
        const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const path = `${dbUser.companyId}/${Date.now()}_${sanitized}`;

        const { error } = await service.storage.from("tender-documents").upload(path, buffer, {
          contentType: file.type, upsert: false,
        });

        if (error) {
          results.push({ name: file.name, success: false, error: error.message });
          continue;
        }

        const { data: { publicUrl } } = service.storage.from("tender-documents").getPublicUrl(path);

        const tender = await prisma.tender.create({
          data: {
            uploadedById: dbUser.companyId,
            sourceType: "USER_UPLOAD",
            workName: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
            originalFileUrl: publicUrl,
            originalFilePath: path,
            originalFileName: file.name,
            processingStatus: "PENDING",
            isActive: true,
          }
        });

        // Process in background
        processTender(tender.id).catch(console.error);

        results.push({ id: tender.id, name: file.name, success: true });
      } catch (err: any) {
        results.push({ name: file.name, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return NextResponse.json({
      success: true,
      results,
      message: `${successCount} of ${files.length} tenders uploaded. AI analyzing in background.`
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}