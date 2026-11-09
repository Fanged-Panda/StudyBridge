import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Brain, Check, ChevronRight, Loader2, RotateCcw, Trophy } from 'lucide-react';

const chip = 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-text-muted';

const DailyWordCard = ({
  word,
  learnedCount = 0,
  goal = 3,
  onLearn,
  canTakeTest,
  onOpenTest,
  streak,
  totalLearned,
  knownToday = 0,
  onFinish,
}) => {
  const [shown, setShown] = useState(word);
  const [revealed, setRevealed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [nextWord, setNextWord] = useState(null);
  const [goalJustMet, setGoalJustMet] = useState(false);
  const [knewIt, setKnewIt] = useState(false);

  // A fresh day (or a new goal) hands down a different starting word.
  useEffect(() => {
    setShown(word);
    setRevealed(false);
    setNextWord(null);
    setGoalJustMet(false);
    setError('');
  }, [word?.word]);

  const startNext = (candidate) => {
    if (!candidate) {
      setGoalJustMet(true);
      onFinish?.();
      return;
    }
    setShown(candidate);
    setRevealed(false);
    setNextWord(null);
    setError('');
  };

  const handleAnswer = async (didKnow) => {
    setPending(true);
    setError('');
    setKnewIt(didKnow);

    try {
      const data = await onLearn(didKnow);
      setNextWord(data?.nextWord || null);

      if (didKnow) {
        // A word you already know does not use up the daily goal — move on to the
        // next candidate straight away and only stop once the goal is reached.
        startNext(data?.nextWord);
      } else {
        setRevealed(true);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save that word. Please try again.');
    } finally {
      setPending(false);
    }
  };

  if (goalJustMet) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-soft">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-accent">
          <Trophy size={24} />
        </span>
        <h2 className="mt-4 text-2xl font-extrabold text-primary">Today’s goal is done</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
          You learned {learnedCount} new {learnedCount === 1 ? 'word' : 'words'} today — that is {goal} of {goal}. Come
          back tomorrow, or test yourself on everything so far.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onOpenTest}
            disabled={!canTakeTest}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            title={canTakeTest ? 'Test your learned words' : 'Learn at least 4 words to unlock tests'}
          >
            <Trophy size={15} /> Test my words
          </button>
          <span className="text-xs text-text-muted">{streak} day streak · {totalLearned} words collected</span>
        </div>
      </div>
    );
  }

  if (!shown) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-soft">
        <BookOpen className="mx-auto h-10 w-10 text-accent" />
        <h2 className="mt-4 text-xl font-bold text-primary">You have learned every word!</h2>
        <p className="mt-2 text-sm text-text-muted">
          The word bank is empty for you for now. Keep testing what you know and check back for new words.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-secondary/70 to-white px-6 py-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent">
          <BookOpen size={14} /> Today’s session
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={chip}>
            <Check size={12} /> {learnedCount}/{goal} today
          </span>
          <span className={chip}>
            <Brain size={12} /> {streak} day streak
          </span>
          <span className={chip}>
            <BookOpen size={12} /> {totalLearned} learned
          </span>
        </div>
      </div>

      {/* Daily progress bar */}
      <div className="h-1.5 w-full bg-slate-100">
        <div
          className="h-full rounded-r-full bg-accent transition-all duration-500"
          style={{ width: `${Math.min(100, Math.round((learnedCount / Math.max(1, goal)) * 100))}%` }}
          role="progressbar"
          aria-valuenow={learnedCount}
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-label="Daily word goal progress"
        />
      </div>

      <div className="px-6 py-10 text-center sm:px-10">
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          <span>{revealed ? 'This word' : `Word ${Math.min(learnedCount + 1, goal)} of ${goal}`}</span>
          {shown.isReview ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.12em] text-amber-700 ring-1 ring-amber-200">
              Review word
            </span>
          ) : null}
        </div>
        <h2 className="mt-4 text-5xl font-extrabold tracking-tight text-primary sm:text-6xl">{shown.word}</h2>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-text-muted">
          {shown.phonetic && <span className="font-medium text-accent">{shown.phonetic}</span>}
          {shown.partOfSpeech && (
            <>
              <span className="text-slate-300">•</span>
              <span className="italic">{shown.partOfSpeech}</span>
            </>
          )}
        </div>

        {!revealed ? (
          <div className="mt-10">
            <p className="mx-auto max-w-md text-sm text-text-muted">
              Be honest. If you already know it, we’ll move on to another word until we find one that’s new to you.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                disabled={pending}
                onClick={() => handleAnswer(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-6 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                Yes, I knew it
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleAnswer(false)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? <Loader2 className="animate-spin" size={16} /> : <BookOpen size={16} />}
                No, teach me
              </button>
            </div>
            {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
            {knownToday > 0 && (
              <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Check size={12} /> Already knew {knownToday} {knownToday === 1 ? 'word' : 'words'} today — keep going
                until we find a new one.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-8 animate-fade-in text-left">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Meaning</p>
              <p className="mt-2 text-lg font-semibold text-primary">{shown.definition}</p>

              {shown.example && (
                <div className="mt-5 border-l-4 border-accent/40 pl-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">Example</p>
                  <p className="mt-1 text-sm italic text-text-main">“{shown.example}”</p>
                </div>
              )}

              {shown.synonyms?.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">Synonyms</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {shown.synonyms.map((synonym) => (
                      <span
                        key={synonym}
                        className="rounded-full border border-accent/20 bg-white px-3 py-1 text-xs font-semibold text-accent"
                      >
                        {synonym}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl bg-secondary/60 px-5 py-4 sm:flex-row">
              <div>
                <p className="text-sm font-bold text-primary">
                  {knewIt ? 'Great — this one is saved as a review word.' : 'Nice! This word is now in your collection.'}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {nextWord
                    ? `${Math.max(0, goal - learnedCount)} more to reach today’s goal of ${goal}.`
                    : `That is ${goal} of ${goal} — today’s goal is complete.`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenTest}
                  disabled={!canTakeTest}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-primary transition hover:border-accent disabled:cursor-not-allowed disabled:text-slate-400"
                  title={canTakeTest ? 'Test your learned words' : 'Learn at least 4 words to unlock tests'}
                >
                  <Trophy size={15} /> Test
                </button>
                <button
                  type="button"
                  onClick={() => startNext(nextWord)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-opacity-90"
                >
                  {nextWord ? 'Next word' : 'Finish for today'}
                  {nextWord ? <ArrowRight size={15} /> : <ChevronRight size={15} />}
                </button>
              </div>
            </div>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-text-muted">
              <RotateCcw size={12} /> A new set of words unlocks at midnight UTC.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyWordCard;
