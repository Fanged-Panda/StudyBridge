import { Building2, ChevronRight, ExternalLink, Mail, Trash2 } from 'lucide-react';
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

const ProfessorCard = ({ professor, onOpenUniversity, onSelect, onDeleteClick, isAdmin = false, deleting = false, compact = false }) => {
  const fields = fieldChips(professor.field);
  const scholarUrl = scholarUrlFor(professor);

  return (
    <article className="group flex h-full min-w-0 flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:border-brand/40 hover:shadow-lg">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[#132034] text-sm font-extrabold text-white">
            {initialsOf(professor.name)}
          </div>
          <div className="min-w-0 flex-1">
            <button type="button" onClick={() => onSelect?.(professor)} className="block max-w-full truncate break-words text-left text-base font-extrabold tracking-tight text-primary transition hover:text-brand">
              {professor.name}
            </button>
            <p className="break-words text-xs font-semibold text-accent">{professor.title}</p>
            {professor.department && (
              <p className="mt-0.5 truncate text-xs text-slate-500">{professor.department}</p>
            )}
            {(professor.worksCount != null || professor.hIndex != null) && (
              <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
                {professor.worksCount != null && `${professor.worksCount.toLocaleString()} works`}
                {professor.worksCount != null && professor.hIndex != null && ' · '}
                {professor.hIndex != null && `h-index ${professor.hIndex}`}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <a
              href={scholarUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1.5 text-slate-500 transition hover:border-accent hover:text-accent"
              title="Open this professor on Google Scholar"
              aria-label={`Open ${professor.name} on Google Scholar`}
            >
              <ExternalLink size={11} />
            </a>
            {isAdmin && (
              <button
                type="button"
                onClick={() => onDeleteClick?.(professor)}
                disabled={deleting}
                className="inline-flex shrink-0 items-center rounded-full border border-red-200 bg-red-50 p-1.5 text-red-600 transition hover:border-red-400 hover:bg-red-100 disabled:opacity-50"
                title="Delete professor"
                aria-label={`Delete ${professor.name}`}
              >
                <Trash2 size={11} />
              </button>
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        {professor.university ? (
          <button
            type="button"
            onClick={() => onOpenUniversity?.(professor.university)}
            className="inline-flex min-w-0 max-w-full flex-1 items-center gap-1.5 text-left text-xs font-semibold text-slate-600 transition hover:text-brand focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            <Building2 size={13} className="shrink-0 text-slate-400" />
            <span className="truncate">{professor.university.name}</span>
            <ChevronRight size={12} className="shrink-0" />
          </button>
        ) : (
          <Badge>Independent</Badge>
        )}

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelect?.(professor)}
            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 transition hover:border-accent hover:text-accent"
          >
            Details
            <ChevronRight size={11} />
          </button>
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
