import { Building2, ChevronRight, ExternalLink, Mail } from 'lucide-react';
import Badge from '../../components/ui/Badge';

const initialsOf = (name = '') =>
  name
    .replace(/^(Dr|Prof|Professor)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const fieldChips = (field = '') =>
  String(field)
    .split(',')
    .map((piece) => piece.trim())
    .filter(Boolean);

// The directory has no stored Scholar profile URL for every professor, so fall
// back to a Scholar search for their name and university.
const scholarUrlFor = (professor) => {
  if (professor.googleScholarUrl) return professor.googleScholarUrl;
  if (/scholar\.google\./i.test(professor.profileUrl || '')) return professor.profileUrl;

  const query = [professor.name?.replace(/^(Dr|Prof|Professor)\.?\s+/i, ''), professor.university?.name]
    .filter(Boolean)
    .join(' ');
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
};

const ProfessorCard = ({ professor, onOpenUniversity, compact = false }) => {
  const fields = fieldChips(professor.field);
  const scholarUrl = scholarUrlFor(professor);

  return (
    <article className="group flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:border-brand/40 hover:shadow-lg">
      <div>
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#132034] text-sm font-extrabold text-white">
            {initialsOf(professor.name)}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-base font-extrabold tracking-tight text-primary">{professor.name}</h3>
            <p className="text-xs font-semibold text-accent">{professor.title}</p>
            {professor.department && (
              <p className="mt-0.5 truncate text-xs text-slate-500">{professor.department}</p>
            )}
          </div>
        </div>

        {!compact && professor.bio && (
          <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-slate-600">{professor.bio}</p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {fields.map((field) => (
            <span
              key={field}
              className="rounded-full bg-secondary/70 px-2.5 py-0.5 text-[11px] font-semibold text-primary ring-1 ring-accent/10"
            >
              {field}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        {professor.university ? (
          <button
            type="button"
            onClick={() => onOpenUniversity?.(professor.university)}
            className="inline-flex min-w-0 items-center gap-1.5 text-xs font-semibold text-slate-600 transition hover:text-brand focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            <Building2 size={13} className="shrink-0 text-slate-400" />
            <span className="truncate">{professor.university.name}</span>
            <ChevronRight size={12} className="shrink-0" />
          </button>
        ) : (
          <Badge>Independent</Badge>
        )}

        <div className="flex shrink-0 items-center gap-1.5">
          <a
            href={scholarUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600 transition hover:border-accent hover:text-accent"
            title="Open this professor on Google Scholar"
          >
            <ExternalLink size={11} /> Google Scholar
          </a>
          {professor.email && (
            <a
              href={`mailto:${professor.email}`}
              className="inline-flex items-center rounded-full border border-slate-200 p-1.5 text-slate-600 transition hover:border-accent hover:text-accent"
              title={`Email ${professor.name}`}
              aria-label={`Email ${professor.name}`}
            >
              <Mail size={11} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProfessorCard;
