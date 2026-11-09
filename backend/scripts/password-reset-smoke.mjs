/**
 * Manual smoke test for the "forgot password" OTP flow.
 * Usage: node scripts/password-reset-smoke.mjs [baseUrl]
 *
 * It registers a throwaway student, writes a deterministic code straight into
 * the database (so no real email is needed), and walks the whole flow:
 * request → wrong code → right code → (optional) new password → sign in.
 * All test data is deleted at the end.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import prisma from '../src/config/database.js';

const base = process.argv[2] || 'http://localhost:5002/api';
let pass = 0;
let fail = 0;

const check = (name, ok, extra = '') => {
  if (ok) pass += 1;
  else fail += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ` :: ${extra}` : ''}`);
};

const call = async (method, path, { body, token, ip } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (ip) headers['X-Forwarded-For'] = ip;
  const response = await fetch(base + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { status: response.status, body: json };
};

const stamp = Date.now();
const email = `otp-smoke-${stamp}@studybridge.test`;
const oldPassword = 'old-password-123';
const newPassword = 'new-password-456';
const ip = `10.9.${Math.floor(stamp / 1000) % 250}.${stamp % 250}`;

const seedCode = async (code) => {
  await prisma.passwordResetCode.deleteMany({ where: { email } });
  await prisma.passwordResetCode.create({
    data: {
      email,
      codeHash: await bcrypt.hash(code, 10),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
};

try {
  const created = await call('POST', '/auth/register', {
    body: { name: 'Otp Smoke', email, password: oldPassword, country: 'Bangladesh' },
  });
  check('registration works', created.status === 201, `status ${created.status}`);

  const unknown = await call('POST', '/auth/forgot-password', {
    body: { email: 'nobody-here@studybridge.test' },
    ip,
  });
  check('unknown email gets the same generic reply (no account enumeration)', unknown.status === 200);

  const badEmail = await call('POST', '/auth/forgot-password', { body: { email: 'not-an-email' }, ip });
  check('invalid email rejected', badEmail.status === 400, `status ${badEmail.status}`);

  // The throwaway @studybridge.test domain is undeliverable, so Resend refuses
  // it. The important behaviour is that the API says so instead of pretending.
  const requested = await call('POST', '/auth/forgot-password', { body: { email }, ip });
  check(
    'undeliverable address reports a clean failure',
    requested.status === 502 && Boolean(requested.body?.reason),
    `status ${requested.status} reason ${requested.body?.reason}`,
  );

  // Resend's own sink address proves the transport really sends.
  const sinkEmail = 'delivered@resend.dev';
  const sinkStudent = await prisma.student.findUnique({ where: { email: sinkEmail } });
  if (!sinkStudent) {
    await prisma.student.create({
      data: { name: 'Resend Sink', email: sinkEmail, password: await bcrypt.hash(newPassword, 10), country: 'Test' },
    });
    const sink = await call('POST', '/auth/forgot-password', { body: { email: sinkEmail }, ip });
    check('real send accepted by Resend', sink.status === 200 && sink.body?.success === true, `status ${sink.status} ${sink.body?.reason || ''}`);
    const sinkRow = await prisma.passwordResetCode.findFirst({
      where: { email: sinkEmail },
      orderBy: { createdAt: 'desc' },
    });
    check('code stored hashed (never plaintext)', Boolean(sinkRow) && /^\$2[aby]\$/.test(sinkRow.codeHash));
    await prisma.passwordResetCode.deleteMany({ where: { email: sinkEmail } });
    await prisma.student.delete({ where: { email: sinkEmail } });
  }

  const limited = [];
  for (let i = 0; i < 3; i += 1) {
    limited.push(await call('POST', '/auth/forgot-password', { body: { email }, ip }));
  }
  check(
    'requests are rate limited per email',
    limited.some((r) => r.status === 429),
    limited.map((r) => r.status).join(','),
  );

  await seedCode('123456');

  const wrong = await call('POST', '/auth/verify-otp', { body: { email, otp: '000000' }, ip });
  check('wrong code rejected', wrong.status === 400, wrong.body?.message);

  const shortCode = await call('POST', '/auth/verify-otp', { body: { email, otp: '12' }, ip });
  check('malformed code rejected', shortCode.status === 400);

  const verified = await call('POST', '/auth/verify-otp', { body: { email, otp: '123456' }, ip });
  check('correct code verifies', verified.status === 200 && Boolean(verified.body?.resetToken), `status ${verified.status}`);
  check('verifying alone signs the member in', Boolean(verified.body?.token) && verified.body?.user?.email === email);

  const reuse = await call('POST', '/auth/verify-otp', { body: { email, otp: '123456' }, ip });
  check('a code can not be reused', reuse.status === 400, reuse.body?.message);

  const shortPassword = await call('POST', '/auth/reset-password', {
    body: { resetToken: verified.body?.resetToken, password: '123' },
  });
  check('short password rejected', shortPassword.status === 400);

  const noToken = await call('POST', '/auth/reset-password', { body: { password: newPassword } });
  check('password change needs the verified reset token', noToken.status === 401);

  const forged = await call('POST', '/auth/reset-password', {
    body: { resetToken: `${verified.body?.resetToken}x`, password: newPassword },
  });
  check('tampered reset token rejected', forged.status === 401);

  const changed = await call('POST', '/auth/reset-password', {
    body: { resetToken: verified.body?.resetToken, password: newPassword },
  });
  check('new password accepted', changed.status === 200, changed.body?.message);

  const oldLogin = await call('POST', '/auth/login', { body: { email, password: oldPassword } });
  check('old password no longer works', oldLogin.status === 401);

  const newLogin = await call('POST', '/auth/login', { body: { email, password: newPassword } });
  check('new password signs in', newLogin.status === 200 && Boolean(newLogin.body?.token));

  const expired = await prisma.passwordResetCode.create({
    data: {
      email,
      codeHash: await bcrypt.hash('654321', 10),
      expiresAt: new Date(Date.now() - 60 * 1000),
    },
  });
  const expiredCheck = await call('POST', '/auth/verify-otp', { body: { email, otp: '654321' }, ip });
  check('expired code rejected', expiredCheck.status === 400, expiredCheck.body?.message);
  await prisma.passwordResetCode.delete({ where: { id: expired.id } }).catch(() => {});
} catch (error) {
  fail += 1;
  console.error('FAIL unexpected error ::', error?.message || error);
} finally {
  await prisma.passwordResetCode.deleteMany({ where: { email } });
  await prisma.student.deleteMany({ where: { email } });
  console.log(`\n${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}
