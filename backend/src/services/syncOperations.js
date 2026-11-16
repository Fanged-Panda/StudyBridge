import prisma from '../config/database.js';
import { getScholarshipSources } from '../config/scholarshipSources.js';
import {
  extractScholarshipsFromSnapshot,
  extractUniversityAdmissionsFromUrl,
  fetchOpenAlexAuthorsByIds,
  fetchSourceDocument,
  isGeminiConfigured,
  searchUniversityProfile,
} from './liveDataSources.js';
import { syncProfessorsForUniversity, syncUniversityCatalog } from './dynamicDataSync.js';
import { isQuotaError } from './geminiQuota.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const envInt = (name, fallback, min, max) => {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.round(value), min), max);
};

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);
const addHours = (date, hours) => new Date(date.getTime() + hours * HOUR_MS);

const truncate = (value, length) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, length) : null;
};

const normalizeName = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== '';

const sourceNameFor = (source) => {
  if (source.name) return truncate(source.name, 160);
  try {
    return truncate(new URL(source.url).hostname.replace(/^www\./, ''), 160);
  } catch {
    return truncate(source.country || 'Scholarship source', 160);
  }
};

export const parseDeadlineDate = (deadline, now = new Date()) => {
  const raw = String(deadline || '').trim();
  if (!raw || /varies|rolling|ongoing|open until|not specified|tba|check website/i.test(raw)) {
    return null;
  }

  const cleaned = raw
    .replace(/^deadline[:\s]*/i, '')
    .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  let parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) {
    const withoutYear = cleaned.replace(/,?\s*\d{4}\s*$/, '').trim();
    parsed = new Date(`${withoutYear} ${now.getUTCFullYear()}`);
  }
  if (Number.isNaN(parsed.getTime())) return null;

  // A deadline written without a year that is far in the past is normally the
  // next occurrence (e.g. "January 15" visited in November).
  if (!/\b\d{4}\b/.test(cleaned) && parsed.getTime() < now.getTime() - 180 * DAY_MS) {
    parsed.setUTCFullYear(parsed.getUTCFullYear() + 1);
  }

  return parsed;
};

export const computeScholarshipStatus = (deadline, now = new Date()) => {
  const raw = String(deadline || '').trim();
  if (!raw) return 'NEEDS_VERIFICATION';
  if (/rolling|ongoing|open until/i.test(raw)) return 'OPEN';

  const parsed = parseDeadlineDate(raw, now);
  if (!parsed) return 'NEEDS_VERIFICATION';

  const days = Math.ceil((parsed.getTime() - now.getTime()) / DAY_MS);
  if (days < 0) return 'EXPIRED';
  if (days <= 14) return 'CLOSING_SOON';
  if (days > 180) return 'UPCOMING';
  return 'OPEN';
};

const mergeDeadline = (extracted, existing) => {
  if (!extracted) return existing;
  if (!existing) return extracted;
  return /^varies$/i.test(String(extracted).trim()) ? existing : extracted;
};

const buildScholarshipUpdate = (existing, row, sourceMeta) => {
  const deadline = mergeDeadline(row.deadline, existing.deadline);
  const now = new Date();
  const protectedFields = ['country', 'amountUsd', 'fundingLevel', 'eligibility', 'deadline', 'websiteUrl'];

  const data = {
    sourceUrl: sourceMeta.url || existing.sourceUrl,
    sourceName: sourceMeta.name || existing.sourceName,
    contentHash: sourceMeta.contentHash || existing.contentHash,
    lastFetchedAt: sourceMeta.fetchedAt,
    lastExtractedAt: now,
    lastVerifiedAt: now,
    lastSyncedAt: now,
    lastScraped: now,
    nextSyncAt: addDays(now, 30),
    status: computeScholarshipStatus(deadline ?? existing.deadline, now),
    syncStatus: 'SUCCESS',
    syncError: null,
  };

  const extracted = {
    country: row.country,
    amountUsd: row.amountUsd,
    fundingLevel: row.fundingLevel,
    eligibility: row.eligibility,
    deadline,
    websiteUrl: row.websiteUrl,
  };

  for (const field of protectedFields) {
    const existingValue = existing[field];
    const extractedValue = extracted[field];

    if (existing.adminVerifiedAt) {
      // Administrators win. Automated extraction may only fill blanks.
      if (!hasValue(existingValue) && hasValue(extractedValue)) data[field] = extractedValue;
    } else if (hasValue(extractedValue)) {
      data[field] = extractedValue;
    } else if (hasValue(existingValue)) {
      data[field] = existingValue;
    }
  }

  return data;
};

const upsertExtractedScholarships = async (rows, sourceMeta) => {
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const errors = [];
  const seen = new Set();

  for (const row of rows) {
    const name = truncate(row.name, 150);
    const key = normalizeName(name);
    if (!name || !key || seen.has(key)) continue;
    seen.add(key);

    try {
      const existing = await prisma.scholarship.findUnique({ where: { name } });

      if (existing) {
        const data = buildScholarshipUpdate(existing, row, sourceMeta);
        const changed = Object.entries(data).some(([field, value]) => {
          if (value instanceof Date) return existing[field]?.getTime?.() !== value.getTime();
          return existing[field] !== value;
        });
        if (!changed) {
          unchanged += 1;
          continue;
        }
        await prisma.scholarship.update({ where: { id: existing.id }, data });
        updated += 1;
      } else {
        await prisma.scholarship.create({
          data: {
            name,
            country: truncate(row.country || sourceMeta.country || 'Global', 100) || 'Global',
            amountUsd: row.amountUsd ?? null,
            fundingLevel: truncate(row.fundingLevel || 'Partial', 50) || 'Partial',
            eligibility: row.eligibility ?? null,
            deadline: truncate(row.deadline, 100),
            websiteUrl: truncate(row.websiteUrl || sourceMeta.url, 255),
            sourceUrl: sourceMeta.url,
            sourceName: sourceMeta.name,
            contentHash: sourceMeta.contentHash,
            lastFetchedAt: sourceMeta.fetchedAt,
            lastExtractedAt: new Date(),
            lastVerifiedAt: new Date(),
            lastSyncedAt: new Date(),
            lastScraped: new Date(),
            nextSyncAt: addDays(new Date(), 30),
            status: computeScholarshipStatus(row.deadline),
            syncStatus: 'SUCCESS',
          },
        });
        created += 1;
      }
    } catch (error) {
      errors.push({ scholarship: name, message: error?.message || 'Upsert failed' });
    }
  }

  return { created, updated, unchanged, failed: errors.length, errors };
};

// ---------------------------------------------------------------------------
// University discovery and admissions
// ---------------------------------------------------------------------------

export const syncUniversityCatalogOperation = async () => {
  const catalog = await syncUniversityCatalog();
  return {
    processed: catalog.created + catalog.updated + catalog.skipped,
    created: catalog.created,
    updated: catalog.updated,
    unchanged: catalog.skipped,
    failed: catalog.failed,
    skipped: catalog.skipped,
    error: catalog.errors?.length ? `${catalog.errors.length} directory warnings` : null,
    details: { countries: catalog.countries, allowNew: catalog.allowNew, errors: catalog.errors?.slice(0, 20) },
  };
};

const applyAdmissions = async (university) => {
  if (!university.websiteUrl) {
    return { changed: false, skipped: true, reason: 'No official website URL.' };
  }
  if (!isGeminiConfigured()) {
    return { changed: false, skipped: true, reason: 'GEMINI_API_KEY is not configured.' };
  }

  const facts = await extractUniversityAdmissionsFromUrl(university.websiteUrl);
  const fields = [
    'tuitionAnnualUsd',
    'applicationFee',
    'applicationDeadline',
    'ieltsRequirement',
    'greRequirement',
  ];
  const updates = {};

  for (const field of fields) {
    if (!hasValue(facts[field])) continue;
    // Verified/admin-curated values are never overwritten automatically.
    if (university.adminVerifiedAt) {
      if (!hasValue(university[field])) updates[field] = facts[field];
    } else if (facts[field] !== university[field]) {
      updates[field] = facts[field];
    }
  }

  const now = new Date();
  await prisma.university.update({
    where: { id: university.id },
    data: {
      ...updates,
      lastScraped: now,
      lastSyncedAt: now,
      nextSyncAt: addDays(now, Math.max(envInt('SYNC_ADMISSIONS_INTERVAL_DAYS', 30, 1, 365), 30)),
      syncStatus: 'SUCCESS',
      syncError: null,
    },
  });

  return { changed: Object.keys(updates).length > 0, changedFields: Object.keys(updates) };
};

export const syncAdmissionsOperation = async ({ universityId = null, limit } = {}) => {
  const now = new Date();
  const batchSize = Math.min(Math.max(Number(limit) || envInt('SYNC_ADMISSIONS_BATCH', 10, 1, 50), 1), 50);
  const profileMode = Boolean(universityId);

  let universities;
  if (universityId) {
    const one = await prisma.university.findUnique({ where: { id: universityId } });
    if (!one) throw new Error('University not found.');
    universities = [one];
  } else {
    universities = await prisma.university.findMany({
      where: {
        websiteUrl: { not: null },
        OR: [{ nextSyncAt: null }, { nextSyncAt: { lte: now } }],
      },
      orderBy: [{ nextSyncAt: 'asc' }, { ranking: 'asc' }],
      take: batchSize,
    });
  }

  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let failed = 0;
  let deferred = 0;
  let programs = 0;
  let scholarships = 0;
  const errors = [];
  const failureLabel = profileMode ? 'University profile sync failed' : 'Admissions extraction failed';
  const failureNoun = profileMode ? 'university profile sync failure' : 'admission extraction failure';

  for (const university of universities) {
    try {
      // A targeted admission sync is the same full profile sync used by the
      // university card; only the scheduled batch remains website-based.
      const result = profileMode
        ? await applyUniversityProfile(university)
        : await applyAdmissions(university);

      if (profileMode && !result.skipped) {
        const scholarshipErrors = result.scholarshipCounts?.errors || [];
        programs += result.programs || 0;
        scholarships += (result.scholarshipCounts?.created || 0) + (result.scholarshipCounts?.updated || 0);

        if (scholarshipErrors.length > 0) {
          errors.push({
            university: university.name,
            message: `${scholarshipErrors.length} scholarship upserts failed`,
          });
        }

        await prisma.university.update({
          where: { id: university.id },
          data: {
            lastSyncedAt: now,
            nextSyncAt: addDays(now, Math.max(envInt('SYNC_ADMISSIONS_INTERVAL_DAYS', 30, 1, 365), 30)),
            syncStatus: scholarshipErrors.length > 0 ? 'PARTIAL' : 'SUCCESS',
            syncError: scholarshipErrors.length > 0 ? 'Some scholarship upserts failed.' : null,
          },
        });
      }

      if (result.changed) updated += 1;
      else if (result.skipped) skipped += 1;
      else unchanged += 1;
    } catch (error) {
      if (isQuotaError(error)) {
        deferred += 1;
        await prisma.university
          .update({
            where: { id: university.id },
            data: {
              syncStatus: 'DEFERRED',
              syncError: String(error.message || 'Gemini quota unavailable.').slice(0, 2000),
              nextSyncAt: addDays(new Date(), 1),
            },
          })
          .catch(() => {});
        break;
      }
      failed += 1;
      errors.push({ university: university.name, message: error?.message || failureLabel });
      await prisma.university
        .update({
          where: { id: university.id },
          data: {
            syncStatus: 'ERROR',
            syncError: String(error?.message || failureLabel).slice(0, 2000),
            nextSyncAt: addDays(new Date(), 1),
          },
        })
        .catch(() => {});
    }
  }

  return {
    processed: universities.length,
    created: 0,
    updated,
    unchanged,
    failed,
    skipped,
    deferred,
    error: errors.length
      ? `${errors.length} ${failureNoun}${errors.length === 1 ? '' : 's'}`
      : null,
    details: {
      batchSize,
      profileMode,
      programs,
      scholarships,
      deferred,
      notice: deferred ? 'Gemini budget/circuit stopped this batch; remaining records stay due.' : null,
      errors: errors.slice(0, 20),
    },
  };
};

/** Add new Gemini degree programs without deleting existing courses. */
const mergePrograms = async (university, extracted = []) => {
  const existing = Array.isArray(university.courses) ? university.courses : [];
  // Admin-curated course data wins over automated extraction.
  if (university.adminVerifiedAt && existing.length > 0) {
    return { changed: false, skipped: true, reason: 'Programs are administrator-curated.' };
  }
  if (!extracted.length) {
    return { changed: false, skipped: true, reason: 'No degree programs returned by Gemini.' };
  }

  const byName = new Map();
  for (const course of existing) {
    const name = typeof course === 'string' ? course : course?.name;
    const key = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (key) byName.set(key, typeof course === 'string' ? { name: course } : course);
  }

  let touched = 0;
  for (const program of extracted) {
    const key = String(program?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!key) continue;
    const current = byName.get(key);
    if (!current) {
      byName.set(key, { ...program });
      touched += 1;
      continue;
    }

    const merged = { ...current };
    for (const field of ['discipline', 'duration']) {
      if (!merged[field] && program[field]) merged[field] = program[field];
    }
    for (const field of ['degrees', 'skills']) {
      if ((!Array.isArray(merged[field]) || merged[field].length === 0) && program[field]?.length) {
        merged[field] = program[field];
      }
    }
    if (JSON.stringify(merged) !== JSON.stringify(current)) {
      byName.set(key, merged);
      touched += 1;
    }
  }

  if (touched === 0) return { changed: false, count: 0, total: existing.length };

  const courses = [...byName.values()];

  await prisma.university.update({
    where: { id: university.id },
    data: { courses, lastScraped: new Date() },
  });

  return { changed: true, count: touched, total: courses.length };
};

/** One grounded Gemini search fills admissions, cost fields, programs and scholarships. */
async function applyUniversityProfile(university) {
  if (!isGeminiConfigured()) {
    return { changed: false, skipped: true, reason: 'GEMINI_API_KEY is not configured.' };
  }

  const profile = await searchUniversityProfile(university);
  const fields = [
    'tuitionAnnualUsd',
    'applicationFee',
    'applicationDeadline',
    'ieltsRequirement',
    'greRequirement',
  ];
  const updates = {};

  for (const field of fields) {
    if (!hasValue(profile[field])) continue;
    // Verified/admin-curated values are never overwritten automatically.
    if (university.adminVerifiedAt) {
      if (!hasValue(university[field])) updates[field] = profile[field];
    } else if (profile[field] !== university[field]) {
      updates[field] = profile[field];
    }
  }

  // These profile fields are fill-only: never replace a known city, ranking,
  // or acceptance rate with an automated value.
  for (const field of ['city', 'ranking', 'acceptanceRate']) {
    if (!hasValue(profile[field])) continue;
    const current = university[field];
    const missing = field === 'ranking'
      ? !hasValue(current) || Number(current) >= 9999
      : !hasValue(current);
    if (missing) updates[field] = profile[field];
  }

  if (Object.keys(updates).length > 0) {
    await prisma.university.update({
      where: { id: university.id },
      data: { ...updates, lastScraped: new Date() },
    });
  }

  const refreshed = { ...university, ...updates };
  const programResult = await mergePrograms(refreshed, profile.programs);
  const scholarshipResult = profile.scholarships.length
    ? await upsertExtractedScholarships(profile.scholarships, {
        url: university.websiteUrl || null,
        name: truncate(`${university.name} — Gemini Search`, 160),
        country: university.country,
        contentHash: null,
        fetchedAt: new Date(),
      })
    : { created: 0, updated: 0, unchanged: 0, failed: 0, errors: [] };

  return {
    changed:
      Object.keys(updates).length > 0 ||
      programResult.changed ||
      scholarshipResult.created + scholarshipResult.updated > 0,
    changedFields: Object.keys(updates),
    programs: programResult.changed ? programResult.count : 0,
    scholarshipCounts: scholarshipResult,
  };
}

export const syncUniversityOperation = async (universityId) => {
  const university = await prisma.university.findUnique({ where: { id: universityId } });
  if (!university) throw new Error('University not found.');

  const errors = [];
  let professors = 0;
  let programs = 0;
  let scholarships = 0;
  let admissionChanged = false;
  let profileDeferred = false;

  try {
    const result = await syncProfessorsForUniversity(university);
    professors = result.created + result.updated;
    if (result.error) errors.push(result.error);
  } catch (error) {
    errors.push(`OpenAlex authors: ${error?.message || 'request failed'}`);
  }

  try {
    const refreshed = await prisma.university.findUnique({ where: { id: universityId } });
    const profile = await applyUniversityProfile(refreshed);
    admissionChanged = Boolean(profile.changedFields?.length);
    programs = profile.programs || 0;
    scholarships = (profile.scholarshipCounts?.created || 0) + (profile.scholarshipCounts?.updated || 0);
    if (profile.scholarshipCounts?.errors?.length) {
      errors.push(`${profile.scholarshipCounts.errors.length} scholarship upserts failed.`);
    }
  } catch (error) {
    if (isQuotaError(error)) {
      profileDeferred = true;
      errors.push('University profile deferred: Gemini budget or circuit unavailable.');
    } else {
      errors.push(`University profile: ${error?.message || 'request failed'}`);
    }
  }

  await prisma.university.update({
    where: { id: universityId },
    data: {
      lastSyncedAt: new Date(),
      nextSyncAt: profileDeferred
        ? addDays(new Date(), 1)
        : addDays(new Date(), Math.max(envInt('SYNC_ADMISSIONS_INTERVAL_DAYS', 30, 1, 365), 30)),
      professorsNextSyncAt: addDays(
        new Date(),
        Math.max(envInt('SYNC_PROFESSORS_INTERVAL_DAYS', 30, 1, 365), 30),
      ),
      syncStatus: errors.length ? 'PARTIAL' : 'SUCCESS',
      syncError: errors.length ? errors.join(' | ').slice(0, 4000) : null,
    },
  });

  return {
    processed: 1,
    updated: 1,
    unchanged: admissionChanged || programs || scholarships || professors ? 0 : 1,
    failed: errors.length > 0 ? 1 : 0,
    error: errors.length ? errors.join(' | ') : null,
    details: { professors, programs, scholarships, admissionChanged, errors: errors.slice(0, 10) },
  };
};

// ---------------------------------------------------------------------------
// Professors and research metrics
// ---------------------------------------------------------------------------

export const syncProfessorsOperation = async ({ universityId = null, limit } = {}) => {
  const now = new Date();
  const batchSize = Math.min(Math.max(Number(limit) || envInt('SYNC_PROFESSORS_BATCH', 3, 1, 25), 1), 25);

  let universities;
  if (universityId) {
    const one = await prisma.university.findUnique({ where: { id: universityId } });
    if (!one) throw new Error('University not found.');
    universities = [one];
  } else {
    universities = await prisma.university.findMany({
      where: {
        OR: [{ professorsNextSyncAt: null }, { professorsNextSyncAt: { lte: now } }],
      },
      orderBy: [{ professorsNextSyncAt: 'asc' }, { ranking: 'asc' }],
      take: batchSize,
    });
  }

  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors = [];

  for (const university of universities) {
    try {
      const result = await syncProfessorsForUniversity(university);
      created += result.created || 0;
      updated += result.updated || 0;
      if (result.error) errors.push({ university: university.name, message: result.error });

      await prisma.university.update({
        where: { id: university.id },
        data: {
          professorsNextSyncAt: addDays(
            new Date(),
            Math.max(envInt('SYNC_PROFESSORS_INTERVAL_DAYS', 30, 1, 365), 30),
          ),
          syncStatus: result.error ? 'PARTIAL' : 'SUCCESS',
          syncError: result.error ? String(result.error).slice(0, 2000) : null,
        },
      });
    } catch (error) {
      failed += 1;
      errors.push({ university: university.name, message: error?.message || 'Professor sync failed' });
      await prisma.university
        .update({
          where: { id: university.id },
          data: {
            professorsNextSyncAt: addDays(new Date(), 1),
            syncStatus: 'ERROR',
            syncError: String(error?.message || 'Professor sync failed').slice(0, 2000),
          },
        })
        .catch(() => {});
    }
  }

  return {
    processed: universities.length,
    created,
    updated,
    failed,
    error: errors.length ? `${errors.length} professor sync warnings` : null,
    details: { batchSize, errors: errors.slice(0, 20) },
  };
};

export const refreshResearchMetricsOperation = async ({ limit } = {}) => {
  const now = new Date();
  const universityLimit = Math.min(
    Math.max(Number(limit) || envInt('SYNC_METRICS_BATCH_UNIVERSITIES', 3, 1, 25), 1),
    25,
  );

  const dueProfessors = await prisma.professor.findMany({
    where: {
      openAlexId: { not: null },
      OR: [{ nextSyncAt: null }, { nextSyncAt: { lte: now } }],
    },
    orderBy: [{ nextSyncAt: 'asc' }, { id: 'asc' }],
    take: 500,
    select: { id: true, universityId: true, openAlexId: true },
  });

  const byUniversity = new Map();
  for (const professor of dueProfessors) {
    if (!byUniversity.has(professor.universityId)) byUniversity.set(professor.universityId, []);
    byUniversity.get(professor.universityId).push(professor);
  }

  const universityIds = [...byUniversity.keys()].slice(0, universityLimit);
  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  for (const universityId of universityIds) {
    const rows = byUniversity.get(universityId) || [];
    const ids = [...new Set(rows.map((row) => row.openAlexId).filter(Boolean))];

    try {
      const authors = await fetchOpenAlexAuthorsByIds(ids);
      const byId = new Map(authors.map((author) => [author.openAlexId, author]));
      const nowDate = new Date();

      for (const professor of rows) {
        processed += 1;
        const author = byId.get(professor.openAlexId);
        if (!author) {
          skipped += 1;
          await prisma.professor
            .update({
              where: { id: professor.id },
              data: {
                nextSyncAt: addDays(nowDate, Math.max(envInt('SYNC_RESEARCH_INTERVAL_DAYS', 30, 1, 365), 30)),
                syncStatus: 'UNVERIFIED',
                syncError: 'OpenAlex author no longer returned for this ID.',
              },
            })
            .catch(() => {});
          continue;
        }

        await prisma.professor.update({
          where: { id: professor.id },
          data: {
            worksCount: author.worksCount,
            citedByCount: author.citedByCount,
            hIndex: author.hIndex,
            topics: author.topics,
            metricsUpdatedAt: nowDate,
            lastSyncedAt: nowDate,
            nextSyncAt: addDays(nowDate, Math.max(envInt('SYNC_RESEARCH_INTERVAL_DAYS', 30, 1, 365), 30)),
            syncStatus: 'SUCCESS',
            syncError: null,
          },
        });
        updated += 1;
      }
    } catch (error) {
      failed += 1;
      errors.push({ universityId, message: error?.message || 'Research metrics refresh failed' });
      await prisma.professor
        .updateMany({
          where: { id: { in: rows.map((row) => row.id) } },
          data: {
            syncStatus: 'ERROR',
            syncError: String(error?.message || 'OpenAlex request failed').slice(0, 2000),
            nextSyncAt: addDays(new Date(), 1),
          },
        })
        .catch(() => {});
    }
  }

  return {
    processed,
    updated,
    skipped,
    failed,
    error: errors.length ? `${errors.length} research metric failures` : null,
    details: { universities: universityIds.length, errors: errors.slice(0, 20) },
  };
};

// ---------------------------------------------------------------------------
// Scholarship sources, extraction and lifecycle
// ---------------------------------------------------------------------------

const loadSourceRows = async () => {
  const configured = getScholarshipSources();
  for (const source of configured) {
    await prisma.scholarshipSource.upsert({
      where: { url: source.url },
      create: {
        url: source.url,
        name: sourceNameFor(source),
        country: source.country || 'Global',
      },
      update: {
        name: sourceNameFor(source),
        country: source.country || 'Global',
      },
    });
  }
  return configured;
};

export const checkScholarshipSourcesOperation = async () => {
  const configured = await loadSourceRows();
  let processed = 0;
  let updated = 0;
  let unchanged = 0;
  let changed = 0;
  let failed = 0;
  const errors = [];

  for (const source of configured) {
    processed += 1;
    const now = new Date();
    try {
      const snapshot = await fetchSourceDocument(source.url);
      const sourceRow = await prisma.scholarshipSource.findUnique({ where: { url: source.url } });
      const isChanged = sourceRow?.lastFetchedHash !== snapshot.contentHash;

      await prisma.scholarshipSource.update({
        where: { url: source.url },
        data: {
          // `contentHash` means "last successfully extracted"; keep it until
          // extraction succeeds. `lastFetchedHash` tracks the latest fetch so
          // a pending change is not mistaken for already-processed content.
          lastFetchedHash: snapshot.contentHash,
          lastFetchedAt: now,
          lastVerifiedAt: now,
          lastChangedAt: isChanged ? now : sourceRow?.lastChangedAt,
          needsExtraction: isChanged || Boolean(sourceRow?.needsExtraction),
          syncStatus: isChanged ? 'CHANGED' : 'UNCHANGED',
          syncError: null,
        },
      });

      await prisma.scholarship.updateMany({
        where: { sourceUrl: source.url },
        data: { lastFetchedAt: now, lastVerifiedAt: now, sourceName: sourceNameFor(source) },
      });

      if (isChanged) changed += 1;
      else unchanged += 1;
      updated += 1;
    } catch (error) {
      failed += 1;
      errors.push({ url: source.url, message: error?.message || 'Source fetch failed' });
      await prisma.scholarshipSource
        .update({
          where: { url: source.url },
          data: {
            // Do not change the hash or treat a failed fetch as expiry.
            syncStatus: 'FETCH_FAILED',
            syncError: String(error?.message || 'Source fetch failed').slice(0, 2000),
          },
        })
        .catch(() => {});
    }
  }

  return {
    processed,
    updated,
    unchanged,
    changed,
    failed,
    error: errors.length ? `${errors.length} scholarship sources failed to load` : null,
    details: { changed, errors: errors.slice(0, 20) },
  };
};

export const extractPendingScholarshipSourcesOperation = async ({ limit } = {}) => {
  const batchSize = Math.min(Math.max(Number(limit) || envInt('SYNC_SCHOLARSHIP_EXTRACT_BATCH', 5, 1, 10), 1), 10);
  const sources = await prisma.scholarshipSource.findMany({
    where: { needsExtraction: true },
    orderBy: [{ lastFetchedAt: 'asc' }, { createdAt: 'asc' }],
    take: batchSize,
  });

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let failed = 0;
  let skipped = 0;
  let deferred = 0;
  let processed = 0;
  const errors = [];

  for (const source of sources) {
    processed += 1;
    try {
      const snapshot = await fetchSourceDocument(source.url);
      if (source.contentHash === snapshot.contentHash) {
        await prisma.scholarshipSource.update({
          where: { id: source.id },
          data: {
            needsExtraction: false,
            lastFetchedAt: snapshot.fetchedAt,
            lastVerifiedAt: new Date(),
            syncStatus: 'UNCHANGED',
            syncError: null,
          },
        });
        skipped += 1;
        continue;
      }

      if (!isGeminiConfigured()) {
        skipped += 1;
        await prisma.scholarshipSource.update({
          where: { id: source.id },
          data: { syncStatus: 'SKIPPED', syncError: 'GEMINI_API_KEY is not configured.' },
        });
        continue;
      }

      const rows = await extractScholarshipsFromSnapshot(snapshot, source.country || 'Global');
      const saved = await upsertExtractedScholarships(rows, {
        url: source.url,
        name: source.name || sourceNameFor(source),
        country: source.country || 'Global',
        contentHash: snapshot.contentHash,
        fetchedAt: snapshot.fetchedAt,
      });
      created += saved.created;
      updated += saved.updated;
      unchanged += saved.unchanged;
      failed += saved.failed;
      if (saved.errors.length) errors.push(...saved.errors);

      await prisma.scholarshipSource.update({
        where: { id: source.id },
        data: {
          contentHash: snapshot.contentHash,
          lastFetchedHash: snapshot.contentHash,
          needsExtraction: false,
          lastFetchedAt: snapshot.fetchedAt,
          lastExtractedAt: new Date(),
          lastVerifiedAt: new Date(),
          syncStatus: 'SUCCESS',
          syncError: null,
        },
      });
    } catch (error) {
      if (isQuotaError(error)) {
        deferred += 1;
        await prisma.scholarshipSource
          .update({
            where: { id: source.id },
            data: {
              syncStatus: 'DEFERRED',
              syncError: String(error.message || 'Gemini quota unavailable.').slice(0, 2000),
              // Keep needsExtraction true so this work is preserved for later.
              needsExtraction: true,
            },
          })
          .catch(() => {});
        break;
      }

      failed += 1;
      errors.push({ url: source.url, message: error?.message || 'Extraction failed' });
      await prisma.scholarshipSource
        .update({
          where: { id: source.id },
          data: {
            syncStatus: 'ERROR',
            syncError: String(error?.message || 'Extraction failed').slice(0, 2000),
            needsExtraction: true,
          },
        })
        .catch(() => {});
    }
  }

  return {
    processed,
    created,
    updated,
    unchanged,
    failed,
    skipped,
    deferred,
    error: errors.length ? `${errors.length} scholarship extractions failed` : null,
    details: {
      batchSize,
      deferred,
      remaining: await prisma.scholarshipSource.count({ where: { needsExtraction: true } }),
      errors: errors.slice(0, 20),
    },
  };
};

export const syncAllScholarshipsOperation = async () => {
  const checked = await checkScholarshipSourcesOperation();
  const extracted = await extractPendingScholarshipSourcesOperation({
    limit: envInt('SYNC_SCHOLARSHIP_EXTRACT_BATCH', 5, 1, 10),
  });

  return {
    processed: checked.processed + extracted.processed,
    created: extracted.created,
    updated: extracted.updated + checked.updated,
    unchanged: checked.unchanged + extracted.unchanged,
    failed: checked.failed + extracted.failed,
    skipped: extracted.skipped,
    deferred: extracted.deferred,
    error: checked.error || extracted.error,
    details: { check: checked.details, extraction: extracted.details },
  };
};

export const syncScholarshipOperation = async (scholarshipId) => {
  const scholarship = await prisma.scholarship.findUnique({ where: { id: scholarshipId } });
  if (!scholarship) throw new Error('Scholarship not found.');

  const sourceUrl = scholarship.sourceUrl || scholarship.websiteUrl;
  if (!sourceUrl) {
    const now = new Date();
    await prisma.scholarship.update({
      where: { id: scholarship.id },
      data: {
        syncStatus: 'SKIPPED',
        syncError: 'No official source URL.',
        nextSyncAt: addHours(now, 24),
      },
    });
    return { processed: 1, skipped: 1, details: { reason: 'No official source URL.' } };
  }

  const sourceName = scholarship.sourceName || sourceNameFor({ url: sourceUrl });
  let snapshot;
  try {
    snapshot = await fetchSourceDocument(sourceUrl);
  } catch (error) {
    await prisma.scholarship.update({
      where: { id: scholarship.id },
      data: {
        // A temporary fetch failure is not evidence that the scholarship expired.
        syncStatus: 'FETCH_FAILED',
        syncError: String(error?.message || 'Source fetch failed').slice(0, 2000),
        nextSyncAt: addHours(new Date(), 6),
      },
    });
    return { processed: 1, failed: 1, error: error?.message || 'Source fetch failed' };
  }

  const knownHash = scholarship.contentHash || null;
  if (knownHash && knownHash === snapshot.contentHash) {
    const now = new Date();
    await prisma.scholarship.update({
      where: { id: scholarship.id },
      data: {
        lastFetchedAt: now,
        lastVerifiedAt: now,
        lastSyncedAt: now,
        nextSyncAt: addHours(now, 6),
        syncStatus: 'UNCHANGED',
        syncError: null,
        status: computeScholarshipStatus(scholarship.deadline, now),
      },
    });
    return { processed: 1, unchanged: 1, details: { geminiSkipped: true, reason: 'Content hash unchanged.' } };
  }

  if (!isGeminiConfigured()) {
    return {
      processed: 1,
      skipped: 1,
      details: { reason: 'GEMINI_API_KEY is not configured.' },
    };
  }

  try {
    const rows = await extractScholarshipsFromSnapshot(snapshot, scholarship.country || 'Global');
    const target = normalizeName(scholarship.name);
    const match =
      rows.find((row) => normalizeName(row.name) === target) ||
      rows.find((row) => normalizeName(row.name).includes(target) || target.includes(normalizeName(row.name))) ||
      (rows.length === 1 ? rows[0] : null);

    if (!match) {
      await prisma.scholarship.update({
        where: { id: scholarship.id },
        data: {
          syncStatus: 'NO_MATCH',
          syncError: 'No matching program found on the source page.',
          lastFetchedAt: new Date(),
          nextSyncAt: addHours(new Date(), 12),
        },
      });
      return { processed: 1, failed: 1, error: 'No matching scholarship found.' };
    }

    const saved = await upsertExtractedScholarships([match], {
      url: sourceUrl,
      name: sourceName,
      country: scholarship.country,
      contentHash: snapshot.contentHash,
      fetchedAt: snapshot.fetchedAt,
    });

    await prisma.scholarshipSource
      .upsert({
        where: { url: sourceUrl },
        create: {
          url: sourceUrl,
          name: sourceName,
          country: scholarship.country,
          contentHash: snapshot.contentHash,
          lastFetchedHash: snapshot.contentHash,
          needsExtraction: false,
          lastFetchedAt: snapshot.fetchedAt,
          lastExtractedAt: new Date(),
          lastVerifiedAt: new Date(),
          syncStatus: 'SUCCESS',
        },
        update: {
          contentHash: snapshot.contentHash,
          lastFetchedHash: snapshot.contentHash,
          needsExtraction: false,
          lastFetchedAt: snapshot.fetchedAt,
          lastExtractedAt: new Date(),
          lastVerifiedAt: new Date(),
          syncStatus: 'SUCCESS',
          syncError: null,
        },
      })
      .catch(() => {});

    return {
      processed: 1,
      created: saved.created,
      updated: saved.updated,
      unchanged: saved.unchanged,
      failed: saved.failed,
      details: { extracted: rows.length, hashChanged: true },
    };
  } catch (error) {
    if (isQuotaError(error)) {
      await prisma.scholarship
        .update({
          where: { id: scholarship.id },
          data: {
            syncStatus: 'DEFERRED',
            syncError: String(error.message || 'Gemini quota unavailable.').slice(0, 2000),
            nextSyncAt: addHours(new Date(), 6),
          },
        })
        .catch(() => {});
      return {
        processed: 1,
        deferred: 1,
        error: 'Gemini budget unavailable; refresh left pending.',
        details: { deferred: true },
      };
    }
    throw error;
  }
};

export const updateScholarshipDeadlinesOperation = async () => {
  const scholarships = await prisma.scholarship.findMany({
    select: { id: true, deadline: true, status: true, lastVerifiedAt: true, sourceUrl: true },
  });

  let updated = 0;
  let unchanged = 0;
  const now = new Date();

  for (const scholarship of scholarships) {
    const nextStatus =
      scholarship.lastVerifiedAt || scholarship.sourceUrl
        ? computeScholarshipStatus(scholarship.deadline, now)
        : 'NEEDS_VERIFICATION';
    if (nextStatus === scholarship.status) {
      unchanged += 1;
      continue;
    }
    await prisma.scholarship.update({
      where: { id: scholarship.id },
      data: { status: nextStatus },
    });
    updated += 1;
  }

  return {
    processed: scholarships.length,
    updated,
    unchanged,
    details: { statuses: ['UPCOMING', 'OPEN', 'CLOSING_SOON', 'CLOSED', 'EXPIRED', 'NEEDS_VERIFICATION'] },
  };
};

