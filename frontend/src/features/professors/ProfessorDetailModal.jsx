import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Building2, ExternalLink, Mail, Quote, X } from 'lucide-react';

const fieldChips = (field = '') =>
  String(field)
    .split(',')
    .map((piece) => piece.trim())
    .filter(Boolean);

const scholarUrlFor = (professor) => {
  if (professor.googleScholarUrl) return professor.googleScholarUrl;
  if (/scholar\.google\./i.test(professor.profileUrl || '')) return professor.profileUrl;
  const query = [professor.name?.replace(/^(Dr|Prof|Professor)\.?\s+/i, ''), professor.university?.name]
    .filter(Boolean)
    .join(' ');
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
};

const ProfessorDetailModal = ({ professor, onClose }) => {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => event.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  if (!professor) return null;

  const topics = Array.isArray(professor.topics) ? professor.topics : [];
  const fields = fieldChips(professor.field);

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative bg-gradient-to-br from-primary via-[#132034] to-[#0d1624] p-6 text-white md:p-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close professor details"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/25 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">{professor.title}</p>
          <h2 className="mt-2 pr-8 text-2xl font-black tracking-tight md:text-3xl">{professor.name}</h2>
          {professor.department && <p className="mt-1 text-sm text-slate-300">{professor.department}</p>}
          {professor.university && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white/90">
              <Building2 className="h-3.5 w-3.5 text-teal-300" />
              {professor.university.name}
              {professor.university.country ? ` · ${professor.university.country}` : ''}
            </p>
          )}
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6 md:p-8">
          <div className="grid grid-cols-3 gap-2.5">
            {[
              ['Works', professor.worksCount],
              ['Citations', professor.citedByCount],
              ['h-index', professor.hIndex],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                <p className="text-lg font-black text-primary">{value != null ? Number(value).toLocaleString() : '—'}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-primary">
              <Quote className="h-4 w-4 text-accent" /> Research profile
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {professor.bio || 'Research profile details are not available for this academic yet.'}
            </p>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-primary">
              <BookOpen className="h-4 w-4 text-brand" /> Research areas
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(topics.length ? topics.map((topic) => topic.name).filter(Boolean) : fields).map((topic) => (
                <span key={topic} className="rounded-full bg-secondary/70 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-accent/10">
                  {topic}
                </span>
              ))}
              {topics.length === 0 && fields.length === 0 && (
                <span className="text-xs text-slate-500">No research topics listed.</span>
              )}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <a
              href={scholarUrlFor(professor)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white transition hover:bg-opacity-90"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Google Scholar
            </a>
            {professor.email && (
              <a
                href={`mailto:${professor.email}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-accent hover:text-accent"
              >
                <Mail className="h-3.5 w-3.5" /> Email
              </a>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ProfessorDetailModal;