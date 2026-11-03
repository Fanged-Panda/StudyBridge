import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Brain, Loader2, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { DailyWordCard, VocabularyTest, WordList } from '../../features/vocabulary';
import { vocabularyApi } from '../../services/api';

const TABS = [
  { id: 'today', label: 'Today’s word' },
  { id: 'words', label: 'My words' },
  { id: 'test', label: 'Test' },
];

const StatCard = ({ icon: Icon, label, value, hint }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
      <Icon size={14} className="text-accent" /> {label}
    </div>
    <p className="mt-2 text-2xl font-extrabold text-primary">{value}</p>
    {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
  </div>
);

const VocabularyPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wordsLoading, setWordsLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('today');

  const loadWords = useCallback(async () => {
    setWordsLoading(true);
    try {
      setWords(await vocabularyApi.words());
    } catch {
      // The dashboard error banner covers connectivity problems.
    } finally {
      setWordsLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await vocabularyApi.dashboard();
      setDashboard(data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load your vocabulary. Please try again.');
    } finally {
      setLoading(false);
    }
    await loadWords();
  }, [loadWords]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleLearn = async (knewIt) => {
    const data = await vocabularyApi.learn({ knewIt });
    setDashboard((prev) => ({
      ...(prev || {}),
      // Knowing a word skips straight to the next one without spending the day.
      today: data.learnedToday ? data.word : data.nextWord,
      learnedToday: Boolean(data.learnedToday),
      knownToday: data.knownToday ?? prev?.knownToday ?? 0,
      totalLearned: data.totalLearned,
      streak: data.streak,
      canTakeTest: data.canTakeTest,
    }));
    await loadWords();
    return data;
  };

  const handleTestFinished = async () => {
    try {
      setDashboard(await vocabularyApi.dashboard());
    } catch {
      // Keep the current dashboard; the test result screen already has the score.
    }
  };

  const learnedCount = dashboard?.totalLearned || 0;
  const bestRecentScore = dashboard?.recentTests?.length
    ? Math.max(...dashboard.recentTests.map((test) => (test.total ? Math.round((test.correct / test.total) * 100) : 0)))
    : null;

  return (
    <div className="min-h-screen">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">Learn daily</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">Vocabulary</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            Build your English word power one card at a time. Learn a new word each day, keep your collection, and test
            yourself on everything you have learned.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAll}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-text-muted shadow-sm transition hover:border-accent hover:text-primary sm:self-auto"
        >
          <RotateCcw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="mt-10 flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-16 text-sm text-text-muted shadow-soft">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading your vocabulary…
        </div>
      ) : error ? (
        <div className="mt-10 rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            type="button"
            onClick={loadAll}
            className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatCard icon={BookOpen} label="Words learned" value={learnedCount} hint="Grow the list every day" />
            <StatCard icon={Brain} label="Day streak" value={`${dashboard?.streak || 0}`} hint="Keep it going" />
            <StatCard
              icon={Trophy}
              label="Best recent test"
              value={bestRecentScore === null ? '—' : `${bestRecentScore}%`}
              hint={
                bestRecentScore === null
                  ? 'No tests yet'
                  : `Best of your last ${dashboard?.recentTests?.length || 1} ${
                      (dashboard?.recentTests?.length || 1) === 1 ? 'test' : 'tests'
                    }`
              }
            />
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {TABS.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : 'border border-slate-200 bg-white text-text-muted hover:border-accent hover:text-primary'
                  }`}
                >
                  {item.id === 'today' && <Sparkles size={14} />}
                  {item.id === 'words' && <BookOpen size={14} />}
                  {item.id === 'test' && <Trophy size={14} />}
                  {item.label}
                  {item.id === 'words' && learnedCount > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        active ? 'bg-white/20 text-white' : 'bg-slate-100 text-text-muted'
                      }`}
                    >
                      {learnedCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            {tab === 'today' && (
              <DailyWordCard
                word={dashboard?.today}
                learnedToday={Boolean(dashboard?.learnedToday)}
                onLearn={handleLearn}
                canTakeTest={Boolean(dashboard?.canTakeTest)}
                onOpenTest={() => setTab('test')}
                streak={dashboard?.streak || 0}
                totalLearned={learnedCount}
                knownToday={dashboard?.knownToday || 0}
              />
            )}
            {tab === 'words' && <WordList words={words} loading={wordsLoading} />}
            {tab === 'test' && (
              <VocabularyTest
                canTakeTest={Boolean(dashboard?.canTakeTest)}
                learnedCount={learnedCount}
                onFinished={handleTestFinished}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default VocabularyPage;
