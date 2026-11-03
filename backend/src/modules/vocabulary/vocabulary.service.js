import { randomUUID } from 'node:crypto';
import prisma from '../../config/database.js';
import { WORDS } from './wordBank.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const TEST_TTL_MS = 60 * 60 * 1000;
const MAX_TEST_QUESTIONS = 10;
const MIN_WORDS_FOR_TEST = 4;
const MAX_STORED_TESTS = 500;

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

function pickWordForDay(userId, dateKey, learnedWords) {
  const learned = new Set(learnedWords.map((item) => item.word.toLowerCase()));
  const start = hashString(`${userId}:${dateKey}`) % WORDS.length;

  for (let offset = 0; offset < WORDS.length; offset += 1) {
    const candidate = WORDS[(start + offset) % WORDS.length];
    if (!learned.has(candidate.word.toLowerCase())) return candidate;
  }
  return null;
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

export async function getDashboard(userId) {
  const todayKey = getDateKey();

  const [learnedRows, attempts] = await Promise.all([
    prisma.learnedWord.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    prisma.vocabularyTestAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  // A day is complete only when the student meets a word they did not know yet.
  const learnedToday = learnedRows.find((row) => row.learnedOnKey === todayKey && !row.knewIt) || null;
  const todayWord = learnedToday
    ? toWordPayload(learnedToday)
    : pickWordForDay(userId, todayKey, learnedRows);

  return {
    ...buildSummary(learnedRows, todayKey, todayWord ? toWordPayload(todayWord) : null, learnedToday),
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

  const learnedWords = await prisma.learnedWord.findMany({
    where: { userId },
    select: { word: true, learnedOnKey: true, knewIt: true },
  });

  const dayWord = learnedWords.find((row) => row.learnedOnKey === todayKey && !row.knewIt);
  if (dayWord) {
    throw new VocabularyError('You have already learned a word today. Come back tomorrow.', 409, 'ALREADY_LEARNED');
  }

  const candidate = pickWordForDay(userId, todayKey, learnedWords);
  if (!candidate) {
    throw new VocabularyError('You have learned every word in the bank. Amazing work!', 409, 'BANK_EXHAUSTED');
  }

  let record;
  try {
    record = await prisma.learnedWord.create({
      data: {
        userId,
        word: candidate.word,
        phonetic: candidate.phonetic,
        partOfSpeech: candidate.partOfSpeech,
        definition: candidate.definition,
        example: candidate.example,
        synonyms: candidate.synonyms,
        knewIt: Boolean(knewIt),
        learnedOnKey: todayKey,
      },
    });
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

  // Knowing a word keeps the day open: hand back the next word from the bank.
  const learnedToday = !record.knewIt;
  const nextWord = learnedToday ? null : pickWordForDay(userId, todayKey, allLearned);

  return {
    word: toWordPayload(record),
    knewIt: record.knewIt,
    dateKey: todayKey,
    learnedToday,
    nextWord: nextWord ? toWordPayload(nextWord) : null,
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
