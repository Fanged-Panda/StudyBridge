import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import ProfessorCard from '../../features/professors/ProfessorCard';
import ProfessorDetailModal from '../../features/professors/ProfessorDetailModal';
import Pagination from '../../components/ui/Pagination';
import api, { professorsApi } from '../../services/api';
import { clearCache, getCache, setCache } from '../../services/pageCache';

const LIMIT = 500;
const PAGE_SIZE = 9;
const FIELDS_CACHE_KEY = 'professors:fields';
const DEPARTMENTS_CACHE_KEY = 'professors:departments';
const POPULAR_FIELD_LIMIT = 6;

const listCacheKey = (search, field, department) => `professors:list:${search}|${field}|${department}`;

// The directory is served from the database, but the page still has to be
// usable when the API is unreachable, so a small sample set lives here.
const SAMPLE_FIELDS = [
  { name: 'Artificial Intelligence', count: 24 },
  { name: 'Machine Learning', count: 21 },
  { name: 'Data Science', count: 18 },
  { name: 'Renewable Energy', count: 15 },
  { name: 'Public Health', count: 14 },
  { name: 'Robotics', count: 12 },
  { name: 'Economics', count: 11 },
  { name: 'International Law', count: 9 },
  { name: 'Structural Engineering', count: 8 },
];

const SAMPLE_DEPARTMENTS = [
  { name: 'Computer Science & Engineering', count: 22 },
  { name: 'Electrical Engineering', count: 18 },
  { name: 'Mechanical Engineering', count: 14 },
  { name: 'Public Health', count: 12 },
  { name: 'Data Science', count: 11 },
  { name: 'Economics', count: 10 },
  { name: 'Medicine', count: 9 },
  { name: 'Law', count: 8 },
  { name: 'Civil Engineering', count: 7 },
];

const SAMPLE_PROFESSORS = [
  {
    id: 'sample-professor-1',
    name: 'Dr. Ayesha Rahman',
    title: 'Professor of Computer Science',
    department: 'Computer Science & Engineering',
    field: 'Artificial Intelligence, Machine Learning',
    bio: 'Leads a perception lab building multimodal models for low-resource languages and accessible interfaces.',
    email: 'ayesha.rahman@example.edu',
    worksCount: 142,
    hIndex: 38,
    university: { id: 'sample-uni-1', name: 'University of Toronto', country: 'Canada' },
  },
  {
    id: 'sample-professor-2',
    name: 'Prof. Daniel Whitfield',
    title: 'Professor of Economics',
    department: 'Economics',
    field: 'Economics, Public Policy',
    bio: 'Studies how scholarship funding and visa policy shape student migration from South Asia.',
    worksCount: 96,
    hIndex: 31,
    university: { id: 'sample-uni-2', name: 'London School of Economics', country: 'UK' },
  },
  {
    id: 'sample-professor-3',
    name: 'Dr. Mei Lin Chen',
    title: 'Associate Professor',
    department: 'Electrical Engineering',
    field: 'Robotics, Control Systems',
    bio: 'Works on legged robots and safe control for human-robot collaboration on factory floors.',
    worksCount: 78,
    hIndex: 26,
    university: { id: 'sample-uni-3', name: 'National University of Singapore', country: 'Singapore' },
  },
  {
    id: 'sample-professor-4',
    name: 'Dr. Lukas Bauer',
    title: 'Professor of Mechanical Engineering',
    department: 'Mechanical Engineering',
    field: 'Renewable Energy, Thermal Systems',
    bio: 'Designs thermal storage systems that make district heating affordable for mid-sized cities.',
    worksCount: 113,
    hIndex: 34,
    university: { id: 'sample-uni-4', name: 'Technical University of Munich', country: 'Germany' },
  },
  {
    id: 'sample-professor-5',
    name: 'Prof. Sofia Marchetti',
    title: 'Professor of Public Health',
    department: 'Public Health',
    field: 'Public Health, Epidemiology',
    bio: 'Runs cohort studies on adolescent mental health and the reach of campus support services.',
    worksCount: 134,
    hIndex: 41,
    university: { id: 'sample-uni-5', name: 'University of Melbourne', country: 'Australia' },
  },
  {
    id: 'sample-professor-6',
    name: 'Dr. Ibrahim Al-Hassan',
    title: 'Assistant Professor',
    department: 'Data Science',
    field: 'Data Science, Machine Learning',
    bio: 'Builds evaluation methods for Arabic and multilingual language models in education.',
    worksCount: 47,
    hIndex: 18,
    university: { id: 'sample-uni-6', name: 'ETH Zurich', country: 'Switzerland' },
  },
  {
    id: 'sample-professor-7',
    name: 'Prof. Emily Carter',
    title: 'Professor of Law',
    department: 'Law',
    field: 'International Law, Human Rights',
    bio: 'Researches student mobility rights and the legal limits of visa refusal appeals.',
    worksCount: 62,
    hIndex: 22,
    university: { id: 'sample-uni-7', name: 'University of Edinburgh', country: 'UK' },
  },
  {
    id: 'sample-professor-8',
    name: 'Dr. Ravi Krishnan',
    title: 'Professor of Medicine',
    department: 'Medicine',
    field: 'Public Health, Clinical Trials',
    bio: 'Leads multicentre trials on cardiac rehabilitation in low-resource hospital settings.',
    worksCount: 205,
    hIndex: 52,
    university: { id: 'sample-uni-8', name: 'University of California, San Francisco', country: 'USA' },
  },
  {
    id: 'sample-professor-9',
    name: 'Dr. Hannah Osei',
    title: 'Senior Lecturer',
    department: 'Civil Engineering',
    field: 'Structural Engineering, Sustainable Materials',
    bio: 'Tests low-carbon concrete mixes for flood-resilient housing and campus retrofits.',
    worksCount: 39,
    hIndex: 15,
    university: { id: 'sample-uni-9', name: 'Delft University of Technology', country: 'Netherlands' },
  },
];

const filterSampleProfessors = (search, field, department) => {
  const term = String(search || '').trim().toLowerCase();
  const fieldTerm = String(field || '').trim().toLowerCase();
  const departmentTerm = String(department || '').trim().toLowerCase();

  return SAMPLE_PROFESSORS.filter((professor) => {
    const matchesField = !fieldTerm || String(professor.field || '').toLowerCase().includes(fieldTerm);
    const matchesDepartment =
      !departmentTerm || String(professor.department || '').toLowerCase().includes(departmentTerm);
    const matchesSearch =
      !term ||
      [professor.name, professor.field, professor.department, professor.university?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));

    return matchesField && matchesDepartment && matchesSearch;
  });
};

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

const FieldLabel = ({ htmlFor, icon: Icon, children }) => (
  <label
    htmlFor={htmlFor}
    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"
  >
    <Icon className="h-3.5 w-3.5 text-brand" />
    <span>{children}</span>
  </label>
);

const selectClass =
  'w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition focus:border-brand focus:bg-white focus:outline-none';

/** Staged dropdown filters, mirroring the Universities and Scholarships bars. */
const ProfessorFilterBar = ({
  fields = [],
  departments = [],
  appliedField = '',
  appliedDepartment = '',
  onApply,
  onReset,
}) => {
  const [stagedField, setStagedField] = useState(appliedField);
  const [stagedDepartment, setStagedDepartment] = useState(appliedDepartment);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    setStagedField(appliedField);
    setStagedDepartment(appliedDepartment);
  }, [appliedField, appliedDepartment]);

  const activeCount = [Boolean(appliedField), Boolean(appliedDepartment)].filter(Boolean).length;
  const hasUnappliedChanges = stagedField !== appliedField || stagedDepartment !== appliedDepartment;
  const popularFields = fields.slice(0, POPULAR_FIELD_LIMIT);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 p-4 px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary">Filter the faculty</h3>
            <p className="text-[11px] text-slate-500">Narrow by research field or department</p>
          </div>
          {activeCount > 0 && (
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-bold text-accent">
              {activeCount} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-200/60 hover:text-red-600"
            >
              <RefreshCw className="h-3 w-3" /> Reset
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              onApply({ field: stagedField, department: stagedDepartment })
            }
            className={`inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-opacity-90 ${
              hasUnappliedChanges ? 'ring-2 ring-brand ring-offset-1' : ''
            }`}
          >
            <Check className="h-3.5 w-3.5" /> Apply Filters
          </button>

          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-700"
            title={expanded ? 'Collapse filters' : 'Expand filters'}
            aria-label={expanded ? 'Collapse filters' : 'Expand filters'}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="animate-fade-in space-y-4 bg-white p-5 md:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="professor-field" icon={GraduationCap}>
                Field of research
              </FieldLabel>
              <select
                id="professor-field"
                value={stagedField}
                onChange={(event) => setStagedField(event.target.value)}
                className={selectClass}
              >
                <option value="">All research fields</option>
                {fields.map((entry) => (
                  <option key={entry.name} value={entry.name}>
                    {entry.name} ({entry.count})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="professor-department" icon={Users}>
                Department
              </FieldLabel>
              <select
                id="professor-department"
                value={stagedDepartment}
                onChange={(event) => setStagedDepartment(event.target.value)}
                className={selectClass}
              >
                <option value="">All departments</option>
                {departments.map((entry) => (
                  <option key={entry.name} value={entry.name}>
                    {entry.name} ({entry.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {popularFields.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center">
              <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Popular fields:
              </span>
              <div className="flex flex-wrap gap-2">
                {popularFields.map((entry) => {
                  const active = stagedField.toLowerCase() === entry.name.toLowerCase();
                  return (
                    <button
                      key={entry.name}
                      type="button"
                      onClick={() => setStagedField(active ? '' : entry.name)}
                      aria-pressed={active}
                      title={entry.name}
                      className={`max-w-[15rem] shrink-0 truncate rounded-full border px-3 py-1 text-xs font-medium transition ${
                        active
                          ? 'border-brand bg-brand text-white shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-brand/40 hover:text-brand'
                      }`}
                    >
                      {entry.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
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
  const [feedback, setFeedback] = useState(null);
  const [page, setPage] = useState(1);
  const [activeProfessor, setActiveProfessor] = useState(null);
  const [isAdmin, setIsAdmin] = useState(readIsAdmin);
  const [deletingId, setDeletingId] = useState(null);

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
      setLoading(false);
      return;
    }

    setLoading(true);
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
    } catch {
      // Database/API unavailable: fall back to the sample faculty set so the
      // directory still renders instead of an error panel.
      setItems(filterSampleProfessors(search, field, department));
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
      : professorsApi
          .fields()
          .then((data) => {
            if (cancelled) return;
            const list = Array.isArray(data) ? data : [];
            setFields(list);
            setCache(FIELDS_CACHE_KEY, list);
          })
          .catch(() => {
            if (cancelled) return;
            setFields(SAMPLE_FIELDS);
            setCache(FIELDS_CACHE_KEY, SAMPLE_FIELDS);
          });

    const loadDepartments = getCache(DEPARTMENTS_CACHE_KEY)
      ? Promise.resolve()
      : professorsApi
          .departments()
          .then((data) => {
            if (cancelled) return;
            const list = Array.isArray(data) ? data : [];
            setDepartments(list);
            setCache(DEPARTMENTS_CACHE_KEY, list);
          })
          .catch(() => {
            if (cancelled) return;
            setDepartments(SAMPLE_DEPARTMENTS);
            setCache(DEPARTMENTS_CACHE_KEY, SAMPLE_DEPARTMENTS);
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

  const applyFilters = ({ field: nextField, department: nextDepartment }) => {
    setField(nextField || '');
    setDepartment(nextDepartment || '');
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
      </div>

      <ProfessorFilterBar
        fields={fields.length ? fields : SAMPLE_FIELDS}
        departments={departments.length ? departments : SAMPLE_DEPARTMENTS}
        appliedField={field}
        appliedDepartment={department}
        onApply={applyFilters}
        onReset={resetFilters}
      />

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
