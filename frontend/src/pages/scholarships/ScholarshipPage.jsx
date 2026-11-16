import { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import {
  ScholarshipCard,
  ScholarshipFilterBar,
  ScholarshipDetailModal,
} from '../../features/scholarships';
import { Search, RotateCcw, BadgeCheck, X, Award } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Pagination from '../../components/ui/Pagination';
import { initialScholarships } from '../../data/initialData';
import { startFitCheck } from '../../features/ai';
import { clearCache, getCache, setCache } from '../../services/pageCache';

const PAGE_SIZE = 9;
const FETCH_LIMIT = 500;

const DEFAULT_COUNTRIES = [
  'All',
  'Australia',
  'Canada',
  'Europe',
  'Germany',
  'Japan',
  'South Korea',
  'Switzerland',
  'UK',
  'USA',
];

const scholarshipListCacheKey = (params = {}) =>
  ['sch:list', params.limit || 100, params.sort || 'amount', params.search || '', params.country || '', params.fundingLevel || ''].join('|');

const readIsAdmin = () => {
  try {
    const user = JSON.parse(localStorage.getItem('userProfile') || '{}');
    return user.role === 'admin' || user.email === 'admin@studybridge.com';
  } catch {
    return false;
  }
};

const ScholarshipPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialSearch = searchParams.get('search') || '';

  // Instant initial data: last cached results, otherwise the seed set.
  const [scholarships, setScholarships] = useState(
    () => getCache(scholarshipListCacheKey({ limit: FETCH_LIMIT, search: initialSearch.trim() })) || initialScholarships
  );
  const [availableCountries, setAvailableCountries] = useState(() => getCache('sch:countries') || DEFAULT_COUNTRIES);
  const [isAdmin, setIsAdmin] = useState(readIsAdmin);
  const [editingSch, setEditingSch] = useState(null);
  const [savingSch, setSavingSch] = useState(false);
  const [syncingSchId, setSyncingSchId] = useState(null);
  const [deletingSchId, setDeletingSchId] = useState(null);
  const [adminFeedback, setAdminFeedback] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  // Applied Filter states (updated only when user clicks Apply Filters or Reset)
  const [appliedCountry, setAppliedCountry] = useState('All');
  const [appliedFunding, setAppliedFunding] = useState('All');
  const [appliedSort, setAppliedSort] = useState('amount');
  const [page, setPage] = useState(1);

  // Modal state
  const [activeModalScholarship, setActiveModalScholarship] = useState(null);

  useEffect(() => {
    const syncAdmin = () => setIsAdmin(readIsAdmin());
    window.addEventListener('authchange', syncAdmin);
    return () => window.removeEventListener('authchange', syncAdmin);
  }, []);

  // Sync search param if updated from URL or location state
  useEffect(() => {
    const q = searchParams.get('search');
    if (q) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  useEffect(() => {
    const targetId = location.state?.scholarshipId;
    const targetSearch = location.state?.search;
    if (targetId) {
      const sch = scholarships.find((s) => s.id === targetId);
      if (sch) {
        setActiveModalScholarship(sch);
      }
    }
    if (targetSearch) {
      setSearchQuery(targetSearch);
    }
    if (targetId || targetSearch) {
      window.history.replaceState({}, '');
    }
  }, [location.state, scholarships]);

  // Load unique countries in background
  useEffect(() => {
    if (getCache('sch:countries')) return undefined;
    const fetchCountries = async () => {
      try {
        const res = await api.get('/scholarships/countries');
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 1) {
          setAvailableCountries(res.data.data);
          setCache('sch:countries', res.data.data);
        }
      } catch (e) {
        // Keep initial country list
      }
    };
    fetchCountries();
    return undefined;
  }, []);

  // Fetch scholarships from backend
  const loadScholarships = useCallback(async () => {
    try {
      const params = {
        limit: FETCH_LIMIT,
        sort: appliedSort,
      };

      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (appliedCountry !== 'All') params.country = appliedCountry;
      if (appliedFunding !== 'All') params.fundingLevel = appliedFunding;

      const cacheKey = scholarshipListCacheKey(params);
      const cached = getCache(cacheKey);
      if (cached) {
        setScholarships(cached);
        return;
      }

      const response = await api.get('/scholarships', { params });
      if (response.data?.data && response.data.data.length > 0) {
        setScholarships(response.data.data);
        setCache(cacheKey, response.data.data);
      }
    } catch (requestError) {
      console.warn('Scholarship API notice, using responsive dataset:', requestError?.message);
    }
  }, [searchQuery, appliedCountry, appliedFunding, appliedSort]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadScholarships();
    }, 150);

    return () => clearTimeout(debounceTimer);
  }, [loadScholarships]);

  // Client-side filtering
  const displayedScholarships = useMemo(() => {
    let list = scholarships.filter((s) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        s.name?.toLowerCase().includes(query) ||
        s.country?.toLowerCase().includes(query) ||
        s.eligibility?.toLowerCase().includes(query) ||
        (Array.isArray(s.degrees) && s.degrees.some((d) => d.toLowerCase().includes(query)));

      const matchesCountry = appliedCountry === 'All' || s.country?.toLowerCase() === appliedCountry.toLowerCase();
      const matchesFunding = appliedFunding === 'All' || s.fundingLevel?.toLowerCase() === appliedFunding.toLowerCase();

      return matchesSearch && matchesCountry && matchesFunding;
    });

    if (appliedSort === 'amount') {
      list = [...list].sort((a, b) => (b.amountUsd || 0) - (a.amountUsd || 0));
    } else if (appliedSort === 'name-asc') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (appliedSort === 'country-asc') {
      list = [...list].sort((a, b) => a.country.localeCompare(b.country));
    }

    return list;
  }, [scholarships, searchQuery, appliedCountry, appliedFunding, appliedSort]);

  const totalPages = Math.max(1, Math.ceil(displayedScholarships.length / PAGE_SIZE));
  const paginatedScholarships = useMemo(
    () => displayedScholarships.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [displayedScholarships, page],
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery, appliedCountry, appliedFunding, appliedSort]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const goToPage = (nextPage) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplyFilters = ({ country, funding, sort }) => {
    setAppliedCountry(country);
    setAppliedFunding(funding);
    setAppliedSort(sort);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setAppliedCountry('All');
    setAppliedFunding('All');
    setAppliedSort('amount');
  };

  const handleOpenDetails = async (scholarship) => {
    setActiveModalScholarship(scholarship);
    try {
      if (scholarship.id && !scholarship.id.startsWith('sch-')) {
        const res = await api.get(`/scholarships/${scholarship.id}`);
        if (res.data?.success) {
          setActiveModalScholarship(res.data.data);
        }
      }
    } catch (e) {
      // Keep rich modal data
    }
  };

  const handleAdminSyncScholarship = async (scholarship) => {
    if (!scholarship?.id) return;
    setSyncingSchId(scholarship.id);
    setAdminFeedback(null);
    try {
      const res = await api.post(`/admin/sync/scholarships/${scholarship.id}`, null, { timeout: 180000 });
      setAdminFeedback({ type: 'success', message: res.data?.message || `Synced ${scholarship.name}.` });
      clearCache('sch:');
      clearCache('admin:');
      await loadScholarships();
    } catch (err) {
      setAdminFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Could not sync this scholarship.',
      });
    } finally {
      setSyncingSchId(null);
    }
  };

  const handleAdminDeleteScholarship = async (scholarship) => {
    if (!scholarship?.id) return;
    if (!window.confirm(`Delete ${scholarship.name}?`)) return;
    setDeletingSchId(scholarship.id);
    setAdminFeedback(null);
    try {
      const res = await api.delete(`/admin/scholarships/${scholarship.id}`);
      setScholarships((prev) => prev.filter((item) => item.id !== scholarship.id));
      setActiveModalScholarship((current) => (current?.id === scholarship.id ? null : current));
      setAdminFeedback({ type: 'success', message: res.data?.message || `Deleted ${scholarship.name}.` });
      clearCache('sch:');
      clearCache('admin:');
    } catch (err) {
      setAdminFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Could not delete this scholarship.',
      });
    } finally {
      setDeletingSchId(null);
    }
  };

  const handleSaveAdminScholarship = async (event) => {
    event.preventDefault();
    if (!editingSch?.id) return;
    setSavingSch(true);
    setAdminFeedback(null);
    try {
      const res = await api.put(`/admin/scholarships/${editingSch.id}`, {
        name: editingSch.name,
        country: editingSch.country,
        amountUsd: editingSch.amountUsd,
        fundingLevel: editingSch.fundingLevel,
        eligibility: editingSch.eligibility,
        deadline: editingSch.deadline,
        websiteUrl: editingSch.websiteUrl,
        notifyFollowers: false,
      });
      const updated = res.data?.data;
      if (updated) {
        setScholarships((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      }
      setAdminFeedback({ type: 'success', message: res.data?.message || 'Scholarship updated.' });
      setEditingSch(null);
      clearCache('sch:');
      clearCache('admin:');
    } catch (err) {
      setAdminFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Could not update this scholarship.',
      });
    } finally {
      setSavingSch(false);
    }
  };

  const hasActiveFilters =
    appliedCountry !== 'All' ||
    appliedFunding !== 'All' ||
    appliedSort !== 'amount' ||
    searchQuery;

  return (
    <section className="space-y-6">
      {/* Hero Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.24em] text-brand">
                StudyBridge
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                <BadgeCheck className="h-3 w-3" /> Fully Funded & Partial Grants
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
              Scholarships
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Discover international government scholarships, bilateral funding programs, and institutional financial awards with comprehensive statutory benefit breakdowns.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-2xl px-3.5 py-2">
            <Award className="h-4 w-4 text-brand" />
            <span>{displayedScholarships.length} Programs Found</span>
          </div>
        </div>

        {/* Real-time Search Box */}
        <div className="mt-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search scholarships by program name, country, or eligible major..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-12 pr-10 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-brand focus:bg-white focus:outline-none transition shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {adminFeedback && (
        <div
          className={`rounded-2xl border p-3.5 text-xs font-semibold ${
            adminFeedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {adminFeedback.message}
        </div>
      )}

      {/* Top Filter Bar with Apply Button (Directly below search bar) */}
      <ScholarshipFilterBar
        countries={availableCountries.filter((c) => c !== 'All')}
        appliedCountry={appliedCountry}
        appliedFunding={appliedFunding}
        appliedSort={appliedSort}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
      />

      {/* Results Header Strip */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold text-slate-500">
          Showing <strong className="text-slate-900 font-bold">{displayedScholarships.length}</strong> scholarship opportunities
        </p>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" /> Clear all filters
          </button>
        )}
      </div>

      {/* Expansive Scholarship Cards Grid */}
      {displayedScholarships.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 shadow-sm space-y-4">
          <p className="text-base font-semibold text-slate-700">No scholarship programs match your selected criteria.</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try choosing "All Funding Coverages", selecting another country, or clicking Reset Filters.
          </p>
          <Button variant="outline" onClick={handleResetFilters}>
            Reset All Filters
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedScholarships.map((scholarship) => (
              <ScholarshipCard
                key={scholarship.id || scholarship.name}
                scholarship={scholarship}
                onSelect={handleOpenDetails}
                isAdmin={isAdmin}
                onEditClick={(item) => setEditingSch({ ...item })}
                onSyncClick={handleAdminSyncScholarship}
                onDeleteClick={handleAdminDeleteScholarship}
                syncing={syncingSchId === scholarship.id}
                deleting={deletingSchId === scholarship.id}
                onCheckFit={(item) => startFitCheck(navigate, 'scholarship', item)}
              />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
        </>
      )}

      {/* Refined Scholarship Detail Modal */}
      {activeModalScholarship && (
        <ScholarshipDetailModal
          scholarship={activeModalScholarship}
          onClose={() => setActiveModalScholarship(null)}
          onCheckFit={(item) => startFitCheck(navigate, 'scholarship', item)}
          onUniversityClick={(uni) => {
            navigate(`/universities?search=${encodeURIComponent(uni.name)}`);
          }}
        />
      )}

      {editingSch &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="fixed inset-0" onClick={() => setEditingSch(null)} aria-hidden="true" />
            <Card className="relative z-10 max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-accent">Administrator Edit</span>
                  <h2 className="text-xl font-extrabold text-primary">{editingSch.name}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSch(null)}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close scholarship editor"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAdminScholarship} className="space-y-4">
                {[
                  ['name', 'Program Name', 'text'],
                  ['country', 'Host Country', 'text'],
                  ['amountUsd', 'Award Value (USD)', 'number'],
                  ['fundingLevel', 'Funding Level', 'text'],
                  ['deadline', 'Deadline', 'text'],
                  ['websiteUrl', 'Official URL', 'url'],
                ].map(([key, label, type]) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-bold text-slate-700">{label}</label>
                    <input
                      type={type}
                      value={editingSch[key] ?? ''}
                      onChange={(event) =>
                        setEditingSch({
                          ...editingSch,
                          [key]: type === 'number' && event.target.value !== '' ? Number(event.target.value) : event.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-primary focus:border-brand focus:outline-none"
                    />
                  </div>
                ))}

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Eligibility</label>
                  <textarea
                    rows={3}
                    value={editingSch.eligibility || ''}
                    onChange={(event) => setEditingSch({ ...editingSch, eligibility: event.target.value })}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-primary focus:border-brand focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                  <Button variant="outline" onClick={() => setEditingSch(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={savingSch}>
                    {savingSch ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>,
          document.body,
        )}
    </section>
  );
};

export default ScholarshipPage;
