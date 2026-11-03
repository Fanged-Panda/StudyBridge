import { useEffect, useState } from 'react';
import { BookOpen, Brain, Check, ChevronRight, Loader2, RotateCcw, Sparkles } from 'lucide-react';

const chip = 'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-text-muted';

const DailyWordCard = ({
  word,
  learnedToday,
  onLearn,
  canTakeTest,
  onOpenTest,
  streak,
  totalLearned,
  knownToday = 0,
}) => {
  const [revealed, setRevealed] = useState(learnedToday);
  const [knewIt, setKnewIt] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setRevealed(learnedToday);
    setPending(false);
    setError('');
  }, [word?.word, learnedToday]);

  const handleAnswer = async (didKnow) => {
    setPending(true);
    setError('');
    try {
      const data = await onLearn(didKnow);
      setKnewIt(didKnow);
      // A word you already knew is saved and the next word loads in its place,
      // so only reveal once the day's new word has been found.
      setRevealed(Boolean(data?.learnedToday));
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save today’s word. Please try again.');
    } finally {
      setPending(false);
    }
  };

  if (!word) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-soft">
        <Sparkles className="mx-auto h-10 w-10 text-accent" />
        <h2 className="mt-4 text-xl font-bold text-primary">You have learned every word!</h2>
        <p className="mt-2 text-sm text-text-muted">The word bank is empty for you for now. Keep testing what you know.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-secondary/70 to-white px-6 py-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent">
          <Sparkles size={14} /> Word of the day
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={chip}>
            <BookOpen size={12} /> {totalLearned} learned
          </span>
          <span className={chip}>
            <Brain size={12} /> {streak} day streak
          </span>
        </div>
      </div>

      <div className="px-6 py-10 text-center sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
          {revealed ? 'Today’s word' : 'Do you know this word?'}
        </p>
        <h2 className="mt-4 text-5xl font-extrabold tracking-tight text-primary sm:text-6xl">{word.word}</h2>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-text-muted">
          {word.phonetic && <span className="font-medium text-accent">{word.phonetic}</span>}
          {word.partOfSpeech && (
            <>
              <span className="text-slate-300">•</span>
              <span className="italic">{word.partOfSpeech}</span>
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
              <p className="mt-2 text-lg font-semibold text-primary">{word.definition}</p>

              {word.example && (
                <div className="mt-5 border-l-4 border-accent/40 pl-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">Example</p>
                  <p className="mt-1 text-sm italic text-text-main">“{word.example}”</p>
                </div>
              )}

              {word.synonyms?.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-text-muted">Synonyms</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {word.synonyms.map((synonym) => (
                      <span key={synonym} className="rounded-full border border-accent/20 bg-white px-3 py-1 text-xs font-semibold text-accent">
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
                  {knewIt ? 'Great — today’s word is saved as a review word.' : 'Nice! Today’s word is now in your collection.'}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">A new word unlocks tomorrow. Come back to keep your streak alive.</p>
              </div>
              <button
                type="button"
                onClick={onOpenTest}
                disabled={!canTakeTest}
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                title={canTakeTest ? 'Test your learned words' : 'Learn at least 4 words to unlock tests'}
              >
                Test my words <ChevronRight size={16} />
              </button>
            </div>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-text-muted">
              <RotateCcw size={12} /> One new word per day — resets at midnight UTC.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyWordCard;
