import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Brain, CheckCircle2, Loader2, RotateCcw, Target, Trophy } from 'lucide-react';
import { DailyWordCard, VocabularyTest, WordList } from '../../features/vocabulary';
import { vocabularyApi } from '../../services/api';

const TABS = [
  { id: 'today', label: 'Today’s session' },
  { id: 'words', label: 'My words' },
  { id: 'test', label: 'Test' },
];

const GOAL_OPTIONS = [1, 3, 5, 10, 15];

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
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalError, setGoalError] = useState('');
  const [sessionOver, setSessionOver] = useState(false);
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
      setSessionOver(Boolean(data.goalMet) || !data.today);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load WordLab. Please try again.');
    } finally {
      setLoading(false);
    }
    await loadWords();
  }, [loadWords]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // The card owns which word is on screen; we only keep the day's counters in sync.
  const handleLearn = async (knewIt) => {
    const data = await vocabularyApi.learn({ knewIt });
    setDashboard((prev) => ({
      ...(prev || {}),
      learnedCount: data.learnedCount,
      remaining: data.remaining,
      goalMet: data.goalMet,
      goal: data.goal ?? prev?.goal,
      knownToday: data.knownToday ?? prev?.knownToday ?? 0,
      totalLearned: data.totalLearned,
      streak: data.streak,
      canTakeTest: data.canTakeTest,
    }));
    await loadWords();
    return data;
  };

  const handleGoalChange = async (nextGoal) => {
    if (goalSaving || nextGoal === dashboard?.goal) return;
    setGoalSaving(true);
    setGoalError('');
    try {
      const data = await vocabularyApi.setGoal(nextGoal);
      setDashboard(data);
      setSessionOver(Boolean(data.goalMet) || !data.today);
    } catch (err) {
      setGoalError(err?.response?.data?.message || 'The daily goal could not be saved.');
    } finally {
      setGoalSaving(false);
    }
  };

  const handleTestFinished = async () => {
    try {
      setDashboard(await vocabularyApi.dashboard());
    } catch {
      // Keep the current dashboard; the test result screen already has the score.
    }
  };

  const learnedCount = dashboard?.totalLearned || 0;
  const goal = dashboard?.goal || 3;
  const todayCount = dashboard?.learnedCount || 0;
  const bestRecentScore = dashboard?.recentTests?.length
    ? Math.max(...dashboard.recentTests.map((test) => (test.total ? Math.round((test.correct / test.total) * 100) : 0)))
    : null;

  return (
    <div className="min-h-screen">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">Learn daily</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">WordLab</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            Learn the words that show up in academic writing and entrance exams. Pick how many you want per day, collect
            them, and test yourself whenever you like.
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
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading WordLab…
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
            <StatCard
              icon={Target}
              label="Today"
              value={`${todayCount} / ${goal}`}
              hint={
                dashboard?.goalMet
                  ? 'Goal reached — see you tomorrow'
                  : `${Math.max(0, goal - todayCount)} ${goal - todayCount === 1 ? 'word' : 'words'} to go`
              }
            />
            <StatCard icon={BookOpen} label="Words collected" value={learnedCount} hint="Everything you have learned" />
            <StatCard icon={Brain} label="Day streak" value={`${dashboard?.streak || 0}`} hint="Keep it going" />
          </div>

          {/* Daily goal picker */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-bold text-primary">
                  <Target size={15} className="text-accent" /> How many words per day?
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Your goal applies from today. Words you already knew don’t count towards it — some of them come back later as review words.
                </p>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Daily word goal">
                {GOAL_OPTIONS.map((option) => {
                  const active = goal === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleGoalChange(option)}
                      disabled={goalSaving}
                      aria-pressed={active}
                      className={`inline-flex h-9 min-w-12 items-center justify-center rounded-full px-3 text-sm font-bold transition disabled:opacity-60 ${
                        active
                          ? 'bg-primary text-white shadow-sm'
                          : 'border border-slate-200 bg-white text-text-muted hover:border-accent hover:text-primary'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
            {goalSaving && <p className="mt-2 text-xs text-text-muted">Saving your goal…</p>}
            {goalError && <p className="mt-2 text-xs font-semibold text-red-600">{goalError}</p>}
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
                  {item.id === 'today' && <CheckCircle2 size={14} />}
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
            {tab === 'today' &&
              (sessionOver ? (
                <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-soft">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-accent">
                    <Trophy size={24} />
                  </span>
                  <h2 className="mt-4 text-2xl font-extrabold text-primary">
                    {dashboard?.goalMet ? 'Today’s goal is done' : 'You have learned every word!'}
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
                    {dashboard?.goalMet
                      ? `You collected ${todayCount} new ${todayCount === 1 ? 'word' : 'words'} today — that is ${goal} of ${goal}. Come back tomorrow for the next batch.`
                      : 'The word bank is empty for you for now. Keep testing what you know and check back for new words.'}
                  </p>
                  <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setTab('test')}
                      disabled={!dashboard?.canTakeTest}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                    >
                      <Trophy size={15} /> Test my words
                    </button>
                    <button
                      type="button"
                      onClick={loadAll}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-text-muted transition hover:border-accent hover:text-primary"
                    >
                      <RotateCcw size={14} /> Refresh
                    </button>
                  </div>
                  <p className="mt-4 text-xs text-text-muted">
                    {dashboard?.streak || 0} day streak · {learnedCount} words collected
                  </p>
                </div>
              ) : (
                <DailyWordCard
                  word={dashboard?.today}
                  learnedCount={todayCount}
                  goal={goal}
                  onLearn={handleLearn}
                  onFinish={() => setSessionOver(true)}
                  canTakeTest={Boolean(dashboard?.canTakeTest)}
                  onOpenTest={() => setTab('test')}
                  streak={dashboard?.streak || 0}
                  totalLearned={learnedCount}
                  knownToday={dashboard?.knownToday || 0}
                />
              ))}
            {tab === 'words' && <WordList words={words} loading={wordsLoading} />}
            {tab === 'test' && (
              <VocabularyTest
                canTakeTest={Boolean(dashboard?.canTakeTest)}
                learnedCount={learnedCount}
                onFinished={handleTestFinished}
              />
            )}
          </div>

          {bestRecentScore !== null && (
            <p className="mt-6 text-center text-xs text-text-muted">
              Best of your last {dashboard?.recentTests?.length || 1} test
              {(dashboard?.recentTests?.length || 1) === 1 ? '' : 's'}: <strong>{bestRecentScore}%</strong>
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default VocabularyPage;
