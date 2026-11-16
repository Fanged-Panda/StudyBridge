/**
 * Weekly Synchronization Runner
 * Runs:
 *   1. Scholarships (check sources & extract with Gemini)
 *   2. Scholarship deadlines (updates expired deadlines, 0 Gemini cost)
 *   3. University admissions (extracts tuition, fees, criteria for due universities)
 *
 * Usage:
 *   node scripts/weekly-sync.js
 */
import '../src/config/env.js';
import prisma from '../src/config/database.js';
import { clearExpiredLocks, recoverStaleJobs, SYNC_JOB_TYPES } from '../src/services/syncJobs.js';
import { runScheduledSync } from '../src/services/syncRunner.js';

const runStep = async (type, label) => {
  console.log(`\n========================================`);
  console.log(`[Weekly Sync] Starting: ${label} (${type})`);
  console.log(`========================================`);

  try {
    const { job, result } = await runScheduledSync({
      type,
      details: { schedule: 'weekly run', label },
    });

    console.log(`[Weekly Sync] ${label} finished: status=${job.status}`);
    console.log(
      JSON.stringify(
        {
          status: job.status,
          processed: job.processed,
          created: job.created,
          updated: job.updated,
          unchanged: job.unchanged,
          failed: job.failed,
          geminiRequests: job.geminiRequests,
          details: result,
        },
        null,
        2,
      ),
    );

    return { ok: job.status === 'SUCCESS' || job.status === 'PARTIAL', job, result };
  } catch (error) {
    console.error(`[Weekly Sync] Error during ${label}:`, error?.message || error);
    return { ok: false, error: error?.message || String(error) };
  }
};

const main = async () => {
  const start = Date.now();
  console.log(`[Weekly Sync] Initializing at ${new Date().toISOString()}`);

  await clearExpiredLocks();
  await recoverStaleJobs();

  // 1. Scholarships extraction
  const scholarships = await runStep(
    SYNC_JOB_TYPES.SCHOLARSHIPS,
    'Scholarship Extraction & Portal Check',
  );

  // 2. Scholarship deadlines
  const deadlines = await runStep(
    SYNC_JOB_TYPES.SCHOLARSHIP_DEADLINES,
    'Scholarship Deadlines Status Update',
  );

  // 3. University admissions
  const admissions = await runStep(
    SYNC_JOB_TYPES.ADMISSIONS,
    'University Admissions & Tuition Sync',
  );

  const durationSec = Math.round((Date.now() - start) / 1000);
  console.log(`\n========================================`);
  console.log(`[Weekly Sync] Summary (Completed in ${durationSec}s):`);
  console.log(`  - Scholarships: ${scholarships.ok ? 'OK' : 'FAILED'}`);
  console.log(`  - Deadlines:    ${deadlines.ok ? 'OK' : 'FAILED'}`);
  console.log(`  - Admissions:   ${admissions.ok ? 'OK' : 'FAILED'}`);
  console.log(`========================================\n`);

  const allOk = scholarships.ok && deadlines.ok && admissions.ok;
  process.exitCode = allOk ? 0 : 1;
};

main()
  .catch((err) => {
    console.error('[Weekly Sync Fatal]:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

