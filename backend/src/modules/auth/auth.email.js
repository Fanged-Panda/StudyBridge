/**
 * Account emails (password-reset code).
 *
 * Sends the 6-digit password-reset code over SMTP (see services/mailer.js for
 * the SMTP_* variables). `sendPasswordResetEmail` never throws: callers decide
 * how to report a failed send. Returns { delivered, reason }.
 */

import { escapeHtml, isSmtpConfigured, sendSmtpMail } from '../../services/mailer.js';

export async function sendPasswordResetEmail({ to, name, code, minutes }) {
  const firstName = String(name || 'there').trim().split(/\s+/)[0] || 'there';

  const text = `Hi ${firstName},\n\nYour StudyBridge verification code is:\n\n  ${code}\n\nEnter it on the "Forgot password" screen. It expires in ${minutes} minutes and can only be used once.\n\nIf you did not ask to reset your password, you can ignore this email — your password has not changed.`;

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;">
    <p style="margin:0 0 20px;font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#26a69a;">StudyBridge Account</p>
    <h1 style="margin:0 0 12px;font-size:20px;color:#1a2b48;">Here is your code</h1>
    <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">Hi ${escapeHtml(firstName)}, use this code to verify it is you:</p>
    <p style="margin:0 0 18px;text-align:center;">
      <span style="display:inline-block;background:#f5f8ff;border:1px solid #dbe4f3;border-radius:14px;padding:14px 22px;font-size:30px;font-weight:800;letter-spacing:0.32em;color:#1a2b48;">${escapeHtml(code)}</span>
    </p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">The code expires in ${minutes} minutes and works once. After verifying you can set a new password, or simply continue to the site.</p>
    <p style="margin:0;font-size:13px;line-height:1.6;">Didn't ask for this? Ignore this email — your password stays exactly as it is.</p>
  </div>
</body></html>`;

  if (!isSmtpConfigured()) {
    console.info('[auth] password reset email not sent (SMTP_HOST/SMTP_USER/SMTP_PASS missing)');
    console.info(`  to: ${to}\n  code: ${code}`);
    return { delivered: false, reason: 'smtp_not_configured' };
  }

  const result = await sendSmtpMail({
    to,
    subject: `${code} is your StudyBridge verification code`,
    text,
    html,
  });

  if (!result.delivered) {
    console.warn('[auth] password reset email failed:', result.reason);
  }

  return result;
}
