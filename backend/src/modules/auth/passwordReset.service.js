/**
 * "Forgot password" via a one-time code emailed to the account address.
 *
 * Flow:
 *   1. requestPasswordReset  → emails a 6-digit code (10 minutes, single use)
 *   2. verifyPasswordResetCode → checks the code, returns a short-lived
 *      resetToken *and* a normal session (so the member can simply enter the
 *      site without changing their password)
 *   3. resetPassword → consumes the resetToken and stores the new password
 *
 * Only a bcrypt hash of the code is stored; attempts are capped so a 6-digit
 * code can not be brute-forced.
 */

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database.js';
import { publicUser, signToken } from './auth.service.js';
import { sendPasswordResetEmail } from './auth.email.js';
// The community limiter is a generic in-memory sliding window; reuse it so all
// public form endpoints share one implementation.
import { hit } from '../community/community.rateLimit.js';

export const CODE_TTL_MINUTES = 10;
const CODE_MAX_ATTEMPTS = 5;
const RESET_TOKEN_TTL = '15m';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GENERIC_MESSAGE =
  'If that email belongs to a StudyBridge account, a 6-digit code is on its way.';

const normalizeEmail = (value) => String(value || '').toLowerCase().trim();

function generateCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export const requestPasswordReset = async ({ email, ip } = {}) => {
  const normalizedEmail = normalizeEmail(email);

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return { status: 400, body: { message: 'Please enter a valid email address.' } };
  }

  const perEmail = hit(`auth:forgot:email:${normalizedEmail}`, 3, 15 * 60 * 1000);
  if (!perEmail.allowed) {
    return {
      status: 429,
      body: {
        message: `Too many codes requested for this email. Try again in ${Math.ceil(perEmail.retryAfterSeconds / 60)} minute(s).`,
      },
    };
  }

  const perIp = hit(`auth:forgot:ip:${ip || 'unknown'}`, 10, 15 * 60 * 1000);
  if (!perIp.allowed) {
    return {
      status: 429,
      body: { message: 'Too many requests. Please wait a few minutes and try again.' },
    };
  }

  try {
    const student = await prisma.student.findUnique({ where: { email: normalizedEmail } });

    // Same response either way: never reveal which addresses have an account.
    if (!student) {
      return {
        status: 200,
        body: { success: true, message: GENERIC_MESSAGE, expiresInMinutes: CODE_TTL_MINUTES },
      };
    }

    // Invalidate every earlier code for this address — only the newest works.
    await prisma.passwordResetCode.deleteMany({
      where: { email: normalizedEmail, consumedAt: null },
    });

    const code = generateCode();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    const record = await prisma.passwordResetCode.create({
      data: { email: normalizedEmail, codeHash, expiresAt },
    });

    const delivery = await sendPasswordResetEmail({
      to: normalizedEmail,
      name: student.name,
      code,
      minutes: CODE_TTL_MINUTES,
    });

    if (!delivery.delivered) {
      await prisma.passwordResetCode.delete({ where: { id: record.id } }).catch(() => {});
      return {
        status: 502,
        body: {
          message: 'We could not send the email just now. Please try again in a minute.',
          reason: delivery.reason,
        },
      };
    }

    return {
      status: 200,
      body: {
        success: true,
        message: GENERIC_MESSAGE,
        email: normalizedEmail,
        expiresInMinutes: CODE_TTL_MINUTES,
      },
    };
  } catch (err) {
    console.error('Password reset request error:', err);
    return { status: 500, body: { message: 'Something went wrong. Please try again.' } };
  }
};

export const verifyPasswordResetCode = async ({ email, code } = {}) => {
  const normalizedEmail = normalizeEmail(email);
  const submitted = String(code || '').replace(/\s+/g, '');

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return { status: 400, body: { message: 'Please enter a valid email address.' } };
  }
  if (!/^\d{6}$/.test(submitted)) {
    return { status: 400, body: { message: 'Enter the 6-digit code from the email.' } };
  }

  const perIp = hit(`auth:verify:${normalizedEmail}`, 15, 15 * 60 * 1000);
  if (!perIp.allowed) {
    return {
      status: 429,
      body: { message: 'Too many attempts. Please request a new code in a few minutes.' },
    };
  }

  try {
    const record = await prisma.passwordResetCode.findFirst({
      where: { email: normalizedEmail, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return {
        status: 400,
        body: { message: 'That code has expired. Please request a new one.' },
      };
    }

    if (record.attempts >= CODE_MAX_ATTEMPTS) {
      return { status: 429, body: { message: 'Too many tries for this code. Please request a new one.' } };
    }

    const matches = await bcrypt.compare(submitted, record.codeHash);

    if (!matches) {
      const updated = await prisma.passwordResetCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      const left = Math.max(0, CODE_MAX_ATTEMPTS - updated.attempts);
      return {
        status: 400,
        body: {
          message: left > 0 ? `That code is not right. ${left} attempt(s) left.` : 'Too many tries. Please request a new code.',
          attemptsLeft: left,
        },
      };
    }

    const student = await prisma.student.findUnique({ where: { email: normalizedEmail } });
    if (!student) {
      return { status: 400, body: { message: 'That code has expired. Please request a new one.' } };
    }

    await prisma.passwordResetCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });

    // Short-lived proof that this person owns the inbox, used only for the
    // optional "set a new password" step.
    const resetToken = jwt.sign(
      { id: student.id, email: student.email, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: RESET_TOKEN_TTL },
    );

    return {
      status: 200,
      body: {
        success: true,
        message: 'Code verified. You are signed in.',
        resetToken,
        token: signToken(student),
        user: publicUser(student),
      },
    };
  } catch (err) {
    console.error('Password reset verify error:', err);
    return { status: 500, body: { message: 'Something went wrong. Please try again.' } };
  }
};

export const resetPassword = async ({ resetToken, password } = {}) => {
  if (typeof password !== 'string' || password.length < 6) {
    return { status: 400, body: { message: 'Password must be at least 6 characters long.' } };
  }
  // bcrypt only reads the first 72 bytes, so reject longer input instead of
  // silently accepting a truncated password.
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return { status: 400, body: { message: 'Password must be 72 characters or fewer.' } };
  }
  if (!resetToken) {
    return { status: 401, body: { message: 'Verify your email code first.' } };
  }

  let payload;
  try {
    payload = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch {
    return { status: 401, body: { message: 'That verification expired. Please request a new code.' } };
  }

  if (payload?.purpose !== 'password_reset' || !payload?.id) {
    return { status: 401, body: { message: 'That verification is not valid for a password change.' } };
  }

  try {
    const student = await prisma.student.findUnique({ where: { id: payload.id } });
    if (!student) {
      return { status: 404, body: { message: 'User not found.' } };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const updated = await prisma.student.update({
      where: { id: student.id },
      data: { password: hashedPassword },
    });

    // Any other outstanding codes for this address are now moot.
    await prisma.passwordResetCode.deleteMany({ where: { email: student.email, consumedAt: null } });

    return {
      status: 200,
      body: {
        success: true,
        message: 'Your password has been updated.',
        token: signToken(updated),
        user: publicUser(updated),
      },
    };
  } catch (err) {
    console.error('Password reset error:', err);
    return { status: 500, body: { message: 'Something went wrong. Please try again.' } };
  }
};
