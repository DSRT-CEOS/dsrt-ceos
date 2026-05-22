import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.EMAIL_FROM || "onboarding@resend.dev";

export interface EmailData {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(data: EmailData): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("Resend API key not configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const result = await resend.emails.send({
      from: `DSRT CEOS <${FROM_EMAIL}>`,
      to: data.to,
      subject: data.subject,
      html: data.html,
    });

    if (result.error) {
      console.error("Resend error:", result.error);
      return { success: false, error: result.error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("Email send error:", err);
    return { success: false, error: err.message };
  }
}

export function emailTemplate(opts: {
  preheader?: string;
  heading: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footer?: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dsrt-ceos.vercel.app";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${opts.heading}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;color:#f1f5f9;">
  ${opts.preheader ? `<div style="display:none;font-size:1px;color:#0f172a;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${opts.preheader}</div>` : ""}
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#0f172a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;background:#1e293b;border:1px solid #334155;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:24px;background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);text-align:center;">
              <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">DSRT CEOS</h1>
              <p style="margin:4px 0 0;color:#fff;opacity:0.9;font-size:13px;">Construction Enterprise OS</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 24px;">
              <h2 style="margin:0 0 16px;color:#fff;font-size:20px;font-weight:600;">${opts.heading}</h2>
              <div style="color:#cbd5e1;font-size:14px;line-height:1.6;">${opts.body}</div>
              ${opts.ctaUrl && opts.ctaText ? `
              <div style="margin:24px 0;text-align:center;">
                <a href="${opts.ctaUrl}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">${opts.ctaText}</a>
              </div>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#0f172a;border-top:1px solid #334155;">
              <p style="margin:0;color:#64748b;font-size:12px;text-align:center;">${opts.footer || `Sent by DSRT CEOS · <a href="${appUrl}" style="color:#f97316;text-decoration:none;">Visit Dashboard</a>`}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}