/**
 * Outbound email for the community module.
 *
 * Sends over SMTP (see services/mailer.js for the SMTP_* variables). When SMTP
 * is not configured the message is logged instead of sent, so local
 * development still walks through the whole flow without a real inbox.
 */

import { escapeHtml, isSmtpConfigured, sendSmtpMail } from '../../services/mailer.js';

export function appUrl() {
  const raw = process.env.PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:5173';
  return raw.replace(/\/+$/, '');
}

export function isEmailConfigured() {
  return isSmtpConfigured();
}

function wrapHtml(bodyHtml) {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;">
    <p style="margin:0 0 20px;font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#26a69a;">StudyBridge Community</p>
    ${bodyHtml}
    <p style="margin:28px 0 0;font-size:12px;color:#64748b;">StudyBridge · Your email stays private. Others can only contact you through the site.</p>
  </div>
</body></html>`;
}

/**
 * Send one email. Never throws: callers decide how to report a failed send.
 */
export async function sendEmail({ to, subject, text, html, replyTo }) {
  const messageHtml =
    html || wrapHtml(`<pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;">${escapeHtml(text)}</pre>`);

  if (!isEmailConfigured()) {
    console.info('[community] email not sent (SMTP_HOST/SMTP_USER/SMTP_PASS missing)');
    console.info(`  to: ${to}\n  subject: ${subject}\n  ${String(text).split('\n').join('\n  ')}`);
    return { delivered: false, reason: 'not_configured' };
  }

  return sendSmtpMail({ to, subject, text, html: messageHtml, replyTo });
}

export async function sendContactEmail({ journey, senderName, senderEmail, message }) {
  const text = `Hi ${journey.authorName},

${senderName} (${senderEmail}) read your StudyBridge journey "${journey.title}" and would like to connect.

--- message ---
${message}
---------------

Reply to this email to answer ${senderName} directly. They do not see your email address unless you reply.`;

  return sendEmail({
    to: journey.authorEmail,
    subject: `${senderName} wants to connect about "${journey.title}"`,
    text,
    replyTo: senderEmail,
    html: wrapHtml(`
      <p style="margin:0 0 12px;font-size:16px;">Hi ${escapeHtml(journey.authorName)},</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        <strong>${escapeHtml(senderName)}</strong> read your journey
        <em>${escapeHtml(journey.title)}</em> on StudyBridge and would like to connect.
      </p>
      <div style="border-left:4px solid #26a69a;background:#f8fafc;border-radius:12px;padding:14px 16px;margin:0 0 16px;">
        <p style="margin:0;font-size:14px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(message)}</p>
      </div>
      <p style="margin:0 0 8px;font-size:14px;">Reply to this email to answer directly.</p>
      <p style="margin:0;font-size:13px;color:#64748b;">Sender email: ${escapeHtml(senderEmail)} · Your email is never shown on the site.</p>
    `),
  });
}

export async function sendMagicLinkEmail({ journey, link, kind = 'submitted' }) {
  const isApproved = kind === 'approved';
  const heading = isApproved ? 'Your journey is live 🎉' : 'We received your journey';
  const lead = isApproved
    ? `"${journey.title}" has been approved and is now published in the StudyBridge community.`
    : `Thanks for sharing "${journey.title}". A moderator reviews every story before it goes live.`;

  const text = `Hi ${journey.authorName},

${lead}

Use this private link to edit or delete your post at any time (valid for 7 days):
${link}

If you did not submit a journey, you can ignore this email.`;

  return sendEmail({
    to: journey.authorEmail,
    subject: `${heading} — ${journey.title}`,
    text,
    html: wrapHtml(`
      <h1 style="margin:0 0 12px;font-size:20px;color:#1a2b48;">${escapeHtml(heading)}</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.65;">${escapeHtml(lead)}</p>
      <p style="margin:0 0 20px;">
        <a href="${escapeHtml(link)}" style="display:inline-block;background:#1a2b48;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600;">
          Manage my journey
        </a>
      </p>
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
        Or paste this link into your browser:<br />${escapeHtml(link)}
      </p>
      <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">The link is valid for 7 days. If you did not submit a journey, ignore this email.</p>
    `),
  });
}
