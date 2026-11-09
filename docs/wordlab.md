# WordLab — the daily vocabulary trainer

WordLab (`/wordlab`, formerly *Vocabulary*) gives each member a short daily session
of new English words, keeps a collection of everything learned, and lets them test
themselves. Data lives in `LearnedWord` / `VocabularyTestAttempt`; the word bank is
plain JavaScript in `backend/src/modules/vocabulary/`.

---

## 1. Word sources

`wordBank.js` exports `WORDS`, built from two lists:

| List | File | Size | Notes |
| --- | --- | --- | --- |
| English 1K | `core1k.js` | ~989 | The 1,000 most frequent English words with short definitions |
| Curated academic | `wordBank.js` (`CURATED`) | 82 | Hand-written definitions, examples and synonyms for exam-level words |

The 1K list is generated from public data, not typed by hand. Regeneration is three
scripts, run from `backend/`:

```bash
node scripts/build-core-1k.mjs   # fetch frequency list + definitions (cached in /tmp)
node scripts/fill-core-1k.mjs    # retry failures, fall back to DataMuse, rewrite core1k.js
node scripts/fix-core-1k.mjs     # drop acronym/obsolete senses, rewrite core1k.js
```

Sources: the frequency list from `first20hours/google-10000-english`, definitions from
`dictionaryapi.dev` with `api.datamuse.com` as the fallback. The generated file has a
header comment — edit the scripts, not the data file.

---

## 2. How the daily session works

- The member picks a daily goal of **1 / 3 / 5 / 10 / 15** words (`Student.dailyGoal`,
  clamped 1–20).
- `GET /api/vocabulary` returns the word they are working on, `learnedCount`, `remaining`
  and `goalMet`.
- "No, teach me" saves the word and counts it toward the goal; "Yes, I knew it" saves it
  as `knewIt: true` and does not use up the goal.
- **Review words:** words marked "I knew it" come back into rotation. Roughly a third of
  the picks are drawn from them, and they are re-saved in place (`knewIt` cleared,
  today's date) so they count as learned for real. When the fresh pool runs out, review
  words keep the session going instead of ending the day.
- Word choice is deterministic per `(member, day, words learned today)` — hashed, not
  random — so the word on screen is always the word the API saves.
- Tests unlock after 4 learned words and draw 10 questions from the collection.

`dashboard.today.isReview` / `learn` responses carry `isReview`, and the card shows a
"Review word" chip for those picks.

---

## 3. API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/vocabulary` | JWT | Dashboard: today's word, goal, streak, counts |
| `PATCH` | `/api/vocabulary/goal` | JWT | `{ dailyGoal }` |
| `POST` | `/api/vocabulary/learn` | JWT | `{ knewIt }` → saved word + next word |
| `GET` | `/api/vocabulary/words` | JWT | The member's collection |
| `POST` | `/api/vocabulary/test/start` | JWT | Start a 10-question test |
| `POST` | `/api/vocabulary/test/submit` | JWT | `{ testId, answers }` |

---

## 4. Known limits

- The 1K list includes common function words; a few of their definitions are the
  dictionary's secondary sense (for example `school` can surface the "group of fish"
  sense). `fix-core-1k.mjs` removes acronym and obsolete senses but does not
  disambiguate meaning.
- 581 of the 989 generated words have no example sentence, so the card hides that block.
- Tests are kept in memory until submitted, so a backend restart during a test loses it.
