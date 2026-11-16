import {
  claimNextQueuedJob,
  failQueuedJob,
  finishQueuedJob,
  runTrackedJob,
  SYNC_JOB_TYPES,
} from './syncJobs.js';
import { getGeminiUsage, runWithSyncTrigger } from './geminiQuota.js';
import prisma from '../config/database.js';
import {
  checkScholarshipSourcesOperation,
  extractPendingScholarshipSourcesOperation,
  refreshResearchMetricsOperation,
  syncAdmissionsOperation,
  syncAllScholarshipsOperation,
  syncProfessorsOperation,
  syncScholarshipOperation,
  syncUniversityCatalogOperation,
  syncUniversityOperation,
  updateScholarshipDeadlinesOperation,
} from './syncOperations.js';

const execute = (type, targetId) => {
  switch (type) {
    case SYNC_JOB_TYPES.UNIVERSITY_CATALOG:
      return syncUniversityCatalogOperation();
    case SYNC_JOB_TYPES.UNIVERSITY:
      if (!targetId) throw new Error('A university ID is required for this operation.');
      return syncUniversityOperation(targetId);
    case SYNC_JOB_TYPES.ADMISSIONS:
      return syncAdmissionsOperation({ universityId: targetId || null });
    case SYNC_JOB_TYPES.SCHOLARSHIPS:
      return syncAllScholarshipsOperation();
    case SYNC_JOB_TYPES.SCHOLARSHIP:
      if (!targetId) throw new Error('A scholarship ID is required for this operation.');
      return syncScholarshipOperation(targetId);
    case SYNC_JOB_TYPES.SCHOLARSHIP_SOURCES:
      return checkScholarshipSourcesOperation();
    case SYNC_JOB_TYPES.SCHOLARSHIP_EXTRACTION:
      return extractPendingScholarshipSourcesOperation();
    case SYNC_JOB_TYPES.SCHOLARSHIP_DEADLINES:
      return updateScholarshipDeadlinesOperation();
    case SYNC_JOB_TYPES.PROFESSORS:
      return syncProfessorsOperation({ universityId: targetId || null });
    case SYNC_JOB_TYPES.RESEARCH_METRICS:
      return refreshResearchMetricsOperation();
    default:
      throw new Error(`Unknown synchronization operation: ${type}`);
  }
};

const manualCooldownSeconds = () =>
  Math.min(Math.max(Number(process.env.SYNC_MANUAL_COOLDOWN_SECONDS) || 10, 1), 300);

const assertManualCooldown = async (type, adminId) => {
  if (!adminId) return;

  const cooldownSeconds = manualCooldownSeconds();
  const recent = await prisma.syncJob.findFirst({
    where: {
      type,
      triggeredBy: 'manual',
      adminId,
      createdAt: { gt: new Date(Date.now() - cooldownSeconds * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (recent) {
    const error = new Error(`Please wait ${cooldownSeconds}s before starting this operation again.`);
    error.code = 'SYNC_COOLDOWN';
    error.status = 429;
    throw error;
  }
};

export const syncFailure = (error, fallbackMessage = 'Synchronization failed.') => ({
  status:
    error?.status ||
    (error?.code === 'SYNC_COOLDOWN' || error?.code === 'GEMINI_QUOTA_EXHAUSTED'
      ? 429
      : error?.code === 'GEMINI_SYNC_BUSY'
        ? 409
        : 500),
  body: {
    success: false,
    message: error?.message || fallbackMessage,
    code: error?.code || 'SYNC_FAILED',
    job: error?.syncJob || null,
  },
});

const withUsage = async (fn) => {
  const before = await getGeminiUsage();
  const result = await fn();
  const after = await getGeminiUsage();
  return {
    ...result,
    geminiRequests: Math.max(0, after.syncRequests - before.syncRequests),
  };
};

/**
 * Runs an administrator-triggered operation immediately, with a persistent job
 * record, database lock and duplicate-job protection.
 */
export const runManualSync = async ({
  type,
  adminId = null,
  targetType = null,
  targetId = null,
  details = null,
}) => {
  await assertManualCooldown(type, adminId);

  const outcome = await runWithSyncTrigger('manual', () =>
    runTrackedJob(
      {
        type,
        triggeredBy: 'manual',
        adminId,
        targetType,
        targetId,
        details,
      },
      () => withUsage(() => execute(type, targetId)),
    ),
  );

  return outcome;
};

/** Scheduled entry point used by Render Cron Jobs. */
export const runScheduledSync = async ({ type, details = null, triggeredBy = 'scheduled' }) => {
  return runWithSyncTrigger(triggeredBy === 'manual' ? 'manual' : 'scheduled', () =>
    runTrackedJob(
      { type, triggeredBy, details },
      () => withUsage(() => execute(type, null)),
    ),
  );
};

/** Processes queued on-demand/scheduled jobs. Called only by the cron worker. */
export const processQueuedSyncJobs = async ({ limit = 5 } = {}) => {
  const results = [];
  const max = Math.min(Math.max(Number(limit) || 5, 1), 20);

  for (let index = 0; index < max; index += 1) {
    const job = await claimNextQueuedJob();
    if (!job) break;

    try {
      const result = await runWithSyncTrigger('scheduled', () =>
        withUsage(() => execute(job.type, job.targetId)),
      );
      const finished = await finishQueuedJob(job.id, result);
      results.push({ job: finished, result });
    } catch (error) {
      const failed = await failQueuedJob(job.id, error);
      results.push({ job: failed, error: error?.message || 'Job failed' });
    }
  }

  return results;
};
