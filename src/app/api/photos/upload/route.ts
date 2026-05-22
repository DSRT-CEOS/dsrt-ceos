import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const fd = await request.formData();
    const projectId = fd.get("projectId") as string;
    const caption = (fd.get("caption") as string) || "";
    const category = (fd.get("category") as string) || "PROGRESS";
    const workArea = (fd.get("workArea") as string) || "";
    const files = fd.getAll("photos") as File[];

    if (!projectId || files.length === 0) {
      return NextResponse.json({ error: "projectId and photos required" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({ where: { id: projectId, companyId: dbUser.companyId } });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const service = createServiceClient();
    const results: any[] = [];

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${dbUser.companyId}/${projectId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

        const { error } = await service.storage.from("project-photos").upload(path, buffer, {
          contentType: file.type, upsert: false
        });

        if (error) {
          results.push({ name: file.name, success: false, error: error.message });
          continue;
        }

        const { data: { publicUrl } } = service.storage.from("project-photos").getPublicUrl(path);

        const photo = await prisma.progressPhoto.create({
          data: {
            projectId,
            photoUrl: publicUrl,
            photoPath: path,
            caption: caption || null,
            category,
            workArea: workArea || null,
            uploadedBy: dbUser.name,
          }
        });

        results.push({ id: photo.id, name: file.name, success: true });
      } catch (err: any) {
        results.push({ name: file.name, success: false, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `${results.filter(r => r.success).length} of ${files.length} uploaded`
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}