/**
 * Account emails (currently the password-reset code).
 *
 * Reuses the Resend transport from the community module so there is exactly one
 * place that talks to the provider. `sendEmail` never throws; it reports
 * `{ delivered, reason }` and the caller decides what the user sees.
 */

import { sendEmail } from '../community/community.email.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const shell = (bodyHtml) => `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;">
    <p style="margin:0 0 20px;font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#26a69a;">StudyBridge Account</p>
    ${bodyHtml}
    <p style="margin:28px 0 0;font-size:12px;color:#64748b;">StudyBridge · Helping students find their way abroad.</p>
  </div>
</body></html>`;

/**
 * Sends the 6-digit password-reset code.
 * @param {{ to: string, name?: string, code: string, minutes: number }} params
 */
export async function sendPasswordResetEmail({ to, name, code, minutes }) {
  const firstName = String(name || 'there').trim().split(/\s+/)[0] || 'there';
  const text = `Hi ${firstName},

Your StudyBridge verification code is:

  ${code}

Enter it on the "Forgot password" screen. It expires in ${minutes} minutes and can only be used once.

If you did not ask to reset your password, you can ignore this email — your password has not changed.`;

  return sendEmail({
    to,
    subject: `${code} is your StudyBridge verification code`,
    text,
    html: shell(`
      <h1 style="margin:0 0 12px;font-size:20px;color:#1a2b48;">Here is your code</h1>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">Hi ${escapeHtml(firstName)}, use this code to verify it is you:</p>
      <p style="margin:0 0 18px;text-align:center;">
        <span style="display:inline-block;background:#f5f8ff;border:1px solid #dbe4f3;border-radius:14px;padding:14px 22px;font-size:30px;font-weight:800;letter-spacing:0.32em;color:#1a2b48;">${escapeHtml(code)}</span>
      </p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">The code expires in ${minutes} minutes and works once. After verifying you can set a new password, or simply continue to the site.</p>
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">Didn't ask for this? Ignore this email — your password stays exactly as it is.</p>
    `),
  });
}
