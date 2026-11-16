import prisma from '../config/database.js';
import { getScholarshipSources } from '../config/scholarshipSources.js';
import {
  fetchHipoLabsUniversities,
  fetchOpenAlexInstitution,
  fetchOpenAlexInstitutionByName,
  fetchOpenAlexAuthors,
  extractScholarshipsFromUrl,
  extractUniversityAdmissionsFromUrl,
  isGeminiConfigured,
} from './liveDataSources.js';

const envInt = (name, fallback, min, max) => {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.round(value), min), max);
};

const truncate = (value, length) => {
  if (value === undefined || value === null) return null;
  return String(value).trim().slice(0, length) || null;
};

const normalizeName = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

// "Varies" is worse than a known curated deadline, so never replace one with it.
const mergeDeadline = (extracted, existing) => {
  if (!extracted) return existing;
  if (!existing) return extracted;
  return /^varies$/i.test(String(extracted).trim()) ? existing : extracted;
};

// Keep directory countries consistent with the curated records ("USA", "UK").
const COUNTRY_ALIASES = {
  'United States': 'USA',
  'United States of America': 'USA',
  'United Kingdom': 'UK',
  'Korea, Republic of': 'South Korea',
  'Republic of Korea': 'South Korea',
  'Russian Federation': 'Russia',
  Czechia: 'Czech Republic',
};

const normalizeCountry = (country) => COUNTRY_ALIASES[String(country || '').trim()] || String(country || '').trim();

const pickHipoWebsite = (item = {}) => {
  const pages = Array.isArray(item.web_pages) ? item.web_pages.filter((page) => /^https?:\/\//i.test(page)) : [];
  const page = pages.find((candidate) => candidate.startsWith('https://')) || pages[0];
  const fallback = Array.isArray(item.domains) && item.domains[0] ? `https://${item.domains[0]}` : null;
  return truncate(page || fallback, 255);
};

/**
 * Pull the HipoLabs directory for a few countries and upsert basic university
 * records. Curated ranking/tuition data is left untouched for existing rows.
 */
export const syncUniversityCatalog = async ({
  countries = (process.env.HIPOLABS_COUNTRIES || 'United States,United Kingdom,Canada,Germany,Australia')
    .split(',')
    .map((country) => country.trim())
    .filter(Boolean),
  perCountry = envInt('HIPOLABS_LIMIT_PER_COUNTRY', 40, 1, 200),
  allowNew = process.env.HIPOLABS_CREATE_NEW === 'true',
} = {}) => {
  const defaultRanking = envInt('HIPOLABS_DEFAULT_RANKING', 9999, 1, 100000);
  const errors = [];
  let created = 0;
  let updated = 0;
  let failed = 0;
  let skipped = 0;

  const responses = await Promise.allSettled(countries.map((country) => fetchHipoLabsUniversities(country)));

  responses.forEach((response, index) => {
    if (response.status === 'rejected') {
      errors.push({ country: countries[index], message: response.reason?.message || 'HipoLabs request failed' });
    }
  });

  const candidates = responses
    .filter((response) => response.status === 'fulfilled')
    .flatMap((response) => response.value.slice(0, perCountry))
    .map((item) => ({ item, name: truncate(item.name, 150) }))
    .filter(({ item, name }) => name && item.country);

  // One lookup for the whole batch: per-row findUnique calls are too slow on a
  // remote Postgres connection once HipoLabs returns a few hundred schools.
  const existingRows = await prisma.university.findMany({
    where: { name: { in: [...new Set(candidates.map(({ name }) => name))] } },
    select: { id: true, name: true, websiteUrl: true },
  });
  const existingByName = new Map(existingRows.map((row) => [row.name, row]));

  for (const { item, name } of candidates) {
    const websiteUrl = pickHipoWebsite(item);
    const lastScraped = new Date();

    try {
      const existing = existingByName.get(name);

      if (existing) {
        await prisma.university.update({
          where: { id: existing.id },
          data: {
            websiteUrl:
              !existing.websiteUrl ||
              (websiteUrl?.startsWith('https://') && existing.websiteUrl.startsWith('http://'))
                ? websiteUrl || existing.websiteUrl
                : existing.websiteUrl,
            lastScraped,
          },
        });
        updated += 1;
      } else if (allowNew) {
        await prisma.university.create({
          data: {
            name,
            country: truncate(normalizeCountry(item.country), 100),
            ranking: defaultRanking,
            websiteUrl,
            lastScraped,
            // Discovery makes both independent syncs due immediately, but it
            // does not imply that admissions or faculty were refreshed.
            nextSyncAt: lastScraped,
            professorsNextSyncAt: lastScraped,
            syncStatus: 'DISCOVERED',
          },
        });
        created += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      failed += 1;
      errors.push({ university: name, message: error?.message || 'Database upsert failed' });
    }
  }

  return { created, updated, failed, skipped, allowNew, countries, errors };
};

const professorDataFromAuthor = (author, university) => {
  const name = truncate(author.name, 120);
  if (!name) return null;

  const topics = Array.isArray(author.topics) ? author.topics : [];
  const topicNames = topics.map((topic) => topic.name).filter(Boolean);
  const fieldNames = (topicNames.length
    ? topicNames
    : [author.primaryTopic, author.field].filter(Boolean)
  ).slice(0, 3);

  const metrics = [
    author.worksCount != null ? `${author.worksCount} works` : null,
    author.citedByCount != null ? `${author.citedByCount} citations` : null,
    author.hIndex != null ? `h-index ${author.hIndex}` : null,
  ].filter(Boolean);

  const bioParts = [`OpenAlex researcher at ${university.name}.`];
  if (metrics.length) bioParts.push(`${metrics.join(', ')}.`);
  if (topicNames.length) bioParts.push(`Research topics: ${topicNames.join(', ')}.`);

  return {
    name,
    title: truncate(`Researcher in ${author.subfield || author.field || 'higher education'}`, 80),
    department: truncate(author.subfield, 120),
    field: truncate(fieldNames.join(', ') || 'Research', 140),
    bio: bioParts.join(' '),
    openAlexId: truncate(author.openAlexId, 300),
    profileUrl: truncate(author.openAlexId, 300),
    worksCount: author.worksCount ?? null,
    citedByCount: author.citedByCount ?? null,
    hIndex: author.hIndex ?? null,
    topics: topics.length ? topics : null,
  };
};

/** Replace a university's faculty rows with the top OpenAlex authors. */
export const syncProfessorsForUniversity = async (
  university,
  { institution = null, limit = envInt('OPENALEX_AUTHORS_PER_UNIVERSITY', 20, 1, 100) } = {},
) => {
  if (!university?.id || !university?.name) {
    return { synced: 0, error: 'University is required.' };
  }

  let resolvedInstitution = institution;
  if (!resolvedInstitution) {
    resolvedInstitution = await fetchOpenAlexInstitutionByName(university.name);
  }
  if (!resolvedInstitution?.id) {
    return { synced: 0, error: `OpenAlex institution not found for ${university.name}.` };
  }

  const authors = await fetchOpenAlexAuthors(resolvedInstitution.id, { limit });
  const dataByKey = new Map();

  for (const author of authors) {
    const data = professorDataFromAuthor(author, university);
    if (!data) continue;
    // Never collapse two authors just because they share a display name.
    dataByKey.set(data.openAlexId ? `id:${data.openAlexId}` : `name:${normalizeName(data.name)}`, data);
  }

  const rows = [...dataByKey.values()];
  if (rows.length === 0) {
    return { synced: 0, found: authors.length, institutionId: resolvedInstitution.id };
  }

  const now = new Date();
  const intervalDays = Math.max(envInt('SYNC_PROFESSORS_INTERVAL_DAYS', 30, 1, 365), 30);
  const nextSyncAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  const withMetadata = rows.map((row) => ({
    ...row,
    lastSyncedAt: now,
    nextSyncAt,
    metricsUpdatedAt: now,
    syncStatus: 'SUCCESS',
    syncError: null,
  }));

  const openAlexIds = withMetadata.map((row) => row.openAlexId).filter(Boolean);
  const names = withMetadata.map((row) => row.name);
  const existing = await prisma.professor.findMany({
    where: {
      universityId: university.id,
      OR: [
        ...(openAlexIds.length ? [{ openAlexId: { in: openAlexIds } }] : []),
        { name: { in: names } },
      ],
    },
    select: { id: true, name: true, openAlexId: true, adminVerifiedAt: true },
  });
  const existingByOpenAlexId = new Map(
    existing.filter((row) => row.openAlexId).map((row) => [row.openAlexId, row]),
  );
  const existingByName = new Map(existing.map((row) => [row.name, row]));

  // OpenAlex IDs are the stable identity. A name-only row may receive an ID
  // only when it is the same university; two different names are never merged.
  const toCreate = [];
  const toUpdate = [];
  const conflicts = [];
  for (const row of withMetadata) {
    const byId = row.openAlexId ? existingByOpenAlexId.get(row.openAlexId) : null;
    const byName = existingByName.get(row.name);
    if (byId) {
      toUpdate.push({ existingId: byId.id, row });
    } else if (byName?.openAlexId) {
      // Same name but a conflicting external ID is a different person.
      conflicts.push(row.name);
    } else if (byName) {
      toUpdate.push({ existingId: byName.id, row });
    } else {
      toCreate.push(row);
    }
  }

  if (toCreate.length > 0) {
    await prisma.professor.createMany({
      data: toCreate.map((row) => ({ ...row, universityId: university.id })),
      skipDuplicates: true,
    });
  }

  if (toUpdate.length > 0) {
    await prisma.$transaction(
      toUpdate.map(({ existingId, row }) =>
        prisma.professor.update({
          where: { id: existingId },
          data: row,
        }),
      ),
    );
  }

  return {
    synced: rows.length,
    created: toCreate.length,
    updated: toUpdate.length,
    conflicts: conflicts.length,
    conflictNames: conflicts.slice(0, 10),
    found: authors.length,
    institutionId: resolvedInstitution.id,
  };
};

export const syncProfessorsForTrackedUniversities = async ({
  limit = envInt('OPENALEX_SYNC_UNIVERSITIES', 10, 1, 50),
} = {}) => {
  const universities = await prisma.university.findMany({
    orderBy: { ranking: 'asc' },
    take: limit,
    select: { id: true, name: true },
  });

  let professors = 0;
  const errors = [];
  const concurrency = envInt('OPENALEX_CONCURRENCY', 4, 1, 10);

  for (let index = 0; index < universities.length; index += concurrency) {
    const batch = universities.slice(index, index + concurrency);
    const results = await Promise.allSettled(batch.map((university) => syncProfessorsForUniversity(university)));

    results.forEach((result, resultIndex) => {
      const university = batch[resultIndex];
      if (result.status === 'fulfilled') {
        professors += result.value.synced;
        if (result.value.error) {
          errors.push({ university: university.name, message: result.value.error });
        }
      } else {
        errors.push({ university: university.name, message: result.reason?.message || 'OpenAlex sync failed' });
      }
    });
  }

  return { universities: universities.length, professors, errors };
};

const hasValue = (value) => value !== null && value !== undefined && value !== '';

/**
 * Refresh one university from OpenAlex (official site + faculty) and, when
 * Gemini is configured, from its official admissions page.
 */
export const refreshUniversityFromLiveSources = async (id, { authorLimit } = {}) => {
  const university = await prisma.university.findUnique({ where: { id } });
  if (!university) throw new Error('University not found.');

  const updates = {};
  const sources = [];
  const errors = [];
  let institution = null;

  try {
    institution = await fetchOpenAlexInstitution(university.name);
    if (institution) {
      sources.push('openalex');
      if (!university.websiteUrl && institution.homepageUrl) {
        updates.websiteUrl = truncate(institution.homepageUrl, 255);
      }
    } else {
      errors.push('No matching OpenAlex institution.');
    }
  } catch (error) {
    errors.push(`OpenAlex institution: ${error?.message || 'request failed'}`);
  }

  let professors = { synced: 0 };
  if (institution) {
    try {
      professors = await syncProfessorsForUniversity(university, { institution, limit: authorLimit });
      if (professors.error) errors.push(`OpenAlex authors: ${professors.error}`);
    } catch (error) {
      errors.push(`OpenAlex authors: ${error?.message || 'request failed'}`);
    }
  }

  const officialUrl = updates.websiteUrl || university.websiteUrl;
  if (officialUrl && isGeminiConfigured()) {
    try {
      const facts = await extractUniversityAdmissionsFromUrl(officialUrl);
      if (hasValue(facts.tuitionAnnualUsd) && facts.tuitionAnnualUsd !== university.tuitionAnnualUsd) {
        updates.tuitionAnnualUsd = facts.tuitionAnnualUsd;
      }
      if (hasValue(facts.applicationFee) && facts.applicationFee !== university.applicationFee) {
        updates.applicationFee = facts.applicationFee;
      }
      if (hasValue(facts.applicationDeadline) && facts.applicationDeadline !== university.applicationDeadline) {
        updates.applicationDeadline = facts.applicationDeadline;
      }
      if (hasValue(facts.ieltsRequirement) && facts.ieltsRequirement !== university.ieltsRequirement) {
        updates.ieltsRequirement = facts.ieltsRequirement;
      }
      if (hasValue(facts.greRequirement) && facts.greRequirement !== university.greRequirement) {
        updates.greRequirement = facts.greRequirement;
      }
      sources.push('gemini-admissions');
    } catch (error) {
      errors.push(`Admissions extraction: ${error?.message || 'request failed'}`);
    }
  }

  updates.lastScraped = new Date();
  const updated = await prisma.university.update({ where: { id }, data: updates });

  return {
    university: updated,
    professorsSynced: professors.synced,
    sources,
    errors,
    changedFields: Object.keys(updates).filter((key) => key !== 'lastScraped'),
  };
};

/** Refresh one scholarship from its official page via Gemini extraction. */
export const refreshScholarshipFromSource = async (id) => {
  const scholarship = await prisma.scholarship.findUnique({ where: { id } });
  if (!scholarship) throw new Error('Scholarship not found.');

  if (!scholarship.websiteUrl) {
    return { scholarship, extracted: 0, error: 'Scholarship has no official website URL.' };
  }
  if (!isGeminiConfigured()) {
    return { scholarship, extracted: 0, error: 'GEMINI_API_KEY is not configured.' };
  }

  const rows = await extractScholarshipsFromUrl(scholarship.websiteUrl, scholarship.country);
  const target = normalizeName(scholarship.name);
  const match =
    rows.find((row) => normalizeName(row.name) === target) ||
    rows.find((row) => normalizeName(row.name).includes(target) || target.includes(normalizeName(row.name))) ||
    (rows.length === 1 ? rows[0] : null);

  if (!match) {
    return { scholarship, extracted: rows.length, error: 'No matching scholarship found on the official page.' };
  }

  const updated = await prisma.scholarship.update({
    where: { id },
    data: {
      country: match.country || scholarship.country,
      amountUsd: match.amountUsd ?? scholarship.amountUsd,
      fundingLevel: match.fundingLevel || scholarship.fundingLevel,
      eligibility: match.eligibility ?? scholarship.eligibility,
      deadline: mergeDeadline(match.deadline, scholarship.deadline),
      websiteUrl: match.websiteUrl || scholarship.websiteUrl,
      lastScraped: new Date(),
    },
  });

  return { scholarship: updated, extracted: rows.length };
};

/** Run the Gemini scraper pipeline over every configured official source. */
export const syncScholarshipsFromSources = async ({ sources = getScholarshipSources() } = {}) => {
  if (!isGeminiConfigured()) {
    return { skipped: true, reason: 'GEMINI_API_KEY is not configured.', created: 0, updated: 0, errors: [] };
  }

  let created = 0;
  let updated = 0;
  const errors = [];
  const seen = new Set();

  for (const source of sources) {
    try {
      const rows = await extractScholarshipsFromUrl(source.url, source.country);
      for (const row of rows) {
        const key = normalizeName(row.name);
        if (!key || seen.has(key)) continue;
        seen.add(key);

        const data = {
          country: truncate(row.country || source.country, 100),
          amountUsd: row.amountUsd ?? null,
          fundingLevel: truncate(row.fundingLevel || 'Partial', 50),
          eligibility: row.eligibility ?? null,
          deadline: truncate(row.deadline, 100),
          websiteUrl: truncate(row.websiteUrl || source.url, 255),
          lastScraped: new Date(),
        };

        const existing = await prisma.scholarship.findUnique({
          where: { name: row.name },
        });

        if (existing) {
          await prisma.scholarship.update({
            where: { id: existing.id },
            data: {
              country: data.country || existing.country,
              amountUsd: data.amountUsd ?? existing.amountUsd,
              fundingLevel: data.fundingLevel || existing.fundingLevel,
              eligibility: data.eligibility ?? existing.eligibility,
              deadline: mergeDeadline(data.deadline, existing.deadline),
              websiteUrl:
                data.websiteUrl && data.websiteUrl !== source.url
                  ? data.websiteUrl
                  : existing.websiteUrl || data.websiteUrl,
              lastScraped: data.lastScraped,
            },
          });
          updated += 1;
        } else {
          await prisma.scholarship.create({ data: { name: row.name, ...data } });
          created += 1;
        }
      }
    } catch (error) {
      errors.push({ url: source.url, message: error?.message || 'Extraction failed' });
    }
  }

  return { created, updated, errors };
};

export const runDynamicBackgroundSync = async () => {
  const errors = [];

  console.log('[Dynamic Sync]: Refreshing the university directory from HipoLabs...');
  const catalog = await syncUniversityCatalog().catch((error) => {
    errors.push(`University catalog: ${error?.message || 'sync failed'}`);
    return null;
  });
  console.log(`[Dynamic Sync]: Directory done (${catalog?.updated || 0} enriched, ${catalog?.created || 0} new).`);

  console.log('[Dynamic Sync]: Refreshing faculty from OpenAlex...');
  const professors = await syncProfessorsForTrackedUniversities().catch((error) => {
    errors.push(`Professors: ${error?.message || 'sync failed'}`);
    return null;
  });
  console.log(`[Dynamic Sync]: Faculty done (${professors?.professors || 0} profiles).`);

  console.log('[Dynamic Sync]: Extracting scholarships from official sources...');
  const scholarships = await syncScholarshipsFromSources().catch((error) => {
    errors.push(`Scholarships: ${error?.message || 'sync failed'}`);
    return null;
  });
  console.log(`[Dynamic Sync]: Scholarships done (${scholarships?.created || 0} new, ${scholarships?.updated || 0} updated).`);

  if (catalog?.errors) errors.push(...catalog.errors.map((item) => `University ${item.university || item.country}: ${item.message}`));
  if (professors?.errors) errors.push(...professors.errors.map((item) => `Professor ${item.university}: ${item.message}`));
  if (scholarships?.errors) errors.push(...scholarships.errors.map((item) => `Scholarship ${item.url}: ${item.message}`));

  return { catalog, professors, scholarships, errors };
};
