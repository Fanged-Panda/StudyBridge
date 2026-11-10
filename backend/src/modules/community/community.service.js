import { createHash, randomBytes } from 'node:crypto';
import prisma from '../../config/database.js';
import {
  LIMITS,
  REPORT_REASONS,
  buildExcerpt,
  isReservedSlug,
  slugify,
  validateComment,
  validateContact,
  validateJourney,
  validateReport,
} from './community.validation.js';
import { appUrl, isEmailConfigured, sendContactEmail, sendMagicLinkEmail } from './community.email.js';
import { hit, looksLikeSpam } from './community.rateLimit.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MANAGE_LINK_TTL_MS = 7 * DAY_MS;
const DEFAULT_PAGE_SIZE = 9;

export const STATUSES = ['pending', 'approved', 'rejected'];
export { REPORT_REASONS };

export class CommunityError extends Error {
  constructor(message, status = 400, code = 'COMMUNITY_ERROR', errors) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function toPublicJourney(row, { withStory = false } = {}) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    ...(withStory ? { story: row.story } : {}),
    author: {
      id: row.authorId || null,
      name: row.authorName,
      // The author's own avatar comes from their profile; the uploaded image
      // belongs to the post itself.
      photo: row.author?.profileImage || null,
      initials: initials(row.authorName),
    },
    image: row.photoData || null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.createdAt,
    contactable: Boolean(row.allowContact),
    score: Number(row.score) || 0,
    myVote: Number(row.myVote) || 0,
    commentCount: Number(row.commentCount) || 0,
    isAuthor: Boolean(row.isAuthor),
  };
}

/** Vote totals and comment counts for a page of posts, in two extra queries. */
async function withSocialCounts(rows, viewerId) {
  if (!rows.length) return rows;
  const ids = rows.map((row) => row.id);

  const [totals, mine] = await Promise.all([
    prisma.journeyVote.groupBy({ by: ['journeyId'], where: { journeyId: { in: ids } }, _sum: { value: true } }),
    viewerId
      ? prisma.journeyVote.findMany({ where: { journeyId: { in: ids }, userId: viewerId }, select: { journeyId: true, value: true } })
      : [],
  ]);

  const scoreByJourney = new Map(totals.map((entry) => [entry.journeyId, entry._sum.value || 0]));
  const mineByJourney = new Map(mine.map((entry) => [entry.journeyId, entry.value]));

  return rows.map((row) => ({
    ...row,
    score: scoreByJourney.get(row.id) || 0,
    myVote: mineByJourney.get(row.id) || 0,
    commentCount: row._count?.comments ?? 0,
    isAuthor: Boolean(viewerId && row.authorId === viewerId),
  }));
}

function parsePaging({ page, limit }, fallbackLimit = DEFAULT_PAGE_SIZE) {
  const safeLimit = Math.min(Math.max(Number(limit) || fallbackLimit, 1), 30);
  const safePage = Math.max(Number(page) || 1, 1);
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

function requireNotSpam(payload, ip) {
  if (looksLikeSpam(payload)) {
    throw new CommunityError('This submission could not be processed.', 400, 'SPAM_DETECTED');
  }
  return ip;
}

function enforceRate(key, limit, windowMs, message) {
  const result = hit(key, limit, windowMs);
  if (!result.allowed) {
    throw new CommunityError(
      `${message} Please try again in ${Math.ceil(result.retryAfterSeconds / 60) || 1} minute(s).`,
      429,
      'RATE_LIMITED',
    );
  }
}

async function uniqueSlug(title) {
  const base = slugify(title) || 'journey';
  const root = isReservedSlug(base) ? `${base}-story` : base;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${randomBytes(2).toString('hex')}`;
    const existing = await prisma.journey.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  return `${root}-${randomBytes(4).toString('hex')}`;
}

async function issueManageLink(journey, kind = 'submitted') {
  const token = randomBytes(32).toString('base64url');
  await prisma.journeyEditLink.create({
    data: {
      journeyId: journey.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + MANAGE_LINK_TTL_MS),
    },
  });

  const link = `${appUrl()}/community/manage/${token}`;
  const result = await sendMagicLinkEmail({ journey, link, kind });
  return { link, delivered: result.delivered };
}

/* ------------------------------------------------------------------ */
/* Public reads                                                        */
/* ------------------------------------------------------------------ */

export async function listPublicJourneys({ search, tag, page, limit, viewerId } = {}) {
  const paging = parsePaging({ page, limit });
  const term = String(search ?? '').trim().slice(0, 80);
  const activeTag = String(tag ?? '').trim().slice(0, LIMITS.tag);

  const where = { status: 'approved' };
  if (activeTag) where.tags = { has: activeTag };
  if (term) {
    where.AND = [
      {
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { excerpt: { contains: term, mode: 'insensitive' } },
          { story: { contains: term, mode: 'insensitive' } },
          { authorName: { contains: term, mode: 'insensitive' } },
        ],
      },
    ];
  }

  const [idRows, total] = await Promise.all([
    prisma.journey.findMany({
      where,
      orderBy: { approvedAt: 'desc' },
      select: { id: true },
    }),
    prisma.journey.count({ where }),
  ]);

  // Rank by net score (upvotes minus downvotes). Prisma cannot order a page by
  // the sum of a relation, so score the matching ids first, then fetch only the
  // requested page in that order. Sorting is stable, so equal scores keep the
  // newest-approved-first order from above.
  const scoreRows = idRows.length
    ? await prisma.journeyVote.groupBy({
        by: ['journeyId'],
        where: { journeyId: { in: idRows.map((row) => row.id) } },
        _sum: { value: true },
      })
    : [];
  const scoreById = new Map(scoreRows.map((row) => [row.journeyId, row._sum.value || 0]));
  const rankedIds = idRows
    .map((row) => row.id)
    .sort((a, b) => (scoreById.get(b) || 0) - (scoreById.get(a) || 0))
    .slice(paging.skip, paging.skip + paging.limit);

  const rows = rankedIds.length
    ? await prisma.journey.findMany({
        where: { id: { in: rankedIds } },
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          authorName: true,
          authorId: true,
          photoData: true,
          tags: true,
          allowContact: true,
          createdAt: true,
          approvedAt: true,
          author: { select: { profileImage: true } },
          _count: { select: { comments: true } },
        },
      })
    : [];

  const rankById = new Map(rankedIds.map((id, index) => [id, index]));
  rows.sort((a, b) => rankById.get(a.id) - rankById.get(b.id));

  const items = await withSocialCounts(rows, viewerId);

  return {
    items: items.map((row) => toPublicJourney(row)),
    pagination: {
      page: paging.page,
      limit: paging.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / paging.limit)),
    },
    activeTag: activeTag || null,
    search: term,
  };
}

export async function getPublicJourney(slug, viewerId) {
  const journey = await prisma.journey.findFirst({
    where: { slug: String(slug), status: 'approved' },
    include: {
      author: { select: { profileImage: true } },
      _count: { select: { comments: true } },
    },
  });

  if (!journey) {
    throw new CommunityError('This journey could not be found. It may have been removed.', 404, 'JOURNEY_NOT_FOUND');
  }

  prisma.journey
    .update({ where: { id: journey.id }, data: { views: { increment: 1 } } })
    .catch(() => {});

  const [row] = await withSocialCounts([journey], viewerId);

  return toPublicJourney(row, { withStory: true });
}

/* ------------------------------------------------------------------ */
/* Reader comments                                                     */
/* ------------------------------------------------------------------ */

function toPublicComment(row) {
  return {
    id: row.id,
    parentId: row.parentId || null,
    authorName: row.authorName,
    body: row.body,
    createdAt: row.createdAt,
  };
}

async function approvedJourneyBySlug(slug) {
  const journey = await prisma.journey.findFirst({
    where: { slug: String(slug), status: 'approved' },
    select: { id: true },
  });
  if (!journey) {
    throw new CommunityError('This journey could not be found.', 404, 'JOURNEY_NOT_FOUND');
  }
  return journey;
}

export async function listJourneyComments(slug) {
  const journey = await approvedJourneyBySlug(slug);
  const rows = await prisma.journeyComment.findMany({
    where: { journeyId: journey.id },
    orderBy: { createdAt: 'asc' },
    take: 400,
  });

  // Threads are one level deep: replies always hang off a top-level comment.
  const byId = new Map();
  const roots = [];

  for (const row of rows) {
    const item = { ...toPublicComment(row), replies: [] };
    byId.set(item.id, item);
    if (!item.parentId) roots.push(item);
  }

  for (const item of byId.values()) {
    if (!item.parentId) continue;
    const parent = byId.get(item.parentId);
    if (parent) parent.replies.push(item);
    else roots.push(item);
  }

  return { items: roots, total: rows.length };
}

export async function addJourneyComment(slug, payload = {}, meta = {}) {
  requireNotSpam(payload, meta.ip);

  if (!meta.user?.id) {
    throw new CommunityError('Sign in to join the conversation.', 401, 'UNAUTHORIZED');
  }

  // Members may comment as often as they like; only the honeypot/timing check above applies.

  const journey = await approvedJourneyBySlug(slug);

  const member = await prisma.student.findUnique({
    where: { id: meta.user.id },
    select: { name: true },
  });
  if (!member) {
    throw new CommunityError('Sign in to join the conversation.', 401, 'UNAUTHORIZED');
  }

  const { ok, errors, data } = validateComment(payload, member.name);
  if (!ok) {
    throw new CommunityError('Please fix the highlighted fields.', 422, 'VALIDATION_ERROR', errors);
  }

  let parentId = null;
  if (payload.parentId) {
    const parent = await prisma.journeyComment.findFirst({
      where: { id: String(payload.parentId), journeyId: journey.id },
      select: { id: true, parentId: true },
    });
    if (!parent) {
      throw new CommunityError('The comment you are replying to is gone.', 404, 'COMMENT_NOT_FOUND');
    }
    // Replying to a reply keeps the thread flat: attach to the root comment.
    parentId = parent.parentId || parent.id;
  }

  const comment = await prisma.journeyComment.create({
    data: { journeyId: journey.id, parentId, authorName: data.authorName, body: data.body },
  });

  return { comment: { ...toPublicComment(comment), replies: [] } };
}

export async function adminListComments(journeyId) {
  const rows = await prisma.journeyComment.findMany({
    where: { journeyId: String(journeyId) },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return { items: rows.map(toPublicComment) };
}

export async function adminDeleteComment(id) {
  await prisma.journeyComment.delete({ where: { id: String(id) } });
  return { deleted: true };
}

export async function listTags() {
  const rows = await prisma.journey.findMany({
    where: { status: 'approved' },
    select: { tags: true },
  });

  const counts = new Map();
  for (const row of rows) {
    for (const tag of row.tags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 24);
}

/* ------------------------------------------------------------------ */
/* Public writes                                                       */
/* ------------------------------------------------------------------ */

export async function createJourney(payload = {}, meta = {}) {
  requireNotSpam(payload, meta.ip);
  enforceRate(`community:submit:${meta.ip || 'unknown'}`, 5, HOUR_MS, 'You have submitted a few stories already.');

  if (!meta.user?.id) {
    throw new CommunityError('Sign in to share your story.', 401, 'UNAUTHORIZED');
  }

  const student = await prisma.student.findUnique({
    where: { id: meta.user.id },
    select: { id: true, name: true, email: true },
  });
  if (!student) {
    throw new CommunityError('Sign in to share your story.', 401, 'UNAUTHORIZED');
  }

  // Posts are written by a signed-in account, so the author name and email
  // come from the profile rather than the form.
  const { ok, errors, data } = validateJourney({
    ...payload,
    authorName: student.name,
    authorEmail: student.email,
  });
  if (!ok) {
    throw new CommunityError('Please fix the highlighted fields.', 422, 'VALIDATION_ERROR', errors);
  }

  const journey = await prisma.journey.create({
    data: {
      slug: await uniqueSlug(data.title),
      title: data.title,
      excerpt: buildExcerpt(data.story),
      story: data.story,
      authorName: student.name,
      authorEmail: student.email,
      authorId: student.id,
      photoData: data.photo ?? null,
      tags: data.tags,
      // Readers may message the author through the site unless they opt out.
      allowContact: payload.allowContact === undefined ? true : Boolean(data.allowContact),
      status: 'approved',
      approvedAt: new Date(),
    },
  });

  return {
    id: journey.id,
    slug: journey.slug,
    title: journey.title,
    status: journey.status,
  };
}

/** Up/down vote, or clear the vote when value is 0. */
export async function voteOnJourney(slug, user, rawValue) {
  if (!user?.id) {
    throw new CommunityError('Sign in to vote on a post.', 401, 'UNAUTHORIZED');
  }

  const value = Number(rawValue);
  if (![1, -1, 0].includes(value)) {
    throw new CommunityError('That vote is not valid.', 422, 'VALIDATION_ERROR');
  }

  const journey = await approvedJourneyBySlug(slug);

  if (value === 0) {
    await prisma.journeyVote.deleteMany({ where: { journeyId: journey.id, userId: user.id } });
  } else {
    await prisma.journeyVote.upsert({
      where: { journeyId_userId: { journeyId: journey.id, userId: user.id } },
      create: { journeyId: journey.id, userId: user.id, value },
      update: { value },
    });
  }

  const total = await prisma.journeyVote.aggregate({
    where: { journeyId: journey.id },
    _sum: { value: true },
  });

  return { score: total._sum.value || 0, myVote: value };
}

/** Authors can remove their own post; administrators can remove any post. */
export async function deleteOwnJourney(slug, user) {
  if (!user?.id) {
    throw new CommunityError('Sign in to remove this post.', 401, 'UNAUTHORIZED');
  }

  const journey = await prisma.journey.findFirst({
    where: { slug: String(slug) },
    select: { id: true, authorId: true },
  });
  if (!journey) {
    throw new CommunityError('This post could not be found.', 404, 'JOURNEY_NOT_FOUND');
  }

  const viewer = await prisma.student.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  const isOwner = journey.authorId && journey.authorId === user.id;

  if (!isOwner && viewer?.role !== 'admin') {
    throw new CommunityError('Only the author or an administrator can remove this post.', 403, 'FORBIDDEN');
  }

  await prisma.journey.delete({ where: { id: journey.id } });
  return { deleted: true };
}

export async function contactAuthor(slug, payload = {}, meta = {}) {
  requireNotSpam(payload, meta.ip);

  const journey = await prisma.journey.findFirst({
    where: { slug: String(slug), status: 'approved' },
    select: { id: true, title: true, authorName: true, authorEmail: true, allowContact: true },
  });

  if (!journey) {
    throw new CommunityError('This journey could not be found.', 404, 'JOURNEY_NOT_FOUND');
  }
  if (!journey.allowContact) {
    throw new CommunityError('This author has chosen not to be contacted.', 403, 'CONTACT_DISABLED');
  }

  enforceRate(`community:contact:${meta.ip || 'unknown'}`, 5, HOUR_MS, 'You have sent several messages already.');
  enforceRate(`community:contact:${journey.id}`, 25, HOUR_MS, 'This author is receiving a lot of messages right now.');

  const { ok, errors, data } = validateContact(payload);
  if (!ok) {
    throw new CommunityError('Please fix the highlighted fields.', 422, 'VALIDATION_ERROR', errors);
  }

  const contact = await prisma.journeyContact.create({
    data: {
      journeyId: journey.id,
      senderName: data.senderName,
      senderEmail: data.senderEmail,
      message: data.message,
    },
  });

  const result = await sendContactEmail({
    journey,
    senderName: data.senderName,
    senderEmail: data.senderEmail,
    message: data.message,
  });

  if (result.delivered) {
    await prisma.journeyContact
      .update({ where: { id: contact.id }, data: { delivered: true } })
      .catch(() => {});
  }

  return {
    delivered: result.delivered,
    emailConfigured: isEmailConfigured(),
    reason: result.reason || null,
  };
}

export async function reportJourney(slug, payload = {}, meta = {}) {
  enforceRate(`community:report:${meta.ip || 'unknown'}`, 10, HOUR_MS, 'You have sent several reports already.');

  const journey = await prisma.journey.findFirst({
    where: { slug: String(slug) },
    select: { id: true, status: true },
  });

  if (!journey) {
    throw new CommunityError('This journey could not be found.', 404, 'JOURNEY_NOT_FOUND');
  }

  const { ok, errors, data } = validateReport(payload);
  if (!ok) {
    throw new CommunityError('Please fix the highlighted fields.', 422, 'VALIDATION_ERROR', errors);
  }

  await prisma.journeyReport.create({
    data: {
      journeyId: journey.id,
      reason: data.reason,
      details: data.details,
      reporterEmail: data.reporterEmail,
    },
  });

  return { received: true };
}

/* ------------------------------------------------------------------ */
/* Author self-service (magic link)                                    */
/* ------------------------------------------------------------------ */

async function journeyFromToken(token) {
  if (!token || String(token).length < 20) {
    throw new CommunityError('This link is invalid.', 400, 'INVALID_TOKEN');
  }

  const link = await prisma.journeyEditLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { journey: true },
  });

  if (!link) {
    throw new CommunityError('This link is invalid. Request a new one from the site.', 404, 'INVALID_TOKEN');
  }
  if (link.expiresAt.getTime() < Date.now()) {
    throw new CommunityError('This link has expired. Submit your journey again to get a new one.', 410, 'TOKEN_EXPIRED');
  }

  return link.journey;
}

function toManageView(journey) {
  return {
    slug: journey.slug,
    title: journey.title,
    story: journey.story,
    authorName: journey.authorName,
    photo: journey.photoData || null,
    tags: journey.tags,
    allowContact: journey.allowContact,
    status: journey.status,
    moderationNote: journey.moderationNote || null,
    createdAt: journey.createdAt,
    updatedAt: journey.updatedAt,
  };
}

export async function getJourneyByToken(token) {
  const journey = await journeyFromToken(token);
  return toManageView(journey);
}

export async function updateJourneyByToken(token, payload = {}) {
  const journey = await journeyFromToken(token);

  const { ok, errors, data } = validateJourney(
    { ...payload, authorEmail: payload.authorEmail || journey.authorEmail },
    { partial: true },
  );
  if (!ok) {
    throw new CommunityError('Please fix the highlighted fields.', 422, 'VALIDATION_ERROR', errors);
  }

  const updated = await prisma.journey.update({
    where: { id: journey.id },
    data: {
      ...data,
      ...(data.story ? { excerpt: buildExcerpt(data.story) } : {}),
      // Posts are no longer held for review, so edits are visible right away.
    },
  });

  return { ...toManageView(updated), needsReview: false };
}

export async function deleteJourneyByToken(token) {
  const journey = await journeyFromToken(token);
  await prisma.journey.delete({ where: { id: journey.id } });
  return { deleted: true };
}

/* ------------------------------------------------------------------ */
/* Admin moderation                                                    */
/* ------------------------------------------------------------------ */

export async function adminListJourneys({ status = 'pending', search, page, limit } = {}) {
  const paging = parsePaging({ page, limit }, 20);
  const term = String(search ?? '').trim().slice(0, 80);

  const where = {};
  if (STATUSES.includes(status)) where.status = status;
  if (term) {
    where.OR = [
      { title: { contains: term, mode: 'insensitive' } },
      { authorName: { contains: term, mode: 'insensitive' } },
      { authorEmail: { contains: term, mode: 'insensitive' } },
    ];
  }

  const [rows, total, counts] = await Promise.all([
    prisma.journey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: paging.skip,
      take: paging.limit,
      include: {
        _count: { select: { reports: true, contacts: true, comments: true } },
      },
    }),
    prisma.journey.count({ where }),
    prisma.journey.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);

  const statusCounts = { pending: 0, approved: 0, rejected: 0 };
  for (const entry of counts) statusCounts[entry.status] = entry._count._all;

  return {
    items: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      story: row.story,
      excerpt: row.excerpt,
      authorName: row.authorName,
      authorEmail: row.authorEmail,
      photo: row.photoData || null,
      tags: row.tags,
      allowContact: row.allowContact,
      status: row.status,
      moderationNote: row.moderationNote,
      views: row.views,
      reportCount: row._count.reports,
      contactCount: row._count.contacts,
      commentCount: row._count.comments,
      createdAt: row.createdAt,
      approvedAt: row.approvedAt,
    })),
    pagination: {
      page: paging.page,
      limit: paging.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / paging.limit)),
    },
    counts: statusCounts,
  };
}

export async function adminReviewJourney(id, payload = {}) {
  const journey = await prisma.journey.findUnique({ where: { id: String(id) } });
  if (!journey) throw new CommunityError('Journey not found.', 404, 'JOURNEY_NOT_FOUND');

  const nextStatus = String(payload.status || '');
  if (!['approved', 'rejected', 'pending'].includes(nextStatus)) {
    throw new CommunityError('Choose to approve, reject or reset this journey.', 422, 'VALIDATION_ERROR');
  }

  const updated = await prisma.journey.update({
    where: { id: journey.id },
    data: {
      status: nextStatus,
      moderationNote: payload.moderationNote ? String(payload.moderationNote).slice(0, 300) : null,
      approvedAt: nextStatus === 'approved' ? journey.approvedAt || new Date() : null,
    },
  });

  let emailDelivered = false;
  if (nextStatus === 'approved') {
    try {
      const issued = await issueManageLink(updated, 'approved');
      emailDelivered = issued.delivered;
    } catch (error) {
      console.error('[community] Approval email failed:', error?.message);
    }
  }

  return { id: updated.id, status: updated.status, emailDelivered };
}

export async function adminUpdateJourney(id, payload = {}) {
  const journey = await prisma.journey.findUnique({ where: { id: String(id) } });
  if (!journey) throw new CommunityError('Journey not found.', 404, 'JOURNEY_NOT_FOUND');

  const { ok, errors, data } = validateJourney(
    { ...payload, authorEmail: payload.authorEmail || journey.authorEmail },
    { partial: true },
  );
  if (!ok) throw new CommunityError('Please fix the highlighted fields.', 422, 'VALIDATION_ERROR', errors);

  const updated = await prisma.journey.update({
    where: { id: journey.id },
    data: {
      ...data,
      ...(payload.authorEmail !== undefined ? { authorEmail: String(payload.authorEmail).toLowerCase().slice(0, 255) } : {}),
      ...(data.story ? { excerpt: buildExcerpt(data.story) } : {}),
    },
  });

  return { id: updated.id, slug: updated.slug, title: updated.title, excerpt: updated.excerpt };
}

export async function adminDeleteJourney(id) {
  await prisma.journey.delete({ where: { id: String(id) } });
  return { deleted: true };
}

export async function adminListReports({ status = 'open' } = {}) {
  const where = status === 'all' ? {} : { status };

  const reports = await prisma.journeyReport.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      journey: { select: { id: true, slug: true, title: true, authorName: true, status: true } },
    },
  });

  const open = await prisma.journeyReport.count({ where: { status: 'open' } });

  return {
    items: reports.map((report) => ({
      id: report.id,
      reason: report.reason,
      details: report.details,
      reporterEmail: report.reporterEmail,
      status: report.status,
      createdAt: report.createdAt,
      journey: report.journey
        ? {
            id: report.journey.id,
            slug: report.journey.slug,
            title: report.journey.title,
            authorName: report.journey.authorName,
            status: report.journey.status,
          }
        : null,
    })),
    openCount: open,
  };
}

export async function adminResolveReport(id, payload = {}) {
  const status = payload.status === 'dismissed' ? 'dismissed' : 'resolved';
  const report = await prisma.journeyReport.update({
    where: { id: String(id) },
    data: { status },
  });

  if (payload.unpublish && report.journeyId) {
    await prisma.journey.update({
      where: { id: report.journeyId },
      data: { status: 'rejected', approvedAt: null, moderationNote: 'Unpublished after a reader report.' },
    });
  }

  return { id: report.id, status: report.status };
}
