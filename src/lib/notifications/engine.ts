import prisma from "@/lib/prisma";
import { sendEmail, emailTemplate } from "@/lib/email/service";

interface NotificationCheck {
  type: string;
  count: number;
  items: any[];
}

export async function checkUserNotifications(companyId: string, userEmail: string): Promise<NotificationCheck[]> {
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 86400000);
  const in7Days = new Date(now.getTime() + 7 * 86400000);
  const in30Days = new Date(now.getTime() + 30 * 86400000);

  const notifications: NotificationCheck[] = [];

  // 1. Tender deadlines approaching
  const urgentTenders = await prisma.tender.findMany({
    where: {
      uploadedById: companyId,
      isActive: true,
      lastSubmissionDate: { gte: now, lte: in3Days },
      tracks: { some: { companyId, status: { in: ["DISCOVERED", "SHORTLISTED", "PREPARING"] } } }
    },
    select: { id: true, workName: true, lastSubmissionDate: true, emdAmount: true, department: true }
  });

  if (urgentTenders.length > 0) {
    notifications.push({ type: "TENDER_DEADLINE", count: urgentTenders.length, items: urgentTenders });
  }

  // 2. Documents expiring
  const expiringDocs = await prisma.companyDocument.findMany({
    where: {
      companyId, isLatest: true, isExpired: false,
      expiryDate: { gte: now, lte: in30Days }
    },
    select: { id: true, name: true, category: true, expiryDate: true }
  });

  if (expiringDocs.length > 0) {
    notifications.push({ type: "DOC_EXPIRING", count: expiringDocs.length, items: expiringDocs });
  }

  // 3. Registrations expiring
  const expiringRegs = await prisma.contractorRegistration.findMany({
    where: {
      companyId,
      validUntil: { gte: now, lte: in30Days }
    },
    select: { id: true, department: true, registrationNo: true, validUntil: true }
  });

  if (expiringRegs.length > 0) {
    notifications.push({ type: "REG_EXPIRING", count: expiringRegs.length, items: expiringRegs });
  }

  // 4. Pending bill payments (over 30 days old)
  const oldPendingBills = await prisma.rABill.findMany({
    where: {
      project: { companyId },
      status: { in: ["SUBMITTED", "UNDER_CHECK", "PASSED"] },
      submittedDate: { lte: new Date(now.getTime() - 30 * 86400000) }
    },
    select: { id: true, billNumber: true, netPayable: true, submittedDate: true, project: { select: { name: true } } }
  });

  if (oldPendingBills.length > 0) {
    notifications.push({ type: "PAYMENT_OVERDUE", count: oldPendingBills.length, items: oldPendingBills });
  }

  return notifications;
}

export async function sendDeadlineAlertEmail(userEmail: string, companyName: string, tenders: any[]) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dsrt-ceos.vercel.app";

  const tenderList = tenders.map(t => {
    const days = Math.ceil((new Date(t.lastSubmissionDate).getTime() - Date.now()) / 86400000);
    return `<div style="padding:12px;background:#0f172a;border:1px solid #334155;border-radius:8px;margin-bottom:8px;">
      <p style="margin:0 0 4px;color:#fff;font-weight:600;font-size:14px;">${t.workName}</p>
      <p style="margin:0;color:#94a3b8;font-size:12px;">${t.department || "Unknown Dept"}</p>
      <p style="margin:4px 0 0;color:${days <= 1 ? '#ef4444' : '#fbbf24'};font-weight:600;font-size:13px;">⏰ ${days} day${days !== 1 ? 's' : ''} left</p>
    </div>`;
  }).join("");

  const html = emailTemplate({
    preheader: `${tenders.length} tender${tenders.length > 1 ? 's' : ''} closing soon`,
    heading: "Urgent: Tender Deadlines Approaching",
    body: `<p>Hello ${companyName},</p>
    <p>You have <strong>${tenders.length} tender${tenders.length > 1 ? 's' : ''}</strong> closing within 3 days that need your attention:</p>
    <div style="margin:16px 0;">${tenderList}</div>
    <p>Open DSRT CEOS to review and prepare your submissions.</p>`,
    ctaText: "View Tenders →",
    ctaUrl: `${appUrl}/dashboard/tenders`,
  });

  return sendEmail({
    to: userEmail,
    subject: `⏰ ${tenders.length} Tender${tenders.length > 1 ? 's' : ''} Closing Within 3 Days`,
    html,
  });
}

export async function sendDocExpiryEmail(userEmail: string, companyName: string, docs: any[]) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dsrt-ceos.vercel.app";

  const docList = docs.map(d => {
    const days = Math.ceil((new Date(d.expiryDate).getTime() - Date.now()) / 86400000);
    return `<div style="padding:12px;background:#0f172a;border:1px solid #334155;border-radius:8px;margin-bottom:8px;">
      <p style="margin:0 0 4px;color:#fff;font-weight:600;font-size:14px;">${d.name}</p>
      <p style="margin:0;color:#94a3b8;font-size:12px;">Category: ${d.category}</p>
      <p style="margin:4px 0 0;color:${days <= 7 ? '#ef4444' : '#fbbf24'};font-weight:600;font-size:13px;">Expires in ${days} day${days !== 1 ? 's' : ''}</p>
    </div>`;
  }).join("");

  const html = emailTemplate({
    preheader: `${docs.length} document${docs.length > 1 ? 's' : ''} expiring soon`,
    heading: "Documents Expiring Soon",
    body: `<p>Hello ${companyName},</p>
    <p>The following <strong>${docs.length} document${docs.length > 1 ? 's' : ''}</strong> will expire within 30 days:</p>
    <div style="margin:16px 0;">${docList}</div>
    <p>Please renew them to avoid disruptions in tender submissions.</p>`,
    ctaText: "View Documents →",
    ctaUrl: `${appUrl}/dashboard/documents`,
  });

  return sendEmail({
    to: userEmail,
    subject: `📋 ${docs.length} Document${docs.length > 1 ? 's' : ''} Expiring Soon`,
    html,
  });
}