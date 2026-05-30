export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { sendEmail, emailTemplate } from "@/lib/email/service";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
      include: { company: true }
    });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (dbUser.role !== "OWNER") {
      return NextResponse.json({ error: "Only owner can invite team members" }, { status: 403 });
    }

    const { email, name, role } = await request.json();
    if (!email || !role) return NextResponse.json({ error: "Email and role required" }, { status: 400 });

    // Check if user already exists with this email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.companyId === dbUser.companyId) {
      return NextResponse.json({ error: "This user is already in your team" }, { status: 400 });
    }
    if (existing) {
      return NextResponse.json({ error: "Email already registered to another company" }, { status: 400 });
    }

    // Check for existing pending invite
    const existingInvite = await prisma.teamInvite.findUnique({
      where: { companyId_email: { companyId: dbUser.companyId, email } }
    });

    let invite;
    if (existingInvite) {
      // Resend - update token and expiry
      invite = await prisma.teamInvite.update({
        where: { id: existingInvite.id },
        data: {
          name: name || null,
          role,
          expiresAt: new Date(Date.now() + 7 * 86400000),
          status: "PENDING",
          invitedById: dbUser.id,
        }
      });
    } else {
      invite = await prisma.teamInvite.create({
        data: {
          companyId: dbUser.companyId,
          email,
          name: name || null,
          role,
          invitedById: dbUser.id,
          expiresAt: new Date(Date.now() + 7 * 86400000),
        }
      });
    }

    // Send invite email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dsrt-ceos.vercel.app";
    const inviteUrl = `${appUrl}/auth/accept-invite?token=${invite.inviteToken}`;

    const html = emailTemplate({
      preheader: `${dbUser.name} invited you to join ${dbUser.company.name}`,
      heading: `You're invited to join ${dbUser.company.name}`,
      body: `
        <p>Hi ${name || "there"},</p>
        <p><strong>${dbUser.name}</strong> has invited you to join <strong>${dbUser.company.name}</strong> on DSRT CEOS as <strong>${role}</strong>.</p>
        <p>DSRT CEOS is a Construction Enterprise Operating System that helps manage tenders, projects, bills, and compliance â€” all in one place.</p>
        <div style="margin:20px 0;padding:16px;background:#0f172a;border:1px solid #f97316;border-radius:8px;">
          <p style="margin:0;color:#fb923c;font-size:13px;font-weight:600;">Your Role: ${role}</p>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Click the button below to accept and create your account.</p>
        </div>
        <p style="color:#94a3b8;font-size:12px;">This invitation expires in 7 days.</p>
      `,
      ctaText: "Accept Invitation",
      ctaUrl: inviteUrl,
    });

    const emailResult = await sendEmail({
      to: email,
      subject: `Invitation to join ${dbUser.company.name} on DSRT CEOS`,
      html,
    });

    return NextResponse.json({
      success: true,
      invite: { id: invite.id, email: invite.email, role: invite.role, expiresAt: invite.expiresAt },
      emailSent: emailResult.success,
      inviteUrl,
      message: emailResult.success
        ? `Invitation sent to ${email}`
        : `Invitation created but email failed. Share this link manually: ${inviteUrl}`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "OWNER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.teamInvite.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}