import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { user, company } = await request.json();

    if (!user.supabaseId) {
      return NextResponse.json({ success: false, error: "Missing user ID" }, { status: 400 });
    }

    const newCompany = await prisma.company.create({
      data: {
        name: company.name,
        type: company.type,
        panNumber: company.panNumber || null,
        gstNumber: company.gstNumber || null,
        state: company.state || "West Bengal",
        city: company.city || null,
        contractorClass: company.contractorClass || null,
        primarySector: ["CIVIL"],
      },
    });

    const newUser = await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        supabaseId: user.supabaseId,
        role: "OWNER",
        companyId: newCompany.id,
        language: "BENGALI",
      },
    });

    await prisma.companyPreference.create({
      data: {
        companyId: newCompany.id,
        preferredStates: ["West Bengal"],
        preferredSectors: ["CIVIL_BUILDING", "ROAD", "ELECTRICAL"],
      },
    });

    return NextResponse.json({ success: true, userId: newUser.id, companyId: newCompany.id });
  } catch (err: unknown) {
    console.error("Registration error:", err);
    const msg = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}