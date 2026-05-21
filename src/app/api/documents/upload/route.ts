import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { processCompanyDocument } from "@/lib/pdf/processor";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const category = (formData.get("category") as string) || "OTHER";

    if (!files || files.length === 0) return NextResponse.json({ error: "No files" }, { status: 400 });

    const service = createServiceClient();
    const results: any[] = [];

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const path = `${dbUser.companyId}/${Date.now()}_${sanitized}`;

        const { error: upErr } = await service.storage.from("company-documents").upload(path, buffer, {
          contentType: file.type, upsert: false,
        });

        if (upErr) {
          results.push({ name: file.name, success: false, error: upErr.message });
          continue;
        }

        const { data: { publicUrl } } = service.storage.from("company-documents").getPublicUrl(path);

        const doc = await prisma.companyDocument.create({
          data: {
            companyId: dbUser.companyId, category,
            name: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
            fileUrl: publicUrl, filePath: path,
            fileSize: file.size, mimeType: file.type,
            isProcessed: false, isLatest: true,
          }
        });

        processCompanyDocument(doc.id).catch(console.error);
        results.push({ id: doc.id, name: doc.name, success: true });
      } catch (err: any) {
        results.push({ name: file.name, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return NextResponse.json({
      success: true, results,
      message: `${successCount} of ${files.length} uploaded. AI processing in background.`
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}