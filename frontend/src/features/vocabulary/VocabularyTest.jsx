import { useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Lock, RefreshCw, Trophy, XCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import { vocabularyApi } from '../../services/api';

const STAGE = { IDLE: 'idle', LOADING: 'loading', RUNNING: 'running', RESULTS: 'results' };

const MIN_WORDS = 4;

const optionClass = (state) => {
  const base = 'w-full rounded-xl border px-4 py-3 text-left text-sm transition';
  if (state === 'selected') return `${base} border-accent bg-secondary/70 font-semibold text-primary shadow-sm`;
  return `${base} border-slate-200 bg-white text-text-main hover:border-accent/60 hover:bg-secondary/30`;
};

const VocabularyTest = ({ canTakeTest, learnedCount, onFinished }) => {
  const [stage, setStage] = useState(STAGE.IDLE);
  const [quiz, setQuiz] = useState(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setStage(STAGE.IDLE);
    setQuiz(null);
    setIndex(0);
    setAnswers({});
    setResult(null);
    setError('');
  };

  const start = async () => {
    setStage(STAGE.LOADING);
    setError('');
    try {
      const data = await vocabularyApi.startTest();
      setQuiz(data);
      setIndex(0);
      setAnswers({});
      setResult(null);
      setStage(STAGE.RUNNING);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not start the test. Please try again.');
      setStage(STAGE.IDLE);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const data = await vocabularyApi.submitTest({ testId: quiz.testId, answers });
      setResult(data);
      setStage(STAGE.RESULTS);
      onFinished?.(data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not submit the test. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canTakeTest && stage !== STAGE.RESULTS) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-soft">
        <Lock className="mx-auto h-10 w-10 text-slate-400" />
        <h2 className="mt-4 text-xl font-bold text-primary">Tests unlock after {MIN_WORDS} words</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
          You have {learnedCount} {learnedCount === 1 ? 'word' : 'words'} so far. Learn{' '}
          {Math.max(MIN_WORDS - learnedCount, 0)} more and you can test yourself on everything you have collected.
        </p>
        <div className="mx-auto mt-5 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${Math.min((learnedCount / MIN_WORDS) * 100, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  if (stage === STAGE.RESULTS && result) {
    const questionMap = new Map((quiz?.questions || []).map((question) => [question.id, question]));
    const scoreColor =
      result.scorePercent >= 80 ? 'text-emerald-600' : result.scorePercent >= 50 ? 'text-amber-500' : 'text-red-500';

    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <Trophy className="h-8 w-8 text-accent" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-primary">Test complete</h2>
          <p className={`mt-2 text-5xl font-extrabold ${scoreColor}`}>{result.scorePercent}%</p>
          <p className="mt-1 text-sm text-text-muted">
            {result.correct} of {result.total} correct
          </p>
        </div>

        <div className="mt-8 space-y-3">
          {result.results.map((item) => {
            const question = questionMap.get(item.questionId);
            const selectedText = question?.options?.find((option) => option.id === item.selectedOptionId)?.text;
            const correctText = question?.options?.find((option) => option.id === item.correctOptionId)?.text;

            return (
              <div
                key={item.questionId}
                className={`rounded-2xl border p-4 ${
                  item.isCorrect ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/40'
                }`}
              >
                <div className="flex items-start gap-2">
                  {item.isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-primary">{item.word}</p>
                    <p className="mt-1 text-sm text-text-main">{correctText || item.definition}</p>
                    {!item.isCorrect && (
                      <p className="mt-1 text-xs text-red-600">
                        You chose: {selectedText || 'No answer'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="primary" onClick={start}>
            <RefreshCw size={16} className="mr-2" /> Test again
          </Button>
          <Button variant="secondary" onClick={reset}>
            <ArrowLeft size={16} className="mr-2" /> Back to today
          </Button>
        </div>
      </div>
    );
  }

  if (stage === STAGE.RUNNING && quiz) {
    const question = quiz.questions[index];
    const selected = answers[question.id];
    const isLast = index === quiz.questions.length - 1;
    const answeredCount = Object.keys(answers).length;

    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
          <span>
            Question {index + 1} of {quiz.total}
          </span>
          <span>{answeredCount} answered</span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${((index + 1) / quiz.total) * 100}%` }}
          />
        </div>

        <div className="mt-8">
          <p className="text-sm text-text-muted">What does this word mean?</p>
          <h2 className="mt-2 text-4xl font-extrabold tracking-tight text-primary">{question.word}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-muted">
            {question.phonetic && <span className="font-medium text-accent">{question.phonetic}</span>}
            {question.partOfSpeech && <span className="italic">({question.partOfSpeech})</span>}
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {question.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option.id }))}
              className={optionClass(selected === option.id ? 'selected' : 'default')}
            >
              {option.text}
            </button>
          ))}
        </div>

        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIndex((value) => Math.max(0, value - 1))}
            disabled={index === 0}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-text-muted transition hover:border-slate-300 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Previous
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={submit}
              disabled={submitting || answeredCount === 0}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {submitting ? 'Checking…' : 'Submit test'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIndex((value) => Math.min(quiz.questions.length - 1, value + 1))}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-opacity-90"
            >
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft sm:p-12">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
        <Trophy className="h-8 w-8 text-accent" />
      </div>
      <h2 className="mt-5 text-2xl font-bold text-primary">Test your vocabulary</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
        A quick multiple-choice quiz built from the {learnedCount} words you have learned. Each test has up to 10 questions.
      </p>
      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
      <Button variant="primary" className="mt-6" onClick={start} disabled={stage === STAGE.LOADING}>
        {stage === STAGE.LOADING ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Trophy size={16} className="mr-2" />}
        {stage === STAGE.LOADING ? 'Preparing…' : 'Start test'}
      </Button>
    </div>
  );
};

export default VocabularyTest;
