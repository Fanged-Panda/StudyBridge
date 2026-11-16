# StudyBridge Synchronization Center

This document covers the synchronization architecture added to StudyBridge. It is
designed for the current deployment: Vercel frontend, Render Express backend,
Neon PostgreSQL and Prisma. Scheduled work runs in Render Cron Jobs, not in the
web process and not in Vercel functions.

## Architecture

```
HipoLabs ──► University discovery / Official website
OpenAlex ──► Professor discovery / Research metrics
Gemini ──► University profile: city, ranking, admissions, costs, programs, scholarships
Official pages ──► HTML fetch ──► SHA-256 hash ──► changed? ──► Gemini extraction
                                                    │
                                                    └─ unchanged: no Gemini call
Gemini ──► shared application budget / circuit breaker / single sync slot
PostgreSQL ──► SyncJob, SyncLock, GeminiUsageDaily, ScholarshipSource, sync metadata
```

Key properties:

- **Persistent job history** in `SyncJob` with manual/scheduled/on-demand trigger,
  administrator ID, counts, errors, duration and Gemini request counts.
- **Database locks** in `SyncLock`, shared by all Render instances. Scheduled jobs
  do not rely on `setInterval` or a single Express process.
- **Due-based scheduling** through `nextSyncAt` / `professorsNextSyncAt`; a
  scheduled run processes only a small batch of due records.
- **Content hashing** for scholarship source pages. Gemini is called only after a
  page's normalized text hash changes.
- **Provenance**: scholarship source URL/name/hash/timestamps, professor
  `metricsUpdatedAt`, and `adminVerifiedAt` markers. Administrator-edited
  university and scholarship fields are not silently overwritten by automation.
- **On-demand refreshes**: university/scholarship detail endpoints return the
  database row immediately and enqueue a durable `QUEUED` job when stale. The
  queue worker claims jobs with an atomic status update; repeated visits do not
  create duplicate jobs.

## Database changes

New/changed Prisma models and fields:

- `SyncJob`, `SyncLock`, `GeminiUsageDaily`, `ScholarshipSource`
- `University.lastSyncedAt`, `nextSyncAt`, `professorsNextSyncAt`, `syncStatus`,
  `syncError`, `adminVerifiedAt`
- `Professor.lastSyncedAt`, `nextSyncAt`, `metricsUpdatedAt`, `syncStatus`,
  `syncError`, `adminVerifiedAt`
- `Scholarship.sourceUrl`, `sourceName`, `contentHash`, `status`,
  `lastFetchedAt`, `lastExtractedAt`, `lastVerifiedAt`, `lastSyncedAt`,
  `nextSyncAt`, `syncStatus`, `syncError`, `confidence`, `adminVerifiedAt`
- `ScholarshipSource.contentHash` (last extracted) and `lastFetchedHash` (latest
  fetch, used to preserve pending changes while extraction is deferred)

All changes are additive. Existing records are preserved. The repository now
contains a baseline migration for the pre-sync schema and the additive sync
migration:

```text
backend/prisma/migrations/20261115000000_init/
backend/prisma/migrations/20261115001000_sync_center/
```

The existing local database was baselined with `prisma migrate resolve --applied`
because its schema had previously been created with `prisma db push`.

For a new environment:

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

For local schema development, generate a new migration rather than using
`db push`:

```bash
cd backend
npx prisma migrate dev --name <change_name>
npx prisma generate
```

## Gemini free-tier protection

`src/services/geminiQuota.js` is the single accounting layer for sync extraction.

- Chatbot and sync counters are separate. Chatbot does **not** use the sync
  budget, slot, or circuit breaker.
- `GEMINI_SYNC_DAILY_LIMIT` defaults to 10 application-level sync requests per
  UTC day. This is not an official Google quota figure.
- Only one sync Gemini call can run at a time (`gemini-sync-slot` DB lock).
- A 429/quota error opens the sync circuit for `GEMINI_CIRCUIT_OPEN_MINUTES`
  (default 60 minutes). Quota errors are not retried.
- Transient errors use limited exponential backoff; model fallback is retained.
- When the budget is unavailable, extraction sources remain
  `needsExtraction=true` and scholarship/job status is marked `DEFERRED`.
- The chatbot remains available if synchronization, accounting, or the sync
  circuit fails.

Admin-visible usage is at **Admin → Sync Center → Gemini protection**:
chatbot requests, admission extractions, scholarship extractions, quota errors,
remaining application budget, and circuit state. No official quota value is
fabricated.

## Sync operations

| Operation | Source | Gemini |
|---|---|---|
| University catalog | HipoLabs | No |
| One university | HipoLabs link + Gemini web search + OpenAlex professors | City, ranking, acceptance rate, admissions, costs, scholarships and programs |
| Admission requirements | Official university page | Yes, budgeted |
| Professor discovery | OpenAlex | No |
| Research metrics | OpenAlex by stable author ID | No |
| Scholarship source check | Official page + SHA-256 | No |
| Scholarship extraction | Changed source only | Yes, budgeted |
| Scholarship deadlines | Stored deadlines | No |

The default batches are deliberately small:

- `SYNC_ADMISSIONS_BATCH=5`
- `SYNC_PROFESSORS_BATCH=3`
- `SYNC_METRICS_BATCH_UNIVERSITIES=3`
- `SYNC_SCHOLARSHIP_EXTRACT_BATCH=2`

The first implementation pass must not run a full bulk import. Increase these
values only after reviewing quota and API behavior.

## Admin API

All routes require `Authorization: Bearer …` and administrator role.

```
GET  /api/admin/sync/overview
GET  /api/admin/sync/actions
GET  /api/admin/sync/jobs?limit=20&status=&type=
GET  /api/admin/sync/jobs/:id

POST /api/admin/sync/universities                  # university discovery
POST /api/admin/sync/universities/:id              # one university
POST /api/admin/sync/universities/:id/admissions   # one admissions extraction
POST /api/admin/sync/universities/:id/professors   # professors for one university
POST /api/admin/sync/admissions                    # due admission batch
POST /api/admin/sync/professors/metrics            # research metrics batch

POST /api/admin/sync/scholarships                  # check + extract changed
POST /api/admin/sync/scholarships/:id              # one scholarship
POST /api/admin/sync/scholarship-sources           # hash checks only
POST /api/admin/sync/scholarship-extraction        # pending changed sources
POST /api/admin/sync/scholarship-deadlines         # status/lifecycle update
```

Manual operations run synchronously with a database job record and lock. They
return a job and result; bulk operations use a small batch and may return
`DEFERRED` when the Gemini budget is unavailable. The shared manual-sync runner
enforces `SYNC_MANUAL_COOLDOWN_SECONDS` and receives the authenticated admin ID,
including from the legacy `/universities/sync` and `/scholarships/sync`
endpoints. The frontend prevents accidental duplicate submissions and asks for
confirmation before bulk work.

## Render Cron Jobs

Create separate Render Cron Jobs. Set the working directory/service to the
backend repository and configure the same environment variables as the API.
Example commands assume the repository root is the Render service root:

| Job | Command | Suggested UTC schedule |
|---|---|---|
| University discovery | `cd backend && node scripts/sync-universities.js` | `0 2 1 * *` |
| Admission requirements | `cd backend && node scripts/sync-admissions.js` | `30 2 1 * *` |
| Professor discovery | `cd backend && node scripts/sync-professors.js` | `0 3 1 * *` |
| Research metrics | `cd backend && node scripts/refresh-research-metrics.js` | `30 3 1 * *` |
| Scholarship checks | `cd backend && node scripts/check-scholarship-sources.js` | `0 4 1 * *` |
| Scholarship extraction | `cd backend && node scripts/extract-scholarships.js` | `30 4 1 * *` |
| Deadline statuses | `cd backend && node scripts/update-scholarship-deadlines.js` | `0 5 1 * *` |
| On-demand queue | `cd backend && node scripts/process-sync-jobs.js` | `*/5 * * * *` |

Render Cron must run `npm ci`/dependencies as part of its build or use a service
image that has them installed. Do not put `node scripts/...` on Vercel.

Set `ENABLE_IN_PROCESS_SCHEDULER=false` (the default) so the Express process does
not start a second scheduler. This makes the system safe when Render web
instances restart or sleep. For local development only, setting it to `true`
keeps the legacy in-process scheduler available.

The scheduled scripts exit non-zero on failure so Render can alert. A duplicate
overlapping run exits zero after reporting the lock is held.

## Operations and failure behavior

- One failing university/scholarship does not terminate a batch; the failure is
  recorded on the record and in `SyncJob.error/details`.
- Upserts are idempotent; external author IDs and university names are used for
  deduplication.
- A website fetch failure does **not** mark a scholarship expired. The deadline
  lifecycle only runs from stored deadlines, and legacy unverified rows remain
  `NEEDS_VERIFICATION`.
- Jobs left `RUNNING` by a crashed process are recoverable by clearing expired
  locks (`scripts/process-sync-jobs.js` does this at startup).
- Do not delete expired scholarships. Statuses are `UPCOMING`, `OPEN`,
  `CLOSING_SOON`, `CLOSED`, `EXPIRED`, `NEEDS_VERIFICATION`.

## Testing checklist

Use a single university, a single scholarship and one source where possible.
Do not run full bulk imports or spend the Gemini budget on hundreds of pages.

1. `npx prisma validate && npx prisma generate`
2. Backend import check and `npm run build --prefix frontend`
3. Admin overview and all seven controls
4. Duplicate submission returns a conflict/lock message
5. `GEMINI_SYNC_DAILY_LIMIT=0` produces `DEFERRED`, not a chatbot outage
6. A simulated 429 opens the circuit and does not retry
7. One source hash check reports `UNCHANGED` without Gemini
8. Failed fetch leaves the scholarship/status intact
9. On-demand visits create one queued job, not duplicates
10. Admin authorization rejects missing/non-admin tokens

## Known limitations / prepared but not complete

- `CLOSED` and administrator-approved re-opening are manual policy states; only
  date-derived statuses are automated.
- The parser supports common English date formats, not every localized page.
- Gemini token/cost estimates are not shown because the SDK does not provide a
  reliable free-tier remaining quota; only request counters are shown.
- Student notifications for meaningful changes are prepared via existing
  notification tables and follower relationships, but no new external
  notification service was added.
- A dedicated Render Background Worker can be introduced by pointing it at the
  same scripts/queue worker; the orchestration is already separated from Express.
- Existing curated rows created before this change have no `adminVerifiedAt`
  marker. Mark them through the admin edit form if they must be protected from
  future automated updates.
