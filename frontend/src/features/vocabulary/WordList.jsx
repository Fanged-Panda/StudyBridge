import { useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
};

const WordList = ({ words, loading }) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return words;
    return words.filter(
      (item) =>
        item.word.toLowerCase().includes(term) ||
        item.definition.toLowerCase().includes(term) ||
        (item.synonyms || []).some((synonym) => synonym.toLowerCase().includes(term)),
    );
  }, [words, query]);

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-text-muted shadow-soft">
        Loading your words…
      </div>
    );
  }

  if (!words.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-soft">
        <BookOpen className="mx-auto h-10 w-10 text-slate-400" />
        <h2 className="mt-4 text-xl font-bold text-primary">No words yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
          Learn today’s word and it will appear here. Your collection grows by one word every day.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your words, meanings, or synonyms…"
          className="w-full rounded-full border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-text-main shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
        {filtered.length} {filtered.length === 1 ? 'word' : 'words'}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-text-muted">
          No words match “{query}”.
        </p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {filtered.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-soft">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xl font-bold text-primary">{item.word}</h3>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  {formatDate(item.learnedAt)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                {item.phonetic && <span className="font-medium text-accent">{item.phonetic}</span>}
                {item.partOfSpeech && <span className="italic">{item.partOfSpeech}</span>}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    item.knewIt ? 'bg-emerald-50 text-emerald-700' : 'bg-secondary text-accent'
                  }`}
                >
                  {item.knewIt ? 'Already knew' : 'New word'}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium text-text-main">{item.definition}</p>
              {item.example && <p className="mt-2 text-xs italic text-text-muted">“{item.example}”</p>}
              {item.synonyms?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.synonyms.map((synonym) => (
                    <span key={synonym} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-text-muted">
                      {synonym}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default WordList;
