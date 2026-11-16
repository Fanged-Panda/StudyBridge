import prisma from '../config/database.js';
import { GeminiQuotaError, withDbLock } from './geminiQuota.js';

export const SYNC_JOB_TYPES = {
  UNIVERSITY_CATALOG: 'UNIVERSITY_CATALOG',
  UNIVERSITY: 'UNIVERSITY',
  ADMISSIONS: 'ADMISSIONS',
  SCHOLARSHIPS: 'SCHOLARSHIPS',
  SCHOLARSHIP: 'SCHOLARSHIP',
  SCHOLARSHIP_SOURCES: 'SCHOLARSHIP_SOURCES',
  SCHOLARSHIP_EXTRACTION: 'SCHOLARSHIP_EXTRACTION',
  SCHOLARSHIP_DEADLINES: 'SCHOLARSHIP_DEADLINES',
  PROFESSORS: 'PROFESSORS',
  RESEARCH_METRICS: 'RESEARCH_METRICS',
};

const normalizeCounts = (result = {}) => ({
  processed: Number(result.processed) || 0,
  created: Number(result.created) || 0,
  updated: Number(result.updated) || 0,
  unchanged: Number(result.unchanged) || 0,
  failed: Number(result.failed) || 0,
  skipped: Number(result.skipped) || 0,
  geminiRequests: Number(result.geminiRequests) || 0,
  error: result.error ? String(result.error).slice(0, 8000) : null,
  details: result.details ?? null,
});

const lockKeyFor = (type, targetId) => `sync-job:${type}:${targetId || 'all'}`;

export const createJob = async ({
  type,
  triggeredBy = 'manual',
  adminId = null,
  targetType = null,
  targetId = null,
  details = null,
  status = 'QUEUED',
  startedAt = null,
}) =>
  prisma.syncJob.create({
    data: {
      type,
      status,
      triggeredBy,
      adminId,
      targetType,
      targetId,
      details,
      startedAt,
    },
  });

/** Idempotent queue entry for on-demand refreshes and scheduled work. */
export const enqueueJob = async ({
  type,
  targetType = null,
  targetId = null,
  triggeredBy = 'on-demand',
  details = null,
}) =>
  withDbLock(
    `enqueue:${type}:${targetId || 'all'}`,
    async () => {
      const existing = await prisma.syncJob.findFirst({
        where: {
          type,
          targetId: targetId || null,
          status: { in: ['QUEUED', 'RUNNING'] },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) return { job: existing, existing: true };

      const job = await createJob({ type, targetType, targetId, triggeredBy, details });
      return { job, existing: false };
    },
    { ttlMs: 30 * 1000, waitMs: 2000 },
  );

export const runTrackedJob = async (
  { type, triggeredBy = 'manual', adminId = null, targetType = null, targetId = null, details = null },
  run,
) =>
  withDbLock(
    lockKeyFor(type, targetId),
    async () => {
      const job = await createJob({
        type,
        triggeredBy,
        adminId,
        targetType,
        targetId,
        details,
        status: 'RUNNING',
        startedAt: new Date(),
      });

      try {
        const result = await run(job);
        const counts = normalizeCounts(result);
        const status =
          Number(result?.deferred) > 0
            ? 'DEFERRED'
            : counts.failed > 0
              ? 'PARTIAL'
              : 'SUCCESS';

        const finished = await prisma.syncJob.update({
          where: { id: job.id },
          data: {
            ...counts,
            status,
            finishedAt: new Date(),
            details: counts.details ?? details,
          },
        });
        return { job: finished, result };
      } catch (error) {
        const quotaDeferred = error instanceof GeminiQuotaError || error?.code === 'GEMINI_QUOTA_EXHAUSTED';
        const finished = await prisma.syncJob.update({
          where: { id: job.id },
          data: {
            status: quotaDeferred ? 'DEFERRED' : 'FAILED',
            error: String(error?.message || 'Synchronization failed.').slice(0, 8000),
            finishedAt: new Date(),
          },
        });
        error.syncJob = finished;
        throw error;
      }
    },
    { ttlMs: 60 * 60 * 1000, waitMs: 0 },
  );

export const getJobs = async ({ limit = 25, status, type } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  return prisma.syncJob.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: safeLimit,
  });
};

export const getJob = async (id) => prisma.syncJob.findUnique({ where: { id } });

export const getRunningJobs = async () =>
  prisma.syncJob.findMany({
    where: { status: { in: ['RUNNING', 'QUEUED'] } },
    orderBy: { createdAt: 'desc' },
    take: 25,
  });

/** Cron worker: atomically claim one queued job at a time. */
export const claimNextQueuedJob = async () => {
  const next = await prisma.syncJob.findFirst({
    where: { status: 'QUEUED' },
    orderBy: { createdAt: 'asc' },
  });
  if (!next) return null;

  const claimed = await prisma.syncJob.updateMany({
    where: { id: next.id, status: 'QUEUED' },
    data: { status: 'RUNNING', startedAt: new Date() },
  });
  if (claimed.count !== 1) return null;
  return prisma.syncJob.findUnique({ where: { id: next.id } });
};

export const finishQueuedJob = async (id, result = {}) => {
  const counts = normalizeCounts(result);
  return prisma.syncJob.update({
    where: { id },
    data: {
      ...counts,
      status:
        Number(result?.deferred) > 0 ? 'DEFERRED' : counts.failed > 0 ? 'PARTIAL' : 'SUCCESS',
      finishedAt: new Date(),
    },
  });
};

export const failQueuedJob = async (id, error) => {
  const quotaDeferred = error instanceof GeminiQuotaError || error?.code === 'GEMINI_QUOTA_EXHAUSTED';
  return prisma.syncJob.update({
    where: { id },
    data: {
      status: quotaDeferred ? 'DEFERRED' : 'FAILED',
      error: String(error?.message || 'Synchronization failed.').slice(0, 8000),
      finishedAt: new Date(),
    },
  });
};

/** Clears abandoned locks after a crashed worker. */
export const clearExpiredLocks = async () =>
  prisma.syncLock.deleteMany({ where: { expiresAt: { lt: new Date() } } });

/** Marks jobs left RUNNING by a crashed worker so they do not block history. */
export const recoverStaleJobs = async ({ olderThanMinutes = 120 } = {}) => {
  const cutoff = new Date(Date.now() - Math.max(olderThanMinutes, 30) * 60 * 1000);
  return prisma.syncJob.updateMany({
    where: { status: 'RUNNING', startedAt: { lt: cutoff } },
    data: {
      status: 'FAILED',
      error: 'Worker stopped before reporting completion; job recovered for retry.',
      finishedAt: new Date(),
    },
  });
};
