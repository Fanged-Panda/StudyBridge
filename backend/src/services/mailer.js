/**
 * Shared Gmail API transport for all outbound mail.
 *
 * `sendGmailMail` never throws: it resolves with { delivered, reason } so the
 * caller can decide what to tell the user.
 */

import { google } from 'googleapis';

const text = (value) => String(value ?? '').trim();

function gmailSettings() {
  return {
    clientId: text(process.env.GMAIL_CLIENT_ID),
    clientSecret: text(process.env.GMAIL_CLIENT_SECRET),
    refreshToken: text(process.env.GMAIL_REFRESH_TOKEN),
    user: text(process.env.GMAIL_USER),
    from: text(process.env.GMAIL_FROM) || `StudyBridge <${text(process.env.GMAIL_USER)}>`,
    disabled: text(process.env.USE_GMAIL).toLowerCase() === 'false',
  };
}

export function isGmailConfigured() {
  const { clientId, clientSecret, refreshToken, user, disabled } = gmailSettings();
  return Boolean(clientId && clientSecret && refreshToken && user && !disabled);
}

let gmail = null;
let gmailKey = '';

function getGmailClient() {
  if (!isGmailConfigured()) return null;

  const settings = gmailSettings();
  const key = [settings.clientId, settings.clientSecret, settings.refreshToken, settings.user].join('|');

  if (!gmail || gmailKey !== key) {
    const auth = new google.auth.OAuth2(settings.clientId, settings.clientSecret);
    auth.setCredentials({ refresh_token: settings.refreshToken });
    gmail = google.gmail({ version: 'v1', auth });
    gmailKey = key;
  }

  return gmail;
}

function encodeHeader(value) {
  const safeValue = text(value).replace(/[\r\n]+/g, ' ');
  if (/^[\x20-\x7e]*$/.test(safeValue)) return safeValue;
  return `=?UTF-8?B?${Buffer.from(safeValue, 'utf8').toString('base64')}?=`;
}

function rawMessage({ to, subject, text: plainText, html, replyTo, from }) {
  const boundary = `=_StudyBridge_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  const headers = [
    `From: ${encodeHeader(from)}`,
    `To: ${encodeHeader(to)}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ...(replyTo ? [`Reply-To: ${encodeHeader(replyTo)}`] : []),
  ];
  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    String(plainText ?? ''),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    String(html ?? ''),
    `--${boundary}--`,
    '',
  ].join('\r\n');
  return `${headers.join('\r\n')}\r\n\r\n${body}`;
}

export async function sendGmailMail({ to, subject, text: plainText, html, replyTo }) {
  const client = getGmailClient();
  if (!client) {
    return { delivered: false, reason: 'gmail_not_configured' };
  }

  const { from, user } = gmailSettings();
  const raw = Buffer.from(rawMessage({ to, subject, text: plainText, html, replyTo, from }))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const response = await client.users.messages.send({
      userId: user,
      requestBody: { raw },
    });
    return { delivered: true, reason: 'gmail_ok', id: response.data?.id || null };
  } catch (error) {
    const message = error?.message || 'unknown error';
    console.error('[mail] Gmail API send failed:', error?.code || '', message);

    const status = error?.response?.status || error?.code;
    return {
      delivered: false,
      reason: status === 400 && /recipient|email/i.test(message) ? 'invalid_recipient' : 'gmail_error',
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
