import '../src/config/env.js';
import prisma from '../src/config/database.js';
import { clearExpiredLocks, recoverStaleJobs } from '../src/services/syncJobs.js';
import { processQueuedSyncJobs } from '../src/services/syncRunner.js';

try {
  await clearExpiredLocks();
  await recoverStaleJobs();
  const results = await processQueuedSyncJobs({ limit: process.env.SYNC_QUEUE_BATCH || 5 });
  console.log(JSON.stringify({ ok: true, processed: results.length, results }, null, 2));
  process.exitCode = results.some((entry) => entry.job?.status === 'FAILED') ? 1 : 0;
} catch (error) {
  console.error(JSON.stringify({ ok: false, message: error?.message || String(error) }, null, 2));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
