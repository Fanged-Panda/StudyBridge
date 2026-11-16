import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ page, totalPages, onChange, className = '' }) => {
  if (!Number.isFinite(totalPages) || totalPages <= 1) return null;

  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = Math.max(1, Math.min(safePage - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  const itemClass = (active) =>
    `inline-flex h-9 min-w-9 items-center justify-center rounded-xl border px-2.5 text-xs font-bold transition ${
      active
        ? 'border-primary bg-primary text-white'
        : 'border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-primary'
    }`;

  return (
    <nav aria-label="Pagination" className={`flex flex-wrap items-center justify-center gap-1.5 pt-2 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(safePage - 1)}
        disabled={safePage === 1}
        className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-brand hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      {start > 1 && (
        <>
          <button type="button" onClick={() => onChange(1)} className={itemClass(safePage === 1)} aria-label="Page 1">
            1
          </button>
          {start > 2 && <span className="px-1 text-xs text-slate-400">…</span>}
        </>
      )}

      {pages.map((pageNumber) => (
        <button
          key={pageNumber}
          type="button"
          onClick={() => onChange(pageNumber)}
          className={itemClass(pageNumber === safePage)}
          aria-current={pageNumber === safePage ? 'page' : undefined}
          aria-label={`Page ${pageNumber}`}
        >
          {pageNumber}
        </button>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-xs text-slate-400">…</span>}
          <button
            type="button"
            onClick={() => onChange(totalPages)}
            className={itemClass(safePage === totalPages)}
            aria-label={`Page ${totalPages}`}
          >
            {totalPages}
          </button>
        </>
      )}

      <button
        type="button"
        onClick={() => onChange(safePage + 1)}
        disabled={safePage === totalPages}
        className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-brand hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
};

export default Pagination;
