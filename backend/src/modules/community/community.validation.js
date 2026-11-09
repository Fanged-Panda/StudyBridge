/**
 * Input cleaning and validation for community journeys.
 * Every string that reaches the database goes through here: control characters
 * are stripped, lengths are capped and enums are constrained.
 */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const PHOTO_DATA_PATTERN = /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i;
const PHOTO_URL_PATTERN = /^https?:\/\/[^\s<>"']+$/i;
const RESERVED_SLUGS = new Set(['share', 'manage', 'admin', 'new', 'edit']);

export const LIMITS = {
  name: 100,
  email: 255,
  title: 140,
  storyMin: 100,
  tag: 24,
  tagCount: 5,
  photoBytes: 400000,
  message: 4000,
  details: 1000,
  subject: 140,
  commentName: 60,
};

export const REPORT_REASONS = [
  'Spam or advertising',
  'Harassment or hate speech',
  'Offensive content',
  'False or misleading',
  'Privacy concern',
  'Something else',
];

export function cleanText(value) {
  return String(value ?? '').replace(CONTROL_CHARS, '').trim();
}

export function cleanMultiline(value) {
  return String(value ?? '')
    .replace(CONTROL_CHARS, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

export function normalizeEmail(value) {
  return cleanText(value).toLowerCase();
}

/** Tags may arrive as an array or a comma separated string. */
export function parseTags(input, { max = LIMITS.tagCount } = {}) {
  const raw = Array.isArray(input) ? input : String(input ?? '').split(',');

  const tags = [];
  for (const entry of raw) {
    const tag = cleanText(entry).replace(/\s+/g, ' ').replace(/^#/, '').slice(0, LIMITS.tag);
    if (!tag) continue;
    if (tags.some((existing) => existing.toLowerCase() === tag.toLowerCase())) continue;
    tags.push(tag);
    if (tags.length === max) break;
  }
  return tags;
}

export function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function isReservedSlug(slug) {
  return RESERVED_SLUGS.has(slug);
}

/** Strip common markdown noise so the feed excerpt reads as plain prose. */
export function buildExcerpt(story, length = 220) {
  const plain = String(story ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= length) return plain;

  const cut = plain.slice(0, length);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : length).trim()}…`;
}

function validatePhoto(photo, errors) {
  if (photo === undefined) return undefined;
  if (photo === null || photo === '') return null;
  if (typeof photo !== 'string') {
    errors.photo = 'Photo must be an image.';
    return null;
  }

  if (photo.startsWith('data:')) {
    if (!PHOTO_DATA_PATTERN.test(photo)) {
      errors.photo = 'Please upload a PNG, JPEG or WebP image.';
      return null;
    }
    if (photo.length > LIMITS.photoBytes) {
      errors.photo = 'That image is too large. Please choose a smaller photo.';
      return null;
    }
    return photo;
  }

  if (!PHOTO_URL_PATTERN.test(photo)) {
    errors.photo = 'Enter a valid image link.';
    return null;
  }
  return photo.slice(0, 500);
}

/**
 * Validate a journey submission or edit.
 * `partial` keeps untouched fields optional for edits.
 */
export function validateJourney(payload = {}, { partial = false } = {}) {
  const errors = {};
  const data = {};

  const authorName = cleanText(payload.authorName ?? payload.name).slice(0, LIMITS.name);
  if (!partial || payload.authorName !== undefined || payload.name !== undefined) {
    if (authorName.length < 2) errors.authorName = 'Please tell us your name (at least 2 characters).';
    else data.authorName = authorName;
  }

  if (!partial || payload.authorEmail !== undefined || payload.email !== undefined) {
    const email = normalizeEmail(payload.authorEmail ?? payload.email);
    if (!email) errors.authorEmail = 'Your email is required.';
    else if (email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) {
      errors.authorEmail = 'Enter a valid email address.';
    } else data.authorEmail = email;
  }

  if (!partial || payload.title !== undefined) {
    const title = cleanText(payload.title);
    if (title.length < 4) errors.title = 'Give your journey a title (at least 4 characters).';
    else if (title.length > LIMITS.title) errors.title = `Keep the title under ${LIMITS.title} characters.`;
    else data.title = title;
  }

  if (!partial || payload.story !== undefined) {
    const story = cleanMultiline(payload.story);
    if (story.length < LIMITS.storyMin) {
      errors.story = `Tell us a bit more — your story needs at least ${LIMITS.storyMin} characters.`;
    } else data.story = story;
  }

  if (!partial || payload.tags !== undefined) {
    const tags = parseTags(payload.tags);
    if (!tags.length) errors.tags = 'Add at least one tag so readers can find your journey.';
    else data.tags = tags;
  }

  if (payload.allowContact !== undefined) {
    data.allowContact = payload.allowContact === true || payload.allowContact === 'true';
  } else if (!partial) {
    data.allowContact = false;
  }

  const photo = validatePhoto(payload.photo ?? payload.photoData, errors);
  if (photo !== undefined) data.photo = photo;

  return { ok: Object.keys(errors).length === 0, errors, data };
}

export function validateContact(payload = {}) {
  const errors = {};

  const senderName = cleanText(payload.senderName).slice(0, LIMITS.name);
  if (senderName.length < 2) errors.senderName = 'Please enter your name.';

  const senderEmail = normalizeEmail(payload.senderEmail);
  if (!senderEmail) errors.senderEmail = 'Your email is required so the author can reply.';
  else if (!EMAIL_PATTERN.test(senderEmail)) errors.senderEmail = 'Enter a valid email address.';

  const message = cleanMultiline(payload.message).slice(0, LIMITS.message);
  if (message.length < 20) errors.message = 'Please write at least 20 characters.';
  else if (message.length > LIMITS.message) errors.message = `Keep your message under ${LIMITS.message} characters.`;

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    data: { senderName, senderEmail, message },
  };
}

export function validateReport(payload = {}) {
  const errors = {};
  const reason = cleanText(payload.reason);

  if (!REPORT_REASONS.includes(reason)) errors.reason = 'Choose a reason for the report.';

  const details = cleanText(payload.details).slice(0, LIMITS.details);
  const reporterEmail = normalizeEmail(payload.reporterEmail);
  if (reporterEmail && !EMAIL_PATTERN.test(reporterEmail)) errors.reporterEmail = 'Enter a valid email address.';

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    data: { reason, details: details || null, reporterEmail: reporterEmail || null },
  };
}

/**
 * Comments are signed-in only, so the display name is the member's first name
 * rather than a free-text field.
 */
export function validateComment(payload = {}, memberName = '') {
  const errors = {};

  const authorName = cleanText(memberName).split(/\s+/).filter(Boolean)[0]?.slice(0, LIMITS.commentName) || '';
  if (authorName.length < 2) {
    errors.authorName = 'Sign in to comment.';
  }

  const body = cleanMultiline(payload.body ?? payload.message);
  if (body.length < 3) errors.body = 'Write a short comment first.';

  return { ok: Object.keys(errors).length === 0, errors, data: { authorName, body } };
}

/** Single line subjects must never contain newlines (SMTP header injection). */
export function safeSubject(value) {
  return cleanText(value).replace(/[\r\n]+/g, ' ').slice(0, LIMITS.subject);
}
