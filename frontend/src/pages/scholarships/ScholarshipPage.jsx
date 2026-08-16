import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import {
  ScholarshipCard,
  ScholarshipFilterBar,
  ScholarshipDetailModal,
} from '../../features/scholarships';
import { Search, RotateCcw, Sparkles, X, Award } from 'lucide-react';
import Button from '../../components/ui/Button';
import { initialScholarships } from '../../data/initialData';

const ScholarshipPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Instant initial data
  const [scholarships, setScholarships] = useState(initialScholarships);
  const [availableCountries, setAvailableCountries] = useState([
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
  ]);

  // Search state
  const initialSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  // Applied Filter states (updated only when user clicks Apply Filters or Reset)
  const [appliedCountry, setAppliedCountry] = useState('All');
  const [appliedFunding, setAppliedFunding] = useState('All');
  const [appliedSort, setAppliedSort] = useState('amount');

  // Modal state
  const [activeModalScholarship, setActiveModalScholarship] = useState(null);

  // Sync search param if updated from URL
  useEffect(() => {
    const q = searchParams.get('search');
    if (q) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  // Load unique countries in background
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await api.get('/scholarships/countries');
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 1) {
          setAvailableCountries(res.data.data);
        }
      } catch (e) {
        // Keep initial country list
      }
    };
    fetchCountries();
  }, []);

  // Fetch scholarships from backend
  const loadScholarships = useCallback(async () => {
    try {
      const params = {
        limit: 100,
        sort: appliedSort,
      };

      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (appliedCountry !== 'All') params.country = appliedCountry;
      if (appliedFunding !== 'All') params.fundingLevel = appliedFunding;

      const response = await api.get('/scholarships', { params });
      if (response.data?.data && response.data.data.length > 0) {
        setScholarships(response.data.data);
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

  const hasActiveFilters =
    appliedCountry !== 'All' ||
    appliedFunding !== 'All' ||
    appliedSort !== 'amount' ||
    searchQuery;

  return (
    <section className="space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.24em] text-brand">
                StudyBridge
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                <Sparkles className="h-3 w-3" /> Fully Funded & Partial Grants
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedScholarships.map((scholarship) => (
            <ScholarshipCard
              key={scholarship.id || scholarship.name}
              scholarship={scholarship}
              onSelect={handleOpenDetails}
            />
          ))}
        </div>
      )}

      {/* Refined Scholarship Detail Modal */}
      {activeModalScholarship && (
        <ScholarshipDetailModal
          scholarship={activeModalScholarship}
          onClose={() => setActiveModalScholarship(null)}
          onUniversityClick={(uni) => {
            navigate(`/universities?search=${encodeURIComponent(uni.name)}`);
          }}
        />
      )}
    </section>
  );
};

export default ScholarshipPage;
