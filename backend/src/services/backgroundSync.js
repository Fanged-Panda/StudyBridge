import { runDynamicBackgroundSync } from './dynamicDataSync.js';
import { runWithSyncTrigger } from './geminiQuota.js';

// Background refreshes are intentionally infrequent (30-day period).
const SYNC_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
let isSyncing = false;

export const runBackgroundSync = async () => {
  const timestamp = new Date();

  if (isSyncing) {
    console.warn('[Background Sync]: Previous run is still in progress; skipping this slot.');
    return null;
  }

  isSyncing = true;
  try {
    const result = await runWithSyncTrigger('scheduled', () => runDynamicBackgroundSync());
    const catalog = result.catalog || {};
    const professors = result.professors || {};
    const scholarships = result.scholarships || {};

    console.log(
      `[Background Sync ${timestamp.toISOString()}]: ` +
        `${catalog.created || 0} new universities, ` +
        `${professors.professors || 0} professors refreshed, ` +
        `${scholarships.created || 0} new / ${scholarships.updated || 0} updated scholarships.`,
    );

    if (result.errors.length) {
      console.warn(`[Background Sync]: ${result.errors.length} source warnings.`, result.errors.slice(0, 5));
    }

    return result;
  } catch (error) {
    console.error('[Background Sync Error]: Failed to perform scheduled update:', error?.message);
    return null;
  } finally {
    isSyncing = false;
  }
};

export const initBackgroundScheduler = () => {
  if (process.env.ENABLE_IN_PROCESS_SCHEDULER !== 'true') {
    console.log(
      '[Background Sync]: In-process scheduler disabled. Use Render Cron Jobs; set ENABLE_IN_PROCESS_SCHEDULER=true only for local development.',
    );
    return;
  }

  console.warn('[Background Sync]: Legacy in-process scheduler enabled for this process.');
  setInterval(runBackgroundSync, SYNC_INTERVAL_MS);
};
