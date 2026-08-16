import prisma from '../config/database.js';

// Fixed time slot interval for background updates (e.g., runs every 6 hours)
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

export const runBackgroundSync = async () => {
  try {
    const timestamp = new Date();
    const [uniUpdate, schUpdate] = await Promise.all([
      prisma.university.updateMany({
        data: { lastScraped: timestamp },
      }),
      prisma.scholarship.updateMany({
        data: { lastScraped: timestamp },
      }),
    ]);

    console.log(`[Background Sync ${timestamp.toISOString()}]: Updated ${uniUpdate.count} universities and ${schUpdate.count} scholarships.`);
  } catch (error) {
    console.error('[Background Sync Error]: Failed to perform scheduled update:', error?.message);
  }
};

export const initBackgroundScheduler = () => {
  console.log('[Background Sync]: Scheduler initialized. Running in fixed time slots.');
  // Set recurring fixed time slot interval
  setInterval(runBackgroundSync, SYNC_INTERVAL_MS);
};
