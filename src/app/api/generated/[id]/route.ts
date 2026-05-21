import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const doc = await prisma.generatedDocument.findFirst({ where: { id, companyId: dbUser.companyId } });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const service = createServiceClient();
    await service.storage.from("generated-documents").remove([doc.filePath]);
    await prisma.generatedDocument.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}