import prisma from '../../config/database.js';
import { createNotificationForFollowers } from '../notifications/notifications.service.js';
import {
  fetchHipoLabsUniversities,
  fetchOpenAlexInstitutionByName,
  searchHipoLabsUniversities,
} from '../../services/liveDataSources.js';
import { runManualSync, syncFailure } from '../../services/syncRunner.js';
import { SYNC_JOB_TYPES } from '../../services/syncJobs.js';

/**
 * Update university details and optionally broadcast update notifications to all followers.
 */
export const updateUniversity = async (universityId, payload = {}) => {
  if (!universityId) {
    return { status: 400, body: { success: false, message: 'University ID is required.' } };
  }

  const {
    name,
    country,
    city,
    ranking,
    tuitionAnnualUsd,
    acceptanceRate,
    applicationFee,
    applicationDeadline,
    ieltsRequirement,
    greRequirement,
    websiteUrl,
    courses,
    notifyFollowers = true,
    customNotificationTitle,
    customNotificationMessage,
  } = payload;

  try {
    const existing = await prisma.university.findUnique({
      where: { id: universityId },
      include: {
        _count: {
          select: { followers: true },
        },
      },
    });

    if (!existing) {
      return { status: 404, body: { success: false, message: 'University not found.' } };
    }

    const updateData = {};
    if (name !== undefined && typeof name === 'string') updateData.name = name.trim();
    if (country !== undefined && typeof country === 'string') updateData.country = country.trim();
    if (city !== undefined) updateData.city = city ? String(city).trim() : null;
    if (ranking !== undefined) updateData.ranking = Number(ranking);
    if (tuitionAnnualUsd !== undefined) updateData.tuitionAnnualUsd = tuitionAnnualUsd !== '' && tuitionAnnualUsd !== null ? Number(tuitionAnnualUsd) : null;
    if (acceptanceRate !== undefined) updateData.acceptanceRate = acceptanceRate !== '' && acceptanceRate !== null ? Number(acceptanceRate) : null;
    if (applicationFee !== undefined) updateData.applicationFee = applicationFee !== '' && applicationFee !== null ? Number(applicationFee) : null;
    if (applicationDeadline !== undefined) updateData.applicationDeadline = applicationDeadline ? String(applicationDeadline).trim() : null;
    if (ieltsRequirement !== undefined) updateData.ieltsRequirement = ieltsRequirement !== '' && ieltsRequirement !== null ? Number(ieltsRequirement) : null;
    if (greRequirement !== undefined) updateData.greRequirement = greRequirement !== '' && greRequirement !== null ? Number(greRequirement) : null;
    if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl ? String(websiteUrl).trim() : null;
    if (courses !== undefined) updateData.courses = courses;
    // Administrator edits become protected provenance for future automation.
    updateData.adminVerifiedAt = new Date();

    const updated = await prisma.university.update({
      where: { id: universityId },
      data: updateData,
    });

    let notifiedFollowersCount = 0;

    // If notifications are requested and there are followers
    if (notifyFollowers && existing._count.followers > 0) {
      const changesList = [];
      if (applicationDeadline && applicationDeadline !== existing.applicationDeadline) {
        changesList.push(`Application Deadline updated to ${applicationDeadline}`);
      }
      if (tuitionAnnualUsd !== undefined && tuitionAnnualUsd !== existing.tuitionAnnualUsd) {
        changesList.push(`Annual Tuition updated to $${Number(tuitionAnnualUsd).toLocaleString()}`);
      }
      if (ieltsRequirement !== undefined && ieltsRequirement !== existing.ieltsRequirement) {
        changesList.push(`IELTS Requirement updated to ${ieltsRequirement}`);
      }
      if (greRequirement !== undefined && greRequirement !== existing.greRequirement) {
        changesList.push(`GRE Requirement updated to ${greRequirement}`);
      }

      const notifTitle = customNotificationTitle?.trim() || `Admission Update: ${updated.name}`;
      const notifMessage =
        customNotificationMessage?.trim() ||
        (changesList.length > 0
          ? `${updated.name} has updated their admissions criteria: ${changesList.join('; ')}.`
          : `${updated.name} updated their program information and admission details.`);

      const notifResult = await createNotificationForFollowers({
        universityId: updated.id,
        title: notifTitle,
        message: notifMessage,
        type: 'ADMISSION_UPDATE',
        metadata: {
          universityName: updated.name,
          country: updated.country,
          deadline: updated.applicationDeadline,
          tuition: updated.tuitionAnnualUsd,
          actionUrl: `/universities?search=${encodeURIComponent(updated.name)}`,
        },
      });

      notifiedFollowersCount = notifResult.count;
    }

    return {
      status: 200,
      body: {
        success: true,
        message: `University details updated successfully.${notifiedFollowersCount > 0 ? ` Notified ${notifiedFollowersCount} student follower(s).` : ''}`,
        data: updated,
        notifiedFollowersCount,
      },
    };
  } catch (error) {
    console.error('updateUniversity error:', error);
    return { status: 500, body: { success: false, message: 'Failed to update university details.' } };
  }
};

/**
 * Broadcast an announcement directly to followers of a university.
 */
export const broadcastAnnouncement = async (universityId, payload = {}) => {
  const { title, message, type = 'ADMISSION_UPDATE' } = payload;

  if (!universityId || !title?.trim() || !message?.trim()) {
    return {
      status: 400,
      body: { success: false, message: 'University ID, title, and message are required.' },
    };
  }

  try {
    const university = await prisma.university.findUnique({
      where: { id: universityId },
    });

    if (!university) {
      return { status: 404, body: { success: false, message: 'University not found.' } };
    }

    const { count } = await createNotificationForFollowers({
      universityId,
      title: title.trim(),
      message: message.trim(),
      type,
      metadata: {
        universityName: university.name,
        country: university.country,
        actionUrl: `/universities?search=${encodeURIComponent(university.name)}`,
      },
    });

    return {
      status: 201,
      body: {
        success: true,
        message: `Announcement broadcasted to ${count} follower(s) of ${university.name}.`,
        recipientCount: count,
      },
    };
  } catch (error) {
    console.error('broadcastAnnouncement error:', error);
    return { status: 500, body: { success: false, message: 'Failed to broadcast announcement.' } };
  }
};

/**
 * Update scholarship details and optionally notify followers of related universities in the country.
 */
export const updateScholarship = async (scholarshipId, payload = {}) => {
  if (!scholarshipId) {
    return { status: 400, body: { success: false, message: 'Scholarship ID is required.' } };
  }

  const {
    name,
    country,
    amountUsd,
    fundingLevel,
    eligibility,
    deadline,
    websiteUrl,
    notifyFollowers = false,
    targetUniversityId,
  } = payload;

  try {
    const existing = await prisma.scholarship.findUnique({
      where: { id: scholarshipId },
    });

    if (!existing) {
      return { status: 404, body: { success: false, message: 'Scholarship not found.' } };
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (country !== undefined) updateData.country = country.trim();
    if (amountUsd !== undefined) updateData.amountUsd = amountUsd !== '' && amountUsd !== null ? Number(amountUsd) : null;
    if (fundingLevel !== undefined) updateData.fundingLevel = fundingLevel.trim();
    if (eligibility !== undefined) updateData.eligibility = eligibility ? String(eligibility).trim() : null;
    if (deadline !== undefined) updateData.deadline = deadline ? String(deadline).trim() : null;
    if (websiteUrl !== undefined) updateData.websiteUrl = websiteUrl ? String(websiteUrl).trim() : null;
    updateData.adminVerifiedAt = new Date();

    const updated = await prisma.scholarship.update({
      where: { id: scholarshipId },
      data: updateData,
    });

    let notifiedCount = 0;

    if (notifyFollowers) {
      // If targetUniversityId is provided, notify its followers
      if (targetUniversityId) {
        const notifResult = await createNotificationForFollowers({
          universityId: targetUniversityId,
          title: `Scholarship Update: ${updated.name}`,
          message: `New scholarship opportunity updated: ${updated.name} (${updated.fundingLevel}, $${updated.amountUsd?.toLocaleString() || 'Varies'}). Deadline: ${updated.deadline || 'Ongoing'}.`,
          type: 'SCHOLARSHIP_UPDATE',
          metadata: {
            scholarshipName: updated.name,
            country: updated.country,
            deadline: updated.deadline,
            actionUrl: `/scholarships?search=${encodeURIComponent(updated.name)}`,
          },
        });
        notifiedCount = notifResult.count;
      }
    }

    return {
      status: 200,
      body: {
        success: true,
        message: 'Scholarship updated successfully.',
        data: updated,
        notifiedCount,
      },
    };
  } catch (error) {
    console.error('updateScholarship error:', error);
    return { status: 500, body: { success: false, message: 'Failed to update scholarship.' } };
  }
};

/**
 * Get quick admin dashboard stats.
 */
export const getAdminStats = async () => {
  try {
    const [
      universityCount,
      scholarshipCount,
      studentCount,
      followCount,
      notificationCount,
      recentFollows,
    ] = await Promise.all([
      prisma.university.count(),
      prisma.scholarship.count(),
      prisma.student.count(),
      prisma.followedUniversity.count(),
      prisma.notification.count(),
      prisma.followedUniversity.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { id: true, name: true, email: true } },
          university: { select: { id: true, name: true, country: true } },
        },
      }),
    ]);

    return {
      status: 200,
      body: {
        success: true,
        data: {
          universityCount,
          scholarshipCount,
          studentCount,
          totalFollows: followCount,
          totalNotificationsSent: notificationCount,
          recentFollows,
        },
      },
    };
  } catch (error) {
    console.error('getAdminStats error:', error);
    return { status: 500, body: { success: false, message: 'Failed to get admin statistics.' } };
  }
};

const COUNTRY_ALIASES = {
  usa: 'United States',
  us: 'United States',
  'united states of america': 'United States',
  uk: 'United Kingdom',
  gb: 'United Kingdom',
  'great britain': 'United Kingdom',
};

const normalizeName = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]/g, '');

const normalizeCountryName = (country = '') => {
  const raw = String(country).trim();
  return COUNTRY_ALIASES[raw.toLowerCase()] || raw;
};

const safeWebsite = (value) => {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
};

const websiteFromHipo = (row = {}) => {
  const pages = Array.isArray(row.web_pages) ? row.web_pages : [];
  const page = pages.find((value) => /^https?:\/\//i.test(String(value || '')));
  return safeWebsite(page) || safeWebsite(row.domains?.[0] ? `https://${row.domains[0]}` : null);
};

const mapWithConcurrency = async (items, concurrency, mapper) => {
  const results = new Array(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
};

/** Step 1: HipoLabs directory. Step 2: exact-name OpenAlex metrics. */
export const discoverUniversities = async ({ country, query, limit = 10 } = {}) => {
  const rawCountry = String(country || '').trim();
  const search = String(query || '').trim().slice(0, 120);
  if (!rawCountry && !search) {
    return { status: 400, body: { success: false, message: 'Enter a university name or a country.' } };
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 25);
  const hipoCountry = rawCountry ? normalizeCountryName(rawCountry) : '';
  const warnings = [];

  let hipoRows;
  try {
    hipoRows = await searchHipoLabsUniversities({
      country: hipoCountry || undefined,
      name: search || undefined,
    });
  } catch (error) {
    return {
      status: 502,
      body: {
        success: false,
        message: `HipoLabs directory lookup failed: ${error?.message || 'request failed'}`,
      },
    };
  }

  const candidates = new Map();
  const searchKey = normalizeName(search);
  for (const row of hipoRows) {
    const name = String(row.name || '').trim();
    const candidateCountry = String(row.country || hipoCountry || '').trim();
    const key = normalizeName(name);
    if (!name || !key || !candidateCountry || candidates.has(key)) continue;
    if (searchKey && !normalizeName(name).includes(searchKey)) continue;

    candidates.set(key, {
      name,
      country: candidateCountry,
      countryCode: row.alpha_two_code || null,
      websiteUrl: websiteFromHipo(row),
      source: 'HipoLabs',
      sourceRank: candidates.size + 1,
      citedByCount: null,
      openAlexId: null,
    });
  }

  if (candidates.size === 0) {
    warnings.push(`HipoLabs returned no universities for ${search || hipoCountry || 'that search'}.`);
  }

  const selected = [...candidates.values()].slice(0, safeLimit);
  let enrichmentFailures = 0;
  let openAlexRateLimit = null;
  const results = await mapWithConcurrency(selected, 5, async (candidate) => {
    if (openAlexRateLimit) return candidate;
    try {
      const institution = await fetchOpenAlexInstitutionByName(candidate.name, {
        countryCode: candidate.countryCode,
      });
      if (!institution) return candidate;

      return {
        ...candidate,
        source: 'HipoLabs + OpenAlex',
        openAlexId: institution.id || null,
        citedByCount: institution.citedByCount,
        websiteUrl: candidate.websiteUrl || safeWebsite(institution.homepageUrl),
      };
    } catch (error) {
      enrichmentFailures += 1;
      if (error?.isOpenAlexRateLimit) openAlexRateLimit = error;
      return candidate;
    }
  });

  if (openAlexRateLimit) {
    warnings.push(
      'OpenAlex daily budget is exhausted for this network, so citation metrics are unavailable. HipoLabs results are still valid. Add OPENALEX_API_KEY to backend/.env for a dedicated budget, or retry after midnight UTC.',
    );
  } else if (enrichmentFailures > 0) {
    warnings.push(`OpenAlex metrics unavailable for ${enrichmentFailures} universit${enrichmentFailures === 1 ? 'y' : 'ies'}.`);
  }

  const names = results.map((item) => item.name);
  const existingRows = names.length
    ? await prisma.university.findMany({
        where: { name: { in: names } },
        select: { id: true, name: true, country: true, websiteUrl: true },
      })
    : [];
  const existingByName = new Map(existingRows.map((row) => [row.name, row]));

  return {
    status: 200,
    body: {
      success: true,
      data: {
        country: hipoCountry || null,
        query: search || null,
        limit: safeLimit,
        results: results.map((item) => {
          const existing = existingByName.get(item.name);
          return {
            ...item,
            existing: Boolean(existing),
            id: existing?.id || null,
          };
        }),
        warnings,
      },
    },
  };
};

/** Create a discovered university, then run the full university sync. */
export const importAndSyncUniversity = async (payload = {}, adminId = null) => {
  const requestedName = String(payload.name || '').trim().slice(0, 150);
  const requestedCountry = String(payload.country || '').trim().slice(0, 100);
  const name = requestedName;
  const country = requestedCountry;
  if (!name || !country) {
    return { status: 400, body: { success: false, message: 'University name and country are required.' } };
  }

  try {
    // The discovery list comes from HipoLabs; re-read its verified directory
    // record so the canonical name, country and website are used on import.
    let hipoMatch = null;
    try {
      const hipoRows = await fetchHipoLabsUniversities(normalizeCountryName(country));
      const target = normalizeName(name);
      hipoMatch = hipoRows.find((item) => normalizeName(item.name) === target) || null;
    } catch (error) {
      console.warn('HipoLabs import lookup failed:', error?.message || error);
    }

    const canonicalName = String(hipoMatch?.name || name).trim().slice(0, 150);
    const canonicalCountry = normalizeCountryName(hipoMatch?.country || country).slice(0, 100);
    const websiteUrl = safeWebsite(payload.websiteUrl) || websiteFromHipo(hipoMatch);
    const existing = await prisma.university.findFirst({
      where: { name: { in: [...new Set([canonicalName, name])] } },
    });
    let university = existing;
    let created = false;

    if (!university) {
      university = await prisma.university.create({
        data: {
          name: canonicalName,
          country: canonicalCountry,
          city: payload.city ? String(payload.city).trim().slice(0, 100) : null,
          ranking: Math.min(Math.max(Number(payload.ranking) || 9999, 1), 100000),
          websiteUrl,
          syncStatus: 'IMPORTED',
        },
      });
      created = true;
    } else if (!university.websiteUrl && websiteUrl) {
      university = await prisma.university.update({
        where: { id: university.id },
        data: { websiteUrl },
      });
    }

    const outcome = await runManualSync({
      type: SYNC_JOB_TYPES.UNIVERSITY,
      adminId: adminId || null,
      targetType: 'university',
      targetId: university.id,
      details: { import: created, source: payload.source || null },
    });
    const refreshed = await prisma.university.findUnique({ where: { id: university.id } });

    return {
      status: 200,
      body: {
        success: true,
        message: `${created ? 'Added and synced' : 'Synced'} ${refreshed.name}.`,
        data: {
          university: refreshed,
          created,
          job: outcome.job,
          result: outcome.result,
        },
      },
    };
  } catch (error) {
    console.error('importAndSyncUniversity error:', error);
    return syncFailure(error, 'Failed to add and sync the university.');
  }
};

export const listUsers = async ({ search, page = 1, limit = 50 } = {}) => {
  try {
    const term = String(search || '').trim().slice(0, 100);
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const where = term
      ? {
          OR: [
            { name: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
            { country: { contains: term, mode: 'insensitive' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.student.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        select: {
          id: true,
          name: true,
          email: true,
          country: true,
          institution: true,
          subject: true,
          role: true,
          createdAt: true,
          _count: { select: { followedUniversities: true, notifications: true, journeys: true } },
        },
      }),
      prisma.student.count({ where }),
    ]);

    return {
      status: 200,
      body: {
        success: true,
        data: {
          items: users,
          pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: Math.max(1, Math.ceil(total / safeLimit)),
          },
        },
      },
    };
  } catch (error) {
    console.error('listUsers error:', error);
    return { status: 500, body: { success: false, message: 'Failed to load users.' } };
  }
};

export const deleteUser = async (userId, actorId) => {
  if (!userId) return { status: 400, body: { success: false, message: 'User ID is required.' } };
  if (userId === actorId) {
    return { status: 400, body: { success: false, message: 'You cannot delete your own admin account.' } };
  }

  try {
    const user = await prisma.student.findUnique({ where: { id: userId } });
    if (!user) return { status: 404, body: { success: false, message: 'User not found.' } };
    await prisma.student.delete({ where: { id: userId } });
    return { status: 200, body: { success: true, message: `Deleted ${user.name}'s account.` } };
  } catch (error) {
    console.error('deleteUser error:', error);
    return { status: 500, body: { success: false, message: 'Failed to delete user.' } };
  }
};

export const deleteUniversity = async (universityId) => {
  try {
    const university = await prisma.university.findUnique({ where: { id: universityId } });
    if (!university) return { status: 404, body: { success: false, message: 'University not found.' } };
    await prisma.university.delete({ where: { id: universityId } });
    return { status: 200, body: { success: true, message: `Deleted ${university.name}.` } };
  } catch (error) {
    console.error('deleteUniversity error:', error);
    return { status: 500, body: { success: false, message: 'Failed to delete university.' } };
  }
};

export const deleteScholarship = async (scholarshipId) => {
  try {
    const scholarship = await prisma.scholarship.findUnique({ where: { id: scholarshipId } });
    if (!scholarship) return { status: 404, body: { success: false, message: 'Scholarship not found.' } };
    await prisma.scholarship.delete({ where: { id: scholarshipId } });
    return { status: 200, body: { success: true, message: `Deleted ${scholarship.name}.` } };
  } catch (error) {
    console.error('deleteScholarship error:', error);
    return { status: 500, body: { success: false, message: 'Failed to delete scholarship.' } };
  }
};

export const deleteProfessor = async (professorId) => {
  try {
    const professor = await prisma.professor.findUnique({ where: { id: professorId } });
    if (!professor) return { status: 404, body: { success: false, message: 'Professor not found.' } };
    await prisma.professor.delete({ where: { id: professorId } });
    return { status: 200, body: { success: true, message: `Deleted ${professor.name}.` } };
  } catch (error) {
    console.error('deleteProfessor error:', error);
    return { status: 500, body: { success: false, message: 'Failed to delete professor.' } };
  }
};
