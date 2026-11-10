/**
 * Shared SMTP transport for all outbound mail.
 *
 * Configuration comes from the environment:
 *   SMTP_HOST   required  e.g. smtp.gmail.com
 *   SMTP_PORT   optional  defaults to 587 (use 465 with SMTP_SECURE=true)
 *   SMTP_SECURE optional  "true" for implicit TLS; defaults to port === 465
 *   SMTP_USER   required  mailbox / login
 *   SMTP_PASS   required  password or app password
 *   SMTP_FROM   optional  visible sender; defaults to "StudyBridge <SMTP_USER>"
 *   USE_SMTP    optional  set to "false" to disable sending entirely
 *
 * `sendSmtpMail` never throws: it resolves with { delivered, reason } so the
 * caller can decide what to tell the user.
 */

import nodemailer from 'nodemailer';

const text = (value) => String(value ?? '').trim();

function smtpSettings() {
  const port = Number(text(process.env.SMTP_PORT) || 587);
  const secureFlag = text(process.env.SMTP_SECURE).toLowerCase();
  return {
    host: text(process.env.SMTP_HOST),
    port,
    secure: secureFlag ? secureFlag === 'true' : port === 465,
    user: text(process.env.SMTP_USER),
    pass: process.env.SMTP_PASS ?? '',
    from: text(process.env.SMTP_FROM) || `StudyBridge <${text(process.env.SMTP_USER)}>`,
    disabled: text(process.env.USE_SMTP).toLowerCase() === 'false',
  };
}

export function isSmtpConfigured() {
  const { host, user, pass, disabled } = smtpSettings();
  return Boolean(host && user && pass && !disabled);
}

let transporter = null;
let transporterKey = '';

function getTransporter() {
  if (!isSmtpConfigured()) return null;

  const settings = smtpSettings();
  const key = [settings.host, settings.port, settings.secure, settings.user, settings.pass].join('|');

  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth: { user: settings.user, pass: settings.pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    transporterKey = key;
  }

  return transporter;
}

export async function sendSmtpMail({ to, subject, text: plainText, html, replyTo }) {
  const transport = getTransporter();
  if (!transport) {
    return { delivered: false, reason: 'smtp_not_configured' };
  }

  const { from } = smtpSettings();

  try {
    const info = await transport.sendMail({
      from,
      to,
      subject,
      text: plainText,
      html,
      ...(replyTo ? { replyTo } : {}),
    });
    return { delivered: true, reason: 'smtp_ok', id: info?.messageId || null };
  } catch (error) {
    const message = error?.message || 'unknown error';
    console.error('[mail] SMTP send failed:', error?.code || '', message);

    const rejected =
      error?.responseCode === 550 ||
      error?.responseCode === 553 ||
      /recipient|mailbox|user unknown/i.test(message);
    return {
      delivered: false,
      reason: rejected ? 'invalid_recipient' : 'smtp_error',
      detail: message,
    };
  }
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
