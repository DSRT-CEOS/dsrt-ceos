import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { checkUserNotifications, sendDeadlineAlertEmail, sendDocExpiryEmail } from "@/lib/notifications/engine";

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

    const notifications = await checkUserNotifications(dbUser.companyId, dbUser.email);
    const results: any[] = [];

    for (const notif of notifications) {
      if (notif.type === "TENDER_DEADLINE" && notif.items.length > 0) {
        const r = await sendDeadlineAlertEmail(dbUser.email, dbUser.company.name, notif.items);
        results.push({ type: notif.type, ...r });
      }
      if (notif.type === "DOC_EXPIRING" && notif.items.length > 0) {
        const r = await sendDocExpiryEmail(dbUser.email, dbUser.company.name, notif.items);
        results.push({ type: notif.type, ...r });
      }
    }

    const sent = results.filter(r => r.success).length;
    return NextResponse.json({
      success: true,
      message: sent > 0 ? `Sent ${sent} email notification${sent > 1 ? 's' : ''}` : "No notifications to send",
      results
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Err";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}