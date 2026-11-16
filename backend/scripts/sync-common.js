import '../src/config/env.js';
import prisma from '../src/config/database.js';
import { clearExpiredLocks, recoverStaleJobs } from '../src/services/syncJobs.js';
import { runScheduledSync } from '../src/services/syncRunner.js';

export const executeScheduled = async (type, details = null) => {
  try {
    await clearExpiredLocks();
    await recoverStaleJobs();
    const { job, result } = await runScheduledSync({ type, details });
    console.log(
      JSON.stringify(
        {
          ok: true,
          type,
          jobId: job.id,
          status: job.status,
          processed: job.processed,
          created: job.created,
          updated: job.updated,
          unchanged: job.unchanged,
          failed: job.failed,
          skipped: job.skipped,
          geminiRequests: job.geminiRequests,
          result,
        },
        null,
        2,
      ),
    );
    process.exitCode = job.status === 'SUCCESS' || job.status === 'PARTIAL' ? 0 : 1;
  } catch (error) {
    const duplicate = error?.code === 'GEMINI_SYNC_BUSY';
    console.error(
      JSON.stringify(
        { ok: false, type, duplicate, code: error?.code, message: error?.message || String(error) },
        null,
        2,
      ),
    );
    process.exitCode = duplicate ? 0 : 1;
  } finally {
    await prisma.$disconnect();
  }
};
