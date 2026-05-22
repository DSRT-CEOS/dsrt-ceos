import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Get invite details (public, by token)
export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

    const invite = await prisma.teamInvite.findUnique({
      where: { inviteToken: token },
      include: { company: { select: { name: true, city: true, state: true } } }
    });

    if (!invite) return NextResponse.json({ success: false, error: "Invalid invitation" }, { status: 404 });
    if (invite.status !== "PENDING") return NextResponse.json({ success: false, error: "Invitation already used" }, { status: 400 });
    if (invite.expiresAt < new Date()) return NextResponse.json({ success: false, error: "Invitation expired" }, { status: 400 });

    return NextResponse.json({
      success: true,
      invite: {
        email: invite.email, name: invite.name, role: invite.role,
        companyName: invite.company.name,
        companyLocation: `${invite.company.city || ""}, ${invite.company.state}`,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// Accept invite + create user record
export async function POST(request: NextRequest) {
  try {
    const { token, supabaseId, name, phone } = await request.json();
    if (!token || !supabaseId) return NextResponse.json({ error: "Token and userId required" }, { status: 400 });

    const invite = await prisma.teamInvite.findUnique({ where: { inviteToken: token } });
    if (!invite) return NextResponse.json({ success: false, error: "Invalid invitation" }, { status: 404 });
    if (invite.status !== "PENDING") return NextResponse.json({ success: false, error: "Already used" }, { status: 400 });
    if (invite.expiresAt < new Date()) return NextResponse.json({ success: false, error: "Expired" }, { status: 400 });

    // Check if user exists with this supabaseId
    const existing = await prisma.user.findUnique({ where: { supabaseId } });
    if (existing) {
      return NextResponse.json({ success: false, error: "User already registered" }, { status: 400 });
    }

    // Create user under invited company
    const newUser = await prisma.user.create({
      data: {
        name: name || invite.name || "Team Member",
        email: invite.email,
        phone: phone || null,
        supabaseId,
        role: invite.role,
        companyId: invite.companyId,
        language: "BENGALI",
      }
    });

    // Mark invite accepted
    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() }
    });

    return NextResponse.json({ success: true, userId: newUser.id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}