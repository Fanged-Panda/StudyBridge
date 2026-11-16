import crypto from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import prisma from '../config/database.js';

const syncTrigger = new AsyncLocalStorage();

/** Marks whether the current sync was started manually or by a scheduled worker. */
export const runWithSyncTrigger = (trigger, fn) => syncTrigger.run(trigger, fn);

/**
 * Centralised, application-level Gemini accounting.
 *
 * Google does not expose a reliable remaining free-tier quota through the
 * Gemini SDK, so these counters are deliberately conservative limits chosen by
 * StudyBridge. They are shared by every API key in this deployment because
 * keys from the same Google project commonly share one quota.
 */

export class GeminiQuotaError extends Error {
  constructor(message, { circuitOpen = false } = {}) {
    super(message);
    this.name = 'GeminiQuotaError';
    this.code = 'GEMINI_QUOTA_EXHAUSTED';
    this.circuitOpen = circuitOpen;
  }
}

export class GeminiBusyError extends Error {
  constructor(message = 'Another Gemini synchronization request is in progress.') {
    super(message);
    this.name = 'GeminiBusyError';
    this.code = 'GEMINI_SYNC_BUSY';
  }
}

const envInt = (name, fallback, min, max) => {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.round(value), min), max);
};

const envBool = (name, fallback = true) => {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return !['false', '0', 'no', 'off'].includes(String(value).toLowerCase());
};

export const geminiConfig = () => ({
  chatEnabled: envBool('GEMINI_CHAT_ENABLED', true),
  syncEnabled: envBool('GEMINI_SYNC_ENABLED', true),
  dailySyncLimit: envInt('GEMINI_SYNC_DAILY_LIMIT', 10, 0, 1000),
  maxConcurrentSync: envInt('GEMINI_SYNC_MAX_CONCURRENT', 1, 1, 5),
  priority: (process.env.GEMINI_SYNC_PRIORITY || 'low').toLowerCase(),
  circuitOpenMinutes: envInt('GEMINI_CIRCUIT_OPEN_MINUTES', 60, 5, 1440),
  maxRetries: envInt('GEMINI_SYNC_MAX_RETRIES', 1, 0, 3),
  retryBaseMs: envInt('GEMINI_SYNC_RETRY_BASE_MS', 750, 100, 10000),
});

export const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);

const ownerId = () => `${process.pid}-${crypto.randomBytes(5).toString('hex')}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Database-backed mutual exclusion, safe across Render instances. */
export const acquireLock = async (key, ttlMs) => {
  const owner = ownerId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs);

  try {
    // Delete an expired lock and create the new one without wrapping both in
    // an interactive transaction. The unique key makes the create atomic, and
    // avoids long Neon transaction timeouts during concurrent cron runs.
    await prisma.syncLock.deleteMany({ where: { key, expiresAt: { lt: now } } });
    await prisma.syncLock.create({ data: { key, owner, expiresAt } });
    return owner;
  } catch (error) {
    // P2002: another instance acquired the lock. P2028 can occur under a
    // transient database contention; caller retries through waitMs.
    if (error?.code === 'P2002' || error?.code === 'P2028') return null;
    throw error;
  }
};

export const releaseLock = async (key, owner) => {
  if (!owner) return;
  await prisma.syncLock.deleteMany({ where: { key, owner } }).catch((error) => {
    console.warn('[SyncLock] Failed to release lock:', error?.message);
  });
};

export const withDbLock = async (key, fn, { ttlMs = 5 * 60 * 1000, waitMs = 0 } = {}) => {
  const deadline = Date.now() + waitMs;
  let owner = await acquireLock(key, ttlMs);

  while (!owner && Date.now() < deadline) {
    await sleep(250);
    owner = await acquireLock(key, ttlMs);
  }

  if (!owner) {
    throw new GeminiBusyError(`Lock "${key}" is already held by another synchronization process.`);
  }

  try {
    return await fn();
  } finally {
    await releaseLock(key, owner);
  }
};

export const isQuotaError = (error) => {
  if (!error) return false;
  if (error instanceof GeminiQuotaError) return true;
  if (error.status === 429 || error.code === 429) return true;
  const message = String(error.message || '');
  return /RESOURCE_EXHAUSTED|quota|rate limit|too many requests|429/i.test(message);
};

const quotaRow = async (day = dayKey()) =>
  prisma.geminiUsageDaily.upsert({
    where: { day },
    create: { day },
    update: {},
  });

const circuitIsOpen = (row) =>
  Boolean(row?.circuitOpenUntil && new Date(row.circuitOpenUntil).getTime() > Date.now());

const markQuotaError = async () => {
  const config = geminiConfig();
  const until = new Date(Date.now() + config.circuitOpenMinutes * 60 * 1000);
  await quotaRow()
    .then((row) =>
      prisma.geminiUsageDaily.update({
        where: { day: row.day },
        data: {
          quotaErrors: { increment: 1 },
          lastQuotaErrorAt: new Date(),
          circuitOpenUntil: until,
        },
      }),
    )
    .catch((error) => console.warn('[Gemini Quota] Could not record quota error:', error?.message));
  return until;
};

/**
 * Runs one synchronization Gemini request. Chatbot requests deliberately do
 * not use this path, so they are never blocked by the sync budget or circuit.
 */
export const runGeminiSyncCall = async ({ purpose = 'scholarship' } = {}, fn) => {
  const config = geminiConfig();

  if (!config.syncEnabled) {
    throw new GeminiQuotaError('Synchronization Gemini requests are disabled by GEMINI_SYNC_ENABLED.');
  }
  if (syncTrigger.getStore() === 'scheduled' && process.env.GEMINI_AUTO_SYNC_ENABLED !== 'true') {
    throw new GeminiQuotaError('Automatic Gemini syncs are disabled; use a manual sync.');
  }

  // Keep the slot short: it covers only the API call, not the webpage fetch.
  return withDbLock(
    'gemini-sync-slot',
    async () => {
      const current = await quotaRow();

      const data = { syncRequests: { increment: 1 } };
      if (purpose === 'admission') data.admissionRequests = { increment: 1 };
      else data.scholarshipRequests = { increment: 1 };

      await prisma.geminiUsageDaily.update({ where: { day: current.day }, data });

      try {
        return await fn();
      } catch (error) {
        if (isQuotaError(error)) await markQuotaError();
        throw error;
      }
    },
    { ttlMs: 2 * 60 * 1000, waitMs: 8000 },
  );
};

/** Records chatbot use without applying the sync budget or circuit breaker. */
export const recordChatUsage = async ({ quotaError = false } = {}) => {
  const config = geminiConfig();
  if (!config.chatEnabled) return;

  try {
    const row = await quotaRow();
    await prisma.geminiUsageDaily.update({
      where: { day: row.day },
      data: {
        chatRequests: { increment: 1 },
        ...(quotaError
          ? {
              quotaErrors: { increment: 1 },
              lastQuotaErrorAt: new Date(),
              // A chatbot 429 is evidence that the shared project quota is
              // exhausted, so pause sync extraction too.
              circuitOpenUntil: new Date(
                Date.now() + geminiConfig().circuitOpenMinutes * 60 * 1000,
              ),
            }
          : {}),
      },
    });
  } catch (error) {
    // Accounting must never take down the student-facing chatbot.
    console.warn('[Gemini Quota] Could not record chatbot usage:', error?.message);
  }
};

export const recordChatQuotaError = async () => {
  await recordChatUsage({ quotaError: true });
};

export const getGeminiUsage = async () => {
  const config = geminiConfig();
  const row = await quotaRow();
  const remaining = Math.max(0, config.dailySyncLimit - row.syncRequests);

  return {
    day: row.day,
    configuredDailySyncBudget: config.dailySyncLimit,
    remainingSyncBudget: remaining,
    syncRequests: row.syncRequests,
    chatRequests: row.chatRequests,
    admissionRequests: row.admissionRequests,
    scholarshipRequests: row.scholarshipRequests,
    quotaErrors: row.quotaErrors,
    lastQuotaErrorAt: row.lastQuotaErrorAt,
    circuitOpenUntil: row.circuitOpenUntil,
    circuitOpen: circuitIsOpen(row),
    chatEnabled: config.chatEnabled,
    syncEnabled: config.syncEnabled,
    maxConcurrentSync: config.maxConcurrentSync,
    priority: config.priority,
    note: 'Application-level accounting only; not an official Google quota figure.',
  };
};
