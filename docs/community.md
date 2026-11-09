# Community — member posts, votes and threads

A Reddit-style space where signed-in members publish their academic journeys.
Posts appear immediately, readers upvote or downvote them, and comments can be
replied to. Each post carries the author's profile picture, and the author (or an
admin) can delete it. Built on React 19 + Vite + Tailwind and Express + Prisma +
PostgreSQL.

---

## 1. What exists

| Area | Route | Notes |
| --- | --- | --- |
| Feed | `/community` | Search, tag filter, pagination (9 per page), score + comment count per card |
| Post page | `/community/:slug` | Cover image, markdown story, vote row, threaded comments (composer opens from the *Comment* button), report, delete (author) |
| Write | `/community/share` | Signed-in members only; title, story, tags, cover image |
| Admin | `/admin` → **Community Journeys** tab | Review/edit/delete any post, comments, reports |

Backend module: `backend/src/modules/community/` mounted at `/api/community`.

### Database models (`backend/prisma/schema.prisma`)

- `Journey` — title, slug, excerpt, story (markdown), `authorName` / `authorEmail`
  (email never leaves the server), `authorId` (the account that wrote it), `photoData`
  (**the post's cover image**, not the avatar), `tags[]`, `status`, `views`.
- `JourneyVote` — one row per member per post (`value` = `1` or `-1`), unique on
  `(journeyId, userId)`. The score is the sum of its rows.
- `JourneyComment` — `authorName`, `body`, optional `parentId`. Threads are **one
  level deep**: a reply to a reply is attached to the root comment.
- `JourneyReport` — reader reports with an `open` / `resolved` / `dismissed` status.

`JourneyEditLink`, `JourneyContact` and the `pending` / `rejected` statuses are kept
from the earlier moderated flow, so older posts and their magic links still work.

---

## 2. Authentication rules

| Action | Requires |
| --- | --- |
| Read the feed / a post / comments | nobody |
| Upvote, downvote, write a post | signed-in member (`Authorization: Bearer <JWT>`) |
| Delete a post | its author, or an administrator |
| Admin panel, comment moderation, reports | `role = "admin"` |
| Comment or reply | nobody (name + message, no email) |

Votes are per account: voting again on the same side keeps one vote, the opposite
arrow switches it, and pressing the active arrow again clears it (the client sends
`value: 0`).

---

## 3. Run it locally

```bash
npm install --prefix backend && npm install --prefix frontend
cd backend && npx prisma db push && cd ..   # JourneyVote, JourneyComment.parentId, Journey.authorId
npm run dev                                  # API on :5002, Vite on :5173
```

Make yourself an admin to see the moderation tab:

```bash
cd backend
node -e 'import("./src/config/database.js").then(async ({default:p}) => {
  await p.student.update({ where: { email: "you@example.com" }, data: { role: "admin" } });
  await p.$disconnect();
})'
```

Email (Resend) is only used by the legacy magic-link/contact flows; posting, voting
and replying need no email configuration.

---

## 4. Test walkthrough

1. **Signed out** — `/community/share` redirects to the login page.
2. **Write** — after signing in, open *Share your journey*: no name or email fields,
   just a cover image, title, story (100+ characters) and tags. Press *Publish story*;
   the success screen says it is live and links straight to the post.
3. **Feed card** — avatar, date, tags, cover thumbnail, score and comment count. The
   author's name is not shown on the card.
4. **Vote** — click the up arrow: the score rises and survives a reload. Click it again
   to remove the vote. Signed-out visitors are sent to the login page.
5. **Comments** — the composer is hidden until you press *Comment* in the section header
   (press *Cancel* to close it). The name field always starts empty. Post a comment,
   then press *Reply* under it: the reply is indented under the parent and the counter
   counts replies too.
6. **Delete your post** — *Delete post* → confirm. You are returned to the feed and the
   post, its votes and its comments are gone. Another member can not delete it (403).
7. **Admin** — an admin can delete any post from the post page or the admin tab.

### Automated check

```bash
cd backend && node scripts/community-smoke.mjs
```

54 assertions: auth gates, validation, honeypot, immediate publication, search/tag
filters, email privacy, vote add/flip/withdraw, invalid votes, nested replies,
unlimited commenting, long comments, author contact (on/off), reports and
resolution, author/admin deletion, cascade deletion. It creates and removes its own
data.

---

## 5. API reference

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/community/journeys?search=&tag=&page=&limit=` | optional | Feed, newest first, with `score`, `myVote`, `commentCount`, `isAuthor` |
| `GET` | `/api/community/journeys/:slug` | optional | Full post (adds `story` and `image`) |
| `POST` | `/api/community/journeys` | JWT | Publish a post (goes live immediately) |
| `DELETE` | `/api/community/journeys/:slug` | JWT | Author or admin deletes a post |
| `POST` | `/api/community/journeys/:slug/vote` | JWT | `{ value: 1 \| -1 \| 0 }` → `{ score, myVote }` |
| `GET` | `/api/community/journeys/:slug/comments` | public | Nested threads (`replies[]`) plus `total` |
| `POST` | `/api/community/journeys/:slug/comments` | JWT | `{ body, parentId? }` — name comes from the member's profile |
| `POST` | `/api/community/journeys/:slug/report` | public | Report a post |
| `GET` | `/api/community/tags` | public | Tag list with counts |
| `GET` | `/api/community/report-reasons` | public | Allowed report reasons |
| `GET` | `/api/community/admin/journeys?status=` | JWT + admin | Moderation list with counts |
| `POST` | `/api/community/admin/journeys/:id/review` | JWT + admin | `{ status, moderationNote }` (legacy posts) |
| `PATCH/DELETE` | `/api/community/admin/journeys/:id` | JWT + admin | Edit / delete any post |
| `GET` | `/api/community/admin/journeys/:id/comments` | JWT + admin | Comments for moderation |
| `DELETE` | `/api/community/admin/comments/:id` | JWT + admin | Remove a comment |
| `GET` | `/api/community/admin/reports` | JWT + admin | Open reports |
| `PATCH` | `/api/community/admin/reports/:id` | JWT + admin | `{ status, unpublish? }` |
| `GET/PATCH/DELETE` | `/api/community/manage/:token` | magic link | Legacy author self-service |

A post payload looks like:

```json
{
  "id": "…", "slug": "from-cuet-to-mit", "title": "…", "excerpt": "…",
  "author": { "id": "…", "name": "…", "photo": "https://…profile.jpg", "initials": "…" },
  "image": "data:image/jpeg;base64,…",
  "tags": ["Scholarships"], "createdAt": "…",
  "score": 4, "myVote": 1, "commentCount": 7, "isAuthor": false
}
```

`author.photo` comes from the member's `profileImage`; `image` is the uploaded cover.
`authorEmail` is never returned.

---

## 6. Privacy & security notes

- **Author email is server-only** and stripped by `toPublicJourney()`.
- **XSS:** all text fields are cleaned (control characters stripped, lengths capped) and
  rendered as text by React; stories go through `react-markdown` without raw HTML.
- **Ownership:** deletion checks `authorId` against the JWT subject, or a live
  `role = "admin"` lookup — never a client-supplied id.
- **Spam:** per-IP sliding-window limits on posts (5/hour) and reports (10/hour),
  contact messages (5/hour per sender IP, 25/hour per post), a hidden honeypot and a
  minimum form-fill time. Comments are not rate limited: signed-in members may
  comment as often as they like.
- **Lengths:** titles (140), tags (24), contact messages (4,000) and bios keep a cap;
  stories and comments have no maximum length.
- **Comment identity:** the display name is the member's first name taken from the
  JWT subject, so there is no free-text name field to spoof or fill in.
- **Author contact:** every new post is contactable by default (the form has an opt-out
  checkbox); the message is emailed to the author through Resend and the sender's
  address is only used as `reply_to`.
- **Uploads:** the cover image is resized in the browser (max 1200 px wide JPEG) and
  capped at 400 KB server-side, so no object store is needed.
- **Votes:** unique per `(post, member)` at the database level, so duplicate or
  scripted ballots can not inflate a score.

---

## 7. Deploying

1. `npx prisma db push` against the production database (adds `JourneyVote`,
   `Journey.authorId`, `JourneyComment.parentId`).
2. Deploy the backend with the existing `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`
   and `RESEND_API_KEY` / `EMAIL_FROM` / `PUBLIC_APP_URL` for the author-contact
   emails. With a pooled (PgBouncer/Neon) URL, keep `?pgbouncer=true` on
   `DATABASE_URL` so Prisma does not use prepared statements.
3. `npm run build --prefix frontend` and serve `frontend/dist` with
   `VITE_API_BASE_URL=https://api.your-domain.com/api`.
4. Keep `X-Forwarded-For` intact behind a proxy so rate limiting sees real client IPs.
