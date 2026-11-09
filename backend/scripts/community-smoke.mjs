/**
 * Manual smoke test for the community module (posts, votes, threads, reports).
 * Usage: node scripts/community-smoke.mjs [baseUrl]
 * Creates and cleans up its own test data.
 */
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import prisma from '../src/config/database.js';
import * as service from '../src/modules/community/community.service.js';

const base = process.argv[2] || 'http://localhost:5002/api';
let pass = 0;
let fail = 0;

const check = (name, ok, extra = '') => {
  if (ok) pass += 1;
  else fail += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ` :: ${extra}` : ''}`);
};

const call = async (method, path, { body, token, ip } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (ip) headers['X-Forwarded-For'] = ip;
  const response = await fetch(base + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { status: response.status, body: json, raw: json ? JSON.stringify(json) : '' };
};

const tag = `smoke-${Date.now()}`;
const story =
  'My journey from a small town to a funded master’s programme started with one spreadsheet and a lot of doubt. ' +
  'I listed every deadline, wrote drafts of my statement of purpose, and asked three professors for feedback. ' +
  'The turning point was a scholarship interview where I spoke honestly about my research gap instead of pretending.';

const [admin, author, reader] = await Promise.all([
  prisma.student.create({
    data: { name: 'Smoke Admin', email: `${tag}-admin@example.com`, country: 'Bangladesh', role: 'admin' },
  }),
  prisma.student.create({
    data: { name: 'Samira Rahman', email: `${tag}-author@example.com`, country: 'Bangladesh' },
  }),
  prisma.student.create({
    data: { name: 'Rifat Ahmed', email: `${tag}-reader@example.com`, country: 'Bangladesh' },
  }),
]);

const sign = (student) => jwt.sign({ id: student.id, role: student.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
const adminToken = sign(admin);
const authorToken = sign(author);
const readerToken = sign(reader);

const cleanupJourneys = () => prisma.journey.deleteMany({ where: { authorId: { in: [author.id, reader.id] } } });

try {
  // ---- validation -------------------------------------------------------
  const anonymous = await call('POST', '/community/journeys', {
    body: { title: 'From nowhere', story, tags: ['Tests'] },
    ip: '10.0.0.1',
  });
  check('posting needs a signed-in member', anonymous.status === 401, String(anonymous.status));

  const short = await call('POST', '/community/journeys', {
    token: authorToken,
    body: { title: 'Hi', story: 'too short', tags: [] },
    ip: '10.0.0.1',
  });
  check('invalid submission rejected', short.status === 422, short.raw.slice(0, 120));
  check('field errors returned', Boolean(short.body?.errors?.story && short.body?.errors?.title && short.body?.errors?.tags));

  const spam = await call('POST', '/community/journeys', {
    token: authorToken,
    body: { title: 'Spam spam', story, tags: ['Spam'], website: 'http://spam.example' },
    ip: '10.0.0.2',
  });
  check('honeypot blocks bots', spam.status === 400 && spam.body?.code === 'SPAM_DETECTED', spam.raw.slice(0, 100));

  // ---- publish ----------------------------------------------------------
  const created = await service.createJourney(
    {
      title: 'From Sylhet to a funded master’s',
      story,
      tags: ['Scholarships', 'SOP', tag],
      photo: null,
      formStartedAt: Date.now() - 5000,
    },
    { ip: '10.0.0.3', user: { id: author.id, role: 'student' } },
  );
  check('post is published straight away', created.status === 'approved' && Boolean(created.slug), created.slug);

  const feed = await call('GET', '/community/journeys');
  const card = feed.body?.data?.items?.find((item) => item.slug === created.slug);
  check('new post appears in the feed immediately', Boolean(card), String(feed.body?.data?.pagination?.total));
  check('feed card carries avatar, tags and no email', Boolean(card?.author && card?.tags?.includes(tag)) && !JSON.stringify(card || {}).includes(author.email));
  check('feed card exposes score and comment count', card?.score === 0 && card?.commentCount === 0, `${card?.score}/${card?.commentCount}`);
  check('no story body in feed payload', card?.story === undefined);

  const searched = await call('GET', `/community/journeys?search=${encodeURIComponent('funded master')}`);
  check('search finds the post', searched.body.data.items.some((item) => item.slug === created.slug));
  const noMatch = await call('GET', '/community/journeys?search=zzzznothingzzzz');
  check('search empty state returns zero', noMatch.body.data.items.length === 0);
  const byTag = await call('GET', `/community/journeys?tag=${encodeURIComponent(tag)}`);
  check('tag filter works', byTag.body.data.items.some((item) => item.slug === created.slug));
  const tags = await call('GET', '/community/tags');
  check('tag list includes new tag', tags.body.data.some((entry) => entry.name === tag));

  const detail = await call('GET', `/community/journeys/${created.slug}`, { token: authorToken });
  check('detail returns full story', detail.body?.data?.story?.length > 100);
  check('detail never leaks the author email', !detail.raw.includes(author.email));
  check('author sees their own post as theirs', detail.body?.data?.isAuthor === true);
  const anonymousDetail = await call('GET', `/community/journeys/${created.slug}`);
  check('anonymous readers are not marked as the author', anonymousDetail.body?.data?.isAuthor === false);
  const missing = await call('GET', '/community/journeys/does-not-exist');
  check('unknown journey returns 404', missing.status === 404);

  // ---- votes ------------------------------------------------------------
  const anonVote = await call('POST', `/community/journeys/${created.slug}/vote`, { body: { value: 1 } });
  check('voting needs a signed-in member', anonVote.status === 401, String(anonVote.status));

  const up = await call('POST', `/community/journeys/${created.slug}/vote`, { token: readerToken, body: { value: 1 } });
  check('upvote is counted', up.body?.data?.score === 1 && up.body?.data?.myVote === 1, up.raw.slice(0, 80));

  const down = await call('POST', `/community/journeys/${created.slug}/vote`, { token: readerToken, body: { value: -1 } });
  check('vote can be flipped', down.body?.data?.score === -1 && down.body?.data?.myVote === -1);

  const cleared = await call('POST', `/community/journeys/${created.slug}/vote`, { token: readerToken, body: { value: 0 } });
  check('vote can be withdrawn', cleared.body?.data?.score === 0 && cleared.body?.data?.myVote === 0);

  const badVote = await call('POST', `/community/journeys/${created.slug}/vote`, { token: readerToken, body: { value: 3 } });
  check('invalid vote rejected', badVote.status === 422, String(badVote.status));

  const second = await call('POST', `/community/journeys/${created.slug}/vote`, { token: authorToken, body: { value: 1 } });
  const readerDetail = await call('GET', `/community/journeys/${created.slug}`, { token: readerToken });
  check('score totals every member', second.body?.data?.score === 1 && readerDetail.body?.data?.score === 1);
  check('myVote is per member', readerDetail.body?.data?.myVote === 0, String(readerDetail.body?.data?.myVote));

  // ---- comments and replies --------------------------------------------
  const anonComment = await call('POST', `/community/journeys/${created.slug}/comments`, {
    body: { body: 'Trying to comment without an account.' },
  });
  check('commenting needs a signed-in member', anonComment.status === 401, String(anonComment.status));

  const comment = await call('POST', `/community/journeys/${created.slug}/comments`, {
    token: readerToken,
    body: { body: 'Great read, thanks for sharing the timeline.' },
  });
  check('comment posted', comment.status === 201, String(comment.status));
  check('comment uses the member first name', comment.body?.data?.comment?.authorName === 'Rifat', comment.body?.data?.comment?.authorName);
  const parentId = comment.body?.data?.comment?.id;

  const reply = await call('POST', `/community/journeys/${created.slug}/comments`, {
    token: authorToken,
    body: { body: 'Seconding this, the document list is gold.', parentId },
  });
  check('reply attaches to its comment', reply.status === 201 && reply.body?.data?.comment?.parentId === parentId);

  const replyId = reply.body?.data?.comment?.id;
  const nested = await call('POST', `/community/journeys/${created.slug}/comments`, {
    token: readerToken,
    body: { body: 'Adding one more tip about the interview.', parentId: replyId },
  });
  check('reply to a reply stays one level deep', nested.body?.data?.comment?.parentId === parentId);

  const badParent = await call('POST', `/community/journeys/${created.slug}/comments`, {
    token: readerToken,
    body: { body: 'Replying to something that does not exist.', parentId: 'nope' },
  });
  check('unknown parent comment rejected', badParent.status === 404, String(badParent.status));

  const threaded = await call('GET', `/community/journeys/${created.slug}/comments`);
  const root = threaded.body?.data?.items?.[0];
  check('threads come back nested', root?.replies?.length === 2, String(root?.replies?.length));
  check('comment total counts replies', threaded.body?.data?.total === 3, String(threaded.body?.data?.total));

  const withComments = await call('GET', `/community/journeys/${created.slug}`);
  check('detail carries the comment count', withComments.body?.data?.commentCount === 3, String(withComments.body?.data?.commentCount));

  // Members are not rate limited on comments, so a burst of them all succeed.
  let burstOk = 0;
  for (let i = 0; i < 9; i += 1) {
    const burst = await call('POST', `/community/journeys/${created.slug}/comments`, {
      token: readerToken,
      body: { body: `Burst comment number ${i + 1} from the same member.` },
      ip: '10.0.9.9',
    });
    if (burst.status === 201) burstOk += 1;
  }
  check('members can comment as often as they like', burstOk === 9, `${burstOk}/9`);
  const longComment = await call('POST', `/community/journeys/${created.slug}/comments`, {
    token: readerToken,
    body: { body: `Long comment. ${'detail '.repeat(400)}` },
  });
  check('long comments are accepted', longComment.status === 201 && longComment.body?.data?.comment?.body.length > 2400, `${longComment.status} ${longComment.raw.slice(0,200)}`);

  // ---- connecting with the author ---------------------------------------
  check('posts allow contact by default', withComments.body?.data?.contactable === true);

  const contactBad = await call('POST', `/community/journeys/${created.slug}/contact`, {
    body: { senderName: 'A', senderEmail: 'x', message: 'hi' },
    ip: '10.0.1.1',
  });
  check('contact validates input', contactBad.status === 422 && Boolean(contactBad.body?.errors?.message));

  const contact = await call('POST', `/community/journeys/${created.slug}/contact`, {
    body: {
      senderName: 'Rifat Ahmed',
      senderEmail: 'rifat@example.com',
      message: 'Your story helped me a lot — could you share how you chose your referees?',
      formStartedAt: Date.now() - 4000,
    },
    ip: '10.0.1.2',
  });
  check('contact message accepted', contact.status === 201 && Boolean(contact.body?.data?.emailConfigured), contact.raw.slice(0, 120));
  check('contact stored for records', (await prisma.journeyContact.count({ where: { journeyId: created.id } })) === 1);

  const closed = await service.createJourney(
    { title: 'No messages please', story, tags: ['Tests'], allowContact: false },
    { ip: '10.0.0.9', user: { id: reader.id, role: 'student' } },
  );
  const closedContact = await call('POST', `/community/journeys/${closed.slug}/contact`, {
    body: { senderName: 'Rifat Ahmed', senderEmail: 'rifat@example.com', message: 'A message that should be refused.' },
    ip: '10.0.1.4',
  });
  check('contact can be turned off', closedContact.status === 403, String(closedContact.status));
  await call('DELETE', `/community/journeys/${closed.slug}`, { token: readerToken });

  // ---- moderation -------------------------------------------------------
  const reportsBefore = await call('GET', '/community/admin/reports');
  check('anonymous cannot read reports', reportsBefore.status === 401);

  const reportBad = await call('POST', `/community/journeys/${created.slug}/report`, {
    body: { reason: 'Not a real reason' },
    ip: '10.0.2.1',
  });
  check('report validates reason', reportBad.status === 422);
  const report = await call('POST', `/community/journeys/${created.slug}/report`, {
    body: { reason: 'Spam or advertising', details: 'Looks promotional.' },
    ip: '10.0.2.2',
  });
  check('report accepted', report.status === 201 && report.body.data.received === true);

  const reports = await call('GET', '/community/admin/reports', { token: adminToken });
  const reportRow = reports.body?.data?.items?.find((item) => item.journey?.slug === created.slug);
  check('admin sees the reported post', Boolean(reportRow));
  const resolved = await call('PATCH', `/community/admin/reports/${reportRow.id}`, {
    token: adminToken,
    body: { status: 'resolved' },
  });
  check('report can be resolved', resolved.status === 200 && resolved.body.data.status === 'resolved');

  const adminList = await call('GET', '/community/admin/journeys?status=approved&search=funded', { token: adminToken });
  const adminItem = adminList.body?.data?.items?.find((item) => item.slug === created.slug);
  check('admin list shows the post with its counts', Boolean(adminItem) && adminItem.commentCount >= 3, `comments ${adminItem?.commentCount}`);

  // ---- deleting ---------------------------------------------------------
  const foreignDelete = await call('DELETE', `/community/journeys/${created.slug}`, { token: readerToken });
  check('other members cannot delete a post', foreignDelete.status === 403, String(foreignDelete.status));

  const anonDelete = await call('DELETE', `/community/journeys/${created.slug}`);
  check('anonymous cannot delete a post', anonDelete.status === 401);

  const duplicate = await service.createJourney(
    { title: 'From Sylhet to a funded master’s', story, tags: ['Scholarships'], photo: null },
    { ip: '10.0.0.4', user: { id: author.id, role: 'student' } },
  );
  check('duplicate titles get unique slugs', duplicate.slug !== created.slug, `${created.slug} / ${duplicate.slug}`);

  const adminDelete = await call('DELETE', `/community/journeys/${duplicate.slug}`, { token: adminToken });
  check('admins can delete any post', adminDelete.status === 200, String(adminDelete.status));

  const removed = await call('DELETE', `/community/journeys/${created.slug}`, { token: authorToken });
  check('authors can delete their own post', removed.status === 200 && removed.body.data.deleted === true);

  const gone = await call('GET', `/community/journeys/${created.slug}`);
  check('deleted post is gone', gone.status === 404, String(gone.status));
  check('votes and comments cascade', (await prisma.journeyComment.count({ where: { journeyId: created.id } })) === 0 &&
    (await prisma.journeyVote.count({ where: { journeyId: created.id } })) === 0);

  console.log(`\n${pass} passed, ${fail} failed`);
} finally {
  await cleanupJourneys().catch(() => {});
  await prisma.student.deleteMany({ where: { id: { in: [admin.id, author.id, reader.id] } } }).catch(() => {});
  await prisma.$disconnect();
  process.exit(fail ? 1 : 0);
}
