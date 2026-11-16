import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Loader2, RefreshCw, Search, Users, X } from 'lucide-react';
import ProfessorCard from '../../features/professors/ProfessorCard';
import ProfessorDetailModal from '../../features/professors/ProfessorDetailModal';
import Pagination from '../../components/ui/Pagination';
import api, { professorsApi } from '../../services/api';
import { clearCache, getCache, setCache } from '../../services/pageCache';

const LIMIT = 500;
const PAGE_SIZE = 9;
const FIELDS_CACHE_KEY = 'professors:fields';
const DEPARTMENTS_CACHE_KEY = 'professors:departments';

const listCacheKey = (search, field, department) => `professors:list:${search}|${field}|${department}`;

const readIsAdmin = () => {
  try {
    const user = JSON.parse(localStorage.getItem('userProfile') || '{}');
    return user.role === 'admin' || user.email === 'admin@studybridge.com';
  } catch {
    return false;
  }
};

const ProfessorSkeleton = () => (
  <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex gap-3">
      <div className="h-12 w-12 rounded-2xl bg-slate-100" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 rounded bg-slate-100" />
        <div className="h-3 w-1/3 rounded bg-slate-100" />
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <div className="h-3 w-full rounded bg-slate-100" />
      <div className="h-3 w-5/6 rounded bg-slate-100" />
    </div>
    <div className="mt-4 flex gap-2">
      <div className="h-5 w-20 rounded-full bg-slate-100" />
      <div className="h-5 w-16 rounded-full bg-slate-100" />
    </div>
  </div>
);

const FilterChipRow = ({ label, entries = [], value, onChange, expanded, onToggle, limit = 10 }) => {
  const activeEntry = value
    ? entries.find((entry) => entry.name.toLowerCase() === value.toLowerCase())
    : null;
  const ordered = activeEntry
    ? [activeEntry, ...entries.filter((entry) => entry.name !== activeEntry.name)]
    : entries;
  const visible = expanded ? ordered : ordered.slice(0, limit);
  const hasMore = ordered.length > limit;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</span>
        <div className={`flex min-w-0 flex-1 items-center gap-2 ${expanded ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`}>
          <button
            type="button"
            onClick={() => onChange('')}
            aria-pressed={!value}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              !value
                ? 'bg-primary text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-accent hover:text-primary'
            }`}
          >
            All
          </button>
          {visible.map((entry) => {
            const active = value.toLowerCase() === entry.name.toLowerCase();
            return (
              <button
                key={entry.name}
                type="button"
                onClick={() => onChange(active ? '' : entry.name)}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  active
                    ? 'bg-accent text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-accent hover:text-primary'
                }`}
              >
                {entry.name}
                <span className={`ml-1.5 text-[10px] ${active ? 'text-white/80' : 'text-slate-400'}`}>{entry.count}</span>
              </button>
            );
          })}
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? `Show fewer ${label.toLowerCase()}` : `Show all ${label.toLowerCase()}`}
            className="shrink-0 rounded-full border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:border-accent hover:text-primary"
          >
            {expanded ? 'Less' : '...'}
          </button>
        )}
      </div>
    </div>
  );
};

const ProfessorPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialField = searchParams.get('field') || '';
  const initialDepartment = searchParams.get('department') || '';
  const cachedList = getCache(listCacheKey(initialSearch, initialField, initialDepartment));

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [field, setField] = useState(initialField);
  const [department, setDepartment] = useState(initialDepartment);
  const [items, setItems] = useState(cachedList?.items ?? []);
  const [fields, setFields] = useState(getCache(FIELDS_CACHE_KEY) ?? []);
  const [departments, setDepartments] = useState(getCache(DEPARTMENTS_CACHE_KEY) ?? []);
  const [loading, setLoading] = useState(!cachedList);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [page, setPage] = useState(1);
  const [activeProfessor, setActiveProfessor] = useState(null);
  const [isAdmin, setIsAdmin] = useState(readIsAdmin);
  const [deletingId, setDeletingId] = useState(null);
  const [showAllFields, setShowAllFields] = useState(false);
  const [showAllDepartments, setShowAllDepartments] = useState(false);

  useEffect(() => {
    const syncAdmin = () => setIsAdmin(readIsAdmin());
    window.addEventListener('authchange', syncAdmin);
    return () => window.removeEventListener('authchange', syncAdmin);
  }, []);

  // Debounce typing so the directory does not refetch on every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, 320);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    const key = listCacheKey(search, field, department);
    const cached = getCache(key);

    if (cached) {
      setItems(cached.items);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await professorsApi.list({
        search: search || undefined,
        field: field || undefined,
        department: department || undefined,
        limit: LIMIT,
      });
      setItems(data.items || []);
      setCache(key, {
        items: data.items || [],
      });
    } catch (err) {
      setError(err?.response?.data?.message || 'The faculty directory could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, field, department]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;

    const loadFields = getCache(FIELDS_CACHE_KEY)
      ? Promise.resolve()
      : professorsApi.fields().then((data) => {
          if (cancelled) return;
          const list = Array.isArray(data) ? data : [];
          setFields(list);
          setCache(FIELDS_CACHE_KEY, list);
        });

    const loadDepartments = getCache(DEPARTMENTS_CACHE_KEY)
      ? Promise.resolve()
      : professorsApi.departments().then((data) => {
          if (cancelled) return;
          const list = Array.isArray(data) ? data : [];
          setDepartments(list);
          setCache(DEPARTMENTS_CACHE_KEY, list);
        });

    Promise.allSettled([loadFields, loadDepartments]).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the URL shareable without adding history entries for every keystroke.
  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set('search', search);
    if (field) next.set('field', field);
    if (department) next.set('department', department);
    setSearchParams(next, { replace: true });
  }, [search, field, department, setSearchParams]);

  const openUniversity = (university) => {
    if (!university?.name) return;
    navigate('/universities', { state: { search: university.name } });
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setField('');
    setDepartment('');
    setFeedback(null);
  };

  const handleDelete = async (professor) => {
    if (!professor?.id) return;
    if (!window.confirm(`Delete ${professor.name} from the faculty directory?`)) return;

    setDeletingId(professor.id);
    setFeedback(null);
    try {
      const res = await api.delete(`/admin/professors/${professor.id}`);
      setItems((prev) => prev.filter((item) => item.id !== professor.id));
      setActiveProfessor((current) => (current?.id === professor.id ? null : current));
      clearCache('professors:');
      setFeedback({ type: 'success', message: res.data?.message || 'Professor deleted.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Could not delete this professor.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const filtersActive = Boolean(search || field || department);
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const paginatedItems = useMemo(
    () => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [items, page],
  );

  useEffect(() => {
    setPage(1);
  }, [search, field, department]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const goToPage = (nextPage) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.24em] text-brand">StudyBridge</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                <GraduationCap size={12} /> Faculty directory
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-primary md:text-4xl">Professors</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Find the academics behind each department: what they teach, the research fields they work in, and the
              university they are based at. Reach out before you apply.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3.5 py-2 text-xs text-slate-500">
            <Users size={15} className="text-brand" />
            <span>{items.length} faculty profiles</span>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <label htmlFor="professor-search" className="sr-only">
              Search professors
            </label>
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="professor-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by name, research field, department or university…"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-3 pl-11 pr-10 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!filtersActive}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={14} /> Reset
          </button>
        </div>

        <FilterChipRow
          label="Fields"
          entries={fields}
          value={field}
          onChange={setField}
          expanded={showAllFields}
          onToggle={() => setShowAllFields((value) => !value)}
        />

        <FilterChipRow
          label="Departments"
          entries={departments}
          value={department}
          onChange={setDepartment}
          expanded={showAllDepartments}
          onToggle={() => setShowAllDepartments((value) => !value)}
        />
      </div>

      {feedback && (
        <div
          className={`rounded-2xl border p-3.5 text-xs font-semibold ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs font-semibold text-slate-500" aria-live="polite">
          {loading ? (
            'Loading faculty…'
          ) : (
            <>
              Showing <strong className="font-bold text-slate-900">{items.length}</strong>{' '}
              {items.length === 1 ? 'professor' : 'professors'}
              {field ? ` in ${field}` : ''}
              {department ? ` · ${department}` : ''}
            </>
          )}
        </p>
        {filtersActive && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            <RefreshCw className="h-3 w-3" /> Clear all filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <ProfessorSkeleton key={index} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-opacity-90"
          >
            <RefreshCw size={14} /> Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-accent">
            <GraduationCap size={22} />
          </span>
          <h2 className="mt-4 text-xl font-extrabold text-primary">No professors match that search</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Try another research field or department, or clear the filters to browse the whole directory.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-opacity-90"
          >
            <X size={14} /> Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedItems.map((professor) => (
              <ProfessorCard
                key={professor.id}
                professor={professor}
                onOpenUniversity={openUniversity}
                onSelect={setActiveProfessor}
                onDeleteClick={handleDelete}
                isAdmin={isAdmin}
                deleting={deletingId === professor.id}
              />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
        </>
      )}

      {activeProfessor && (
        <ProfessorDetailModal professor={activeProfessor} onClose={() => setActiveProfessor(null)} />
      )}

      {loading && (
        <span className="sr-only" role="status">
          <Loader2 className="animate-spin" /> Loading professors
        </span>
      )}
    </section>
  );
};

export default ProfessorPage;
