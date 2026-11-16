import prisma from '../config/database.js';
import { enqueueJob, SYNC_JOB_TYPES } from './syncJobs.js';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Student visits are served from PostgreSQL first. This only enqueues durable
 * work; it never performs network calls or waits for Gemini on the request.
 */
export const queueOnDemandRefresh = async (kind, record) => {
  if (!record?.id) return null;
  const now = new Date();

  if (kind === 'university') {
    if (!record.websiteUrl) return null;
    if (record.nextSyncAt && new Date(record.nextSyncAt).getTime() > now.getTime()) return null;

    const { job, existing } = await enqueueJob({
      type: SYNC_JOB_TYPES.ADMISSIONS,
      targetType: 'university',
      targetId: record.id,
      triggeredBy: 'on-demand',
      details: { reason: 'stale university admission data' },
    });

    if (!existing) {
      await prisma.university.update({
        where: { id: record.id },
        data: { nextSyncAt: new Date(now.getTime() + 6 * HOUR_MS), syncStatus: 'QUEUED' },
      });
    }
    return job;
  }

  if (kind === 'scholarship') {
    if (!record.sourceUrl && !record.websiteUrl) return null;
    if (record.nextSyncAt && new Date(record.nextSyncAt).getTime() > now.getTime()) return null;

    const { job, existing } = await enqueueJob({
      type: SYNC_JOB_TYPES.SCHOLARSHIP,
      targetType: 'scholarship',
      targetId: record.id,
      triggeredBy: 'on-demand',
      details: { reason: 'stale scholarship content' },
    });

    if (!existing) {
      await prisma.scholarship.update({
        where: { id: record.id },
        data: { nextSyncAt: new Date(now.getTime() + 6 * HOUR_MS), syncStatus: 'QUEUED' },
      });
    }
    return job;
  }

  return null;
};
