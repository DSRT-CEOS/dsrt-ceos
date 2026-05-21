import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      include: { company: true },
    });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: dbUser });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const company = await prisma.company.update({
      where: { id: dbUser.companyId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.legalName !== undefined && { legalName: body.legalName || null }),
        ...(body.type && { type: body.type }),
        ...(body.panNumber !== undefined && { panNumber: body.panNumber || null }),
        ...(body.gstNumber !== undefined && { gstNumber: body.gstNumber || null }),
        ...(body.esiCode !== undefined && { esiCode: body.esiCode || null }),
        ...(body.epfCode !== undefined && { epfCode: body.epfCode || null }),
        ...(body.addressLine1 !== undefined && { addressLine1: body.addressLine1 || null }),
        ...(body.addressLine2 !== undefined && { addressLine2: body.addressLine2 || null }),
        ...(body.city !== undefined && { city: body.city || null }),
        ...(body.district !== undefined && { district: body.district || null }),
        ...(body.state && { state: body.state }),
        ...(body.pincode !== undefined && { pincode: body.pincode || null }),
        ...(body.bankName !== undefined && { bankName: body.bankName || null }),
        ...(body.bankBranch !== undefined && { bankBranch: body.bankBranch || null }),
        ...(body.bankAccountNumber !== undefined && { bankAccountNumber: body.bankAccountNumber || null }),
        ...(body.bankIfscCode !== undefined && { bankIfscCode: body.bankIfscCode || null }),
        ...(body.establishedYear !== undefined && { establishedYear: body.establishedYear ? parseInt(body.establishedYear) : null }),
        ...(body.contractorClass !== undefined && { contractorClass: body.contractorClass || null }),
        ...(body.financialLimit !== undefined && { financialLimit: body.financialLimit ? parseFloat(body.financialLimit) : null }),
        ...(body.primarySector && { primarySector: body.primarySector }),
      }
    });

    if (body.userName || body.userPhone !== undefined) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          ...(body.userName && { name: body.userName }),
          ...(body.userPhone !== undefined && { phone: body.userPhone || null }),
        }
      });
    }

    return NextResponse.json({ success: true, data: company });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}