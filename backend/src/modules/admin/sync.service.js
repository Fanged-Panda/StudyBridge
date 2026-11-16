import prisma from '../../config/database.js';
import { getGeminiUsage } from '../../services/geminiQuota.js';
import { computeScholarshipStatus } from '../../services/syncOperations.js';
import { getJob, getJobs, getRunningJobs } from '../../services/syncJobs.js';
import { runManualSync } from '../../services/syncRunner.js';

const serializeJob = (job) => ({
  ...job,
  durationMs:
    job.startedAt && job.finishedAt
      ? new Date(job.finishedAt).getTime() - new Date(job.startedAt).getTime()
      : null,
});

export const getSyncOverview = async () => {
  const now = new Date();
  const staleWhere = { OR: [{ nextSyncAt: null }, { nextSyncAt: { lt: now } }] };

  const [
    universityCount,
    scholarshipCount,
    professorCount,
    lastSuccess,
    runningJobs,
    failedJobs,
    staleUniversities,
    staleScholarships,
    staleProfessors,
    missingWebsites,
    missingDeadlines,
    missingSourceUrls,
    unverifiedProfessors,
    sourceGroups,
    sources,
    usage,
    failedCount,
  ] = await Promise.all([
    prisma.university.count(),
    prisma.scholarship.count(),
    prisma.professor.count(),
    prisma.syncJob.findFirst({
      where: { status: { in: ['SUCCESS', 'PARTIAL'] } },
      orderBy: { finishedAt: 'desc' },
    }),
    getRunningJobs(),
    prisma.syncJob.findMany({
      where: { status: { in: ['FAILED', 'DEFERRED'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.university.count({ where: staleWhere }),
    prisma.scholarship.count({ where: staleWhere }),
    prisma.professor.count({ where: staleWhere }),
    prisma.university.count({ where: { OR: [{ websiteUrl: null }, { websiteUrl: '' }] } }),
    prisma.scholarship.count({ where: { OR: [{ deadline: null }, { deadline: '' }] } }),
    prisma.scholarship.count({ where: { OR: [{ sourceUrl: null }, { sourceUrl: '' }] } }),
    prisma.professor.count({ where: { openAlexId: null } }),
    prisma.scholarshipSource.groupBy({ by: ['syncStatus'], _count: { _all: true } }),
    prisma.scholarshipSource.findMany({ orderBy: { lastFetchedAt: 'desc' }, take: 20 }),
    getGeminiUsage(),
    prisma.syncJob.count({ where: { status: 'FAILED' } }),
  ]);

  const activeStatuses = ['UPCOMING', 'OPEN', 'CLOSING_SOON'];
  const activeCandidates = await prisma.scholarship.findMany({
    where: { status: { in: activeStatuses } },
    select: { id: true, name: true, deadline: true, status: true },
    take: 1000,
  });
  const expiredStillActive = activeCandidates.filter(
    (row) => computeScholarshipStatus(row.deadline) === 'EXPIRED',
  );

  const sourceHealth = sourceGroups.reduce(
    (acc, row) => {
      const key = row.syncStatus || 'UNKNOWN';
      acc[key] = row._count._all;
      return acc;
    },
    {},
  );

  const unverifiedSourceCount = sources.filter(
    (source) => !source.lastVerifiedAt || source.syncStatus === 'FETCH_FAILED',
  ).length;

  return {
    counts: {
      universities: universityCount,
      scholarships: scholarshipCount,
      professors: professorCount,
    },
    lastSuccessfulSync: lastSuccess ? serializeJob(lastSuccess) : null,
    runningJobs: runningJobs.map(serializeJob),
    failedJobs: failedJobs.map(serializeJob),
    failedJobCount: failedCount,
    stale: {
      universities: staleUniversities,
      scholarships: staleScholarships,
      professors: staleProfessors,
    },
    quality: {
      staleAdmissionRequirements: staleUniversities,
      missingUniversityWebsites: missingWebsites,
      missingDeadlines,
      missingScholarshipSourceUrls: missingSourceUrls,
      unverifiedProfessorMatches: unverifiedProfessors,
      expiredStillMarkedActive: expiredStillActive.length,
      expiredExamples: expiredStillActive.slice(0, 5),
      failedExtractionJobs: failedCount,
    },
    dataSources: {
      hipoLabs: { configured: true, keyRequired: false },
      openAlex: { configured: true, apiKeyConfigured: Boolean(process.env.OPENALEX_API_KEY) },
      gemini: {
        configured: Boolean(process.env.GEMINI_API_KEY),
        chatEnabled: usage.chatEnabled,
        syncEnabled: usage.syncEnabled,
      },
      scholarshipSources: {
        total: sources.length,
        unverified: unverifiedSourceCount,
        health: sourceHealth,
        recent: sources.map((source) => ({
          id: source.id,
          url: source.url,
          name: source.name,
          syncStatus: source.syncStatus,
          syncError: source.syncError,
          lastFetchedAt: source.lastFetchedAt,
          lastExtractedAt: source.lastExtractedAt,
          needsExtraction: source.needsExtraction,
        })),
      },
    },
    geminiUsage: usage,
    generatedAt: new Date(),
  };
};

export const listSyncJobs = async (query = {}) => {
  const jobs = await getJobs({
    limit: query.limit,
    status: query.status,
    type: query.type,
  });
  return jobs.map(serializeJob);
};

export const getSyncJob = async (id) => {
  if (!id) return null;
  const job = await getJob(id);
  return job ? serializeJob(job) : null;
};

export const triggerManualSync = async ({ type, adminId, targetType, targetId, details, actor }) => {
  const outcome = await runManualSync({
    type,
    adminId: adminId || null,
    targetType,
    targetId,
    details: { ...(details || {}), actor: actor || null },
  });

  return {
    job: serializeJob(outcome.job),
    result: outcome.result,
  };
};

export const getSyncActions = () => [
  { id: 'UNIVERSITY_CATALOG', label: 'Sync all universities', scope: 'bulk' },
  { id: 'UNIVERSITY', label: 'Sync a particular university', scope: 'university' },
  { id: 'ADMISSIONS', label: 'Sync admission requirements', scope: 'bulk' },
  { id: 'SCHOLARSHIPS', label: 'Sync all scholarships', scope: 'bulk' },
  { id: 'SCHOLARSHIP', label: 'Sync a particular scholarship', scope: 'scholarship' },
  { id: 'PROFESSORS', label: 'Sync professors for a university', scope: 'university' },
  { id: 'RESEARCH_METRICS', label: 'Refresh research metrics', scope: 'bulk' },
  { id: 'SCHOLARSHIP_SOURCES', label: 'Check scholarship source pages', scope: 'bulk' },
  { id: 'SCHOLARSHIP_EXTRACTION', label: 'Extract changed scholarships', scope: 'bulk' },
  { id: 'SCHOLARSHIP_DEADLINES', label: 'Update scholarship deadlines', scope: 'bulk' },
];

