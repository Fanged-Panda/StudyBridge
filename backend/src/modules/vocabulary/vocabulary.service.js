import { randomUUID } from 'node:crypto';
import prisma from '../../config/database.js';
import { WORDS } from './wordBank.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const TEST_TTL_MS = 60 * 60 * 1000;
const MAX_TEST_QUESTIONS = 10;
const MIN_WORDS_FOR_TEST = 4;
const MAX_STORED_TESTS = 500;
// Share of daily picks that come from words the student said they knew.
const REVIEW_PERCENT = 35;
const DEFAULT_DAILY_GOAL = 3;
const MAX_DAILY_GOAL = 20;

// Transient test state: answers stay on the server until the test is submitted.
const tests = new Map();

export class VocabularyError extends Error {
  constructor(message, status = 400, code = 'VOCABULARY_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function shiftDateKey(dateKey, days) {
  return new Date(new Date(`${dateKey}T00:00:00.000Z`).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function toWordPayload(entry) {
  return {
    word: entry.word,
    phonetic: entry.phonetic,
    partOfSpeech: entry.partOfSpeech,
    definition: entry.definition,
    example: entry.example,
    synonyms: Array.isArray(entry.synonyms) ? entry.synonyms : [],
  };
}

function calculateStreak(dateKeys, todayKey) {
  const learned = new Set(dateKeys);
  let cursor = learned.has(todayKey) ? todayKey : shiftDateKey(todayKey, -1);
  let streak = 0;
  while (learned.has(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }
  return streak;
}

function pickUnseenWord(userId, dateKey, learnedWords) {
  const learned = new Set(learnedWords.map((item) => item.word.toLowerCase()));
  const start = hashString(`${userId}:${dateKey}`) % WORDS.length;

  for (let offset = 0; offset < WORDS.length; offset += 1) {
    const candidate = WORDS[(start + offset) % WORDS.length];
    if (!learned.has(candidate.word.toLowerCase())) return candidate;
  }
  return null;
}

/**
 * Words the student marked as "I know this" come back around: a share of the
 * daily picks is drawn from them so they get learned properly this time.
 */
function pickWordForDay(userId, dateKey, learnedWords) {
  const reviewable = learnedWords.filter(
    (row) => row.knewIt && row.learnedOnKey !== dateKey && row.word,
  );

  const unseen = pickUnseenWord(userId, dateKey, learnedWords);
  if (!reviewable.length) return unseen ? { entry: unseen, isReview: false } : null;

  // Deterministic, not random: the dashboard and the "learn" call must agree on
  // which word is on screen, so the pick is derived from the day and the state.
  // The number of words already learned today is included so a session mixes
  // fresh words with review words instead of picking the same kind all day.
  const learnedToday = learnedWords.filter((row) => row.learnedOnKey === dateKey && !row.knewIt).length;
  const seed = hashString(`${userId}:${dateKey}:${learnedToday}:${reviewable.length}`);

  if (!unseen || seed % 100 < REVIEW_PERCENT) {
    return { entry: reviewable[seed % reviewable.length], isReview: true };
  }

  return { entry: unseen, isReview: false };
}

function pickedPayload(picked) {
  if (!picked) return null;
  return { ...toWordPayload(picked.entry), isReview: Boolean(picked.isReview) };
}

function clampGoal(value) {
  const goal = Number(value);
  if (!Number.isFinite(goal)) return DEFAULT_DAILY_GOAL;
  return Math.min(MAX_DAILY_GOAL, Math.max(1, Math.round(goal)));
}

function countNewWordsToday(rows, todayKey) {
  return rows.filter((row) => row.learnedOnKey === todayKey && !row.knewIt).length;
}

function buildSummary(learnedRows, todayKey, todayWord, learnedToday) {
  return {
    totalLearned: learnedRows.length,
    streak: calculateStreak(learnedRows.map((row) => row.learnedOnKey), todayKey),
    canTakeTest: learnedRows.length >= MIN_WORDS_FOR_TEST,
    learnedToday: Boolean(learnedToday),
    today: todayWord,
  };
}

export async function setDailyGoal(userId, goal) {
  const normalized = clampGoal(goal);
  await prisma.student.update({ where: { id: userId }, data: { dailyGoal: normalized } });
  return getDashboard(userId);
}

export async function getDashboard(userId) {
  const todayKey = getDateKey();

  const [student, learnedRows, attempts] = await Promise.all([
    prisma.student.findUnique({ where: { id: userId }, select: { dailyGoal: true } }),
    prisma.learnedWord.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.vocabularyTestAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  const goal = clampGoal(student?.dailyGoal ?? DEFAULT_DAILY_GOAL);
  const learnedCount = countNewWordsToday(learnedRows, todayKey);
  const goalMet = learnedCount >= goal;

  // The card shows the word the student is working on right now, plus the next
  // one from the bank once the current word has been revealed and saved.
  const nextWord = goalMet ? null : pickWordForDay(userId, todayKey, learnedRows);

  return {
    ...buildSummary(learnedRows, todayKey, pickedPayload(nextWord), learnedCount > 0),
    goal,
    learnedCount,
    remaining: Math.max(0, goal - learnedCount),
    goalMet,
    knownToday: learnedRows.filter((row) => row.learnedOnKey === todayKey && row.knewIt).length,
    dateKey: todayKey,
    recentTests: attempts.map((attempt) => ({
      id: attempt.id,
      total: attempt.total,
      correct: attempt.correct,
      createdAt: attempt.createdAt,
    })),
  };
}

export async function listWords(userId) {
  const rows = await prisma.learnedWord.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((row) => ({
    id: row.id,
    ...toWordPayload(row),
    knewIt: row.knewIt,
    learnedOnKey: row.learnedOnKey,
    learnedAt: row.createdAt,
  }));
}

export async function learnTodayWord(userId, { knewIt } = {}) {
  const todayKey = getDateKey();
  const knew = Boolean(knewIt);

  const [student, learnedWords] = await Promise.all([
    prisma.student.findUnique({ where: { id: userId }, select: { dailyGoal: true } }),
    prisma.learnedWord.findMany({
      where: { userId },
      select: { word: true, learnedOnKey: true, knewIt: true },
    }),
  ]);

  const goal = clampGoal(student?.dailyGoal ?? DEFAULT_DAILY_GOAL);
  const learnedCountBefore = countNewWordsToday(learnedWords, todayKey);

  if (learnedCountBefore >= goal) {
    throw new VocabularyError(
      `You have reached today’s goal of ${goal} ${goal === 1 ? 'word' : 'words'}. Come back tomorrow!`,
      409,
      'GOAL_REACHED',
    );
  }

  const candidate = pickWordForDay(userId, todayKey, learnedWords);
  if (!candidate) {
    throw new VocabularyError('You have learned every word in the bank. Amazing work!', 409, 'BANK_EXHAUSTED');
  }

  const entry = candidate.entry;
  let record;
  try {
    if (candidate.isReview) {
      // A word that was previously skipped as "already known" is now learned
      // for real: refresh its row instead of creating a duplicate.
      record = await prisma.learnedWord.update({
        where: { userId_word: { userId, word: entry.word } },
        data: {
          phonetic: entry.phonetic,
          partOfSpeech: entry.partOfSpeech,
          definition: entry.definition,
          example: entry.example,
          synonyms: entry.synonyms,
          knewIt: Boolean(knewIt),
          learnedOnKey: todayKey,
          createdAt: new Date(),
        },
      });
    } else {
      record = await prisma.learnedWord.create({
        data: {
          userId,
          word: entry.word,
          phonetic: entry.phonetic,
          partOfSpeech: entry.partOfSpeech,
          definition: entry.definition,
          example: entry.example,
          synonyms: entry.synonyms,
          knewIt: Boolean(knewIt),
          learnedOnKey: todayKey,
        },
      });
    }
  } catch (error) {
    if (error?.code === 'P2002') {
      throw new VocabularyError('That word was just saved. Refresh to carry on.', 409, 'DUPLICATE_WORD');
    }
    throw error;
  }

  const allLearned = await prisma.learnedWord.findMany({
    where: { userId },
    select: { word: true, learnedOnKey: true, knewIt: true },
  });

  // The day stays open until the student reaches their goal, so hand back the
  // next word whenever there is still room.
  const learnedCount = countNewWordsToday(allLearned, todayKey);
  const goalMet = learnedCount >= goal;
  const nextWord = goalMet ? null : pickWordForDay(userId, todayKey, allLearned);

  return {
    word: { ...toWordPayload(entry), isReview: candidate.isReview },
    isReview: candidate.isReview,
    knewIt: record.knewIt,
    dateKey: todayKey,
    learnedToday: !record.knewIt,
    nextWord: pickedPayload(nextWord),
    goal,
    learnedCount,
    remaining: Math.max(0, goal - learnedCount),
    goalMet,
    knownToday: allLearned.filter((row) => row.learnedOnKey === todayKey && row.knewIt).length,
    totalLearned: allLearned.length,
    streak: calculateStreak(allLearned.map((row) => row.learnedOnKey), todayKey),
    canTakeTest: allLearned.length >= MIN_WORDS_FOR_TEST,
  };
}

function pruneTests() {
  if (tests.size <= MAX_STORED_TESTS) return;
  const entries = [...tests.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
  entries.slice(0, tests.size - MAX_STORED_TESTS).forEach(([key]) => tests.delete(key));
}

export async function startTest(userId) {
  const learnedRows = await prisma.learnedWord.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (learnedRows.length < MIN_WORDS_FOR_TEST) {
    throw new VocabularyError(
      `Learn at least ${MIN_WORDS_FOR_TEST} words before taking a test.`,
      409,
      'NOT_ENOUGH_WORDS',
    );
  }

  const targets = shuffle(learnedRows).slice(0, Math.min(MAX_TEST_QUESTIONS, learnedRows.length));
  const distractorPool = shuffle([
    ...WORDS.map((entry) => entry.definition),
    ...learnedRows.map((row) => row.definition),
  ]);

  const questions = targets.map((target, index) => {
    const options = [target.definition];
    for (const candidate of distractorPool) {
      if (candidate === target.definition || options.includes(candidate)) continue;
      options.push(candidate);
      if (options.length === 4) break;
    }

    const shuffledOptions = shuffle(options);
    return {
      id: `q${index + 1}`,
      word: target.word,
      phonetic: target.phonetic,
      partOfSpeech: target.partOfSpeech,
      options: shuffledOptions.map((text, optionIndex) => ({
        id: `q${index + 1}o${optionIndex + 1}`,
        text,
      })),
      correctOptionId: `q${index + 1}o${shuffledOptions.indexOf(target.definition) + 1}`,
      definition: target.definition,
    };
  });

  const testId = randomUUID();
  tests.set(testId, {
    userId,
    createdAt: Date.now(),
    questions: questions.map((question) => ({
      id: question.id,
      word: question.word,
      definition: question.definition,
      correctOptionId: question.correctOptionId,
    })),
  });
  pruneTests();

  return {
    testId,
    total: questions.length,
    questions: questions.map(({ correctOptionId, definition, ...question }) => question),
  };
}

export async function submitTest(userId, testId, answers = {}) {
  const test = tests.get(String(testId));
  if (!test) {
    throw new VocabularyError('This test has expired. Please start a new one.', 404, 'TEST_NOT_FOUND');
  }
  if (test.userId !== userId) {
    throw new VocabularyError('This test does not belong to you.', 403, 'TEST_FORBIDDEN');
  }
  if (Date.now() - test.createdAt > TEST_TTL_MS) {
    tests.delete(String(testId));
    throw new VocabularyError('This test has expired. Please start a new one.', 410, 'TEST_EXPIRED');
  }

  const results = test.questions.map((question) => {
    const selectedOptionId = answers?.[question.id] || null;
    return {
      questionId: question.id,
      word: question.word,
      definition: question.definition,
      correctOptionId: question.correctOptionId,
      selectedOptionId,
      isCorrect: selectedOptionId === question.correctOptionId,
    };
  });

  tests.delete(String(testId));

  const correct = results.filter((result) => result.isCorrect).length;
  const total = results.length;

  const attempt = await prisma.vocabularyTestAttempt.create({
    data: { userId, total, correct },
  });

  return {
    id: attempt.id,
    total,
    correct,
    scorePercent: total ? Math.round((correct / total) * 100) : 0,
    results,
    createdAt: attempt.createdAt,
  };
}

export const TEST_SETTINGS = { MIN_WORDS_FOR_TEST, MAX_TEST_QUESTIONS };
export const GOAL_SETTINGS = { DEFAULT_DAILY_GOAL, MAX_DAILY_GOAL };
