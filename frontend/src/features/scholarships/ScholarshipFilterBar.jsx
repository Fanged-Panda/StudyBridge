import { useState, useEffect } from 'react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  SlidersHorizontal,
  RotateCcw,
  Check,
  Globe,
  Award,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const fundingOptions = [
  { label: 'All Funding Coverages', value: 'All' },
  { label: 'Full Funding (100% Tuition + Stipend)', value: 'Full' },
  { label: 'Partial Grants & Waivers', value: 'Partial' },
];

const sortOptions = [
  { label: 'Award Value (Highest First)', value: 'amount' },
  { label: 'Program Name (A-Z)', value: 'name-asc' },
  { label: 'Host Country (A-Z)', value: 'country-asc' },
];

const ScholarshipFilterBar = ({
  countries = [],
  appliedCountry = 'All',
  appliedFunding = 'All',
  appliedSort = 'amount',
  onApplyFilters,
  onResetFilters,
}) => {
  const [stagedCountry, setStagedCountry] = useState(appliedCountry);
  const [stagedFunding, setStagedFunding] = useState(appliedFunding);
  const [stagedSort, setStagedSort] = useState(appliedSort);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    setStagedCountry(appliedCountry);
    setStagedFunding(appliedFunding);
    setStagedSort(appliedSort);
  }, [appliedCountry, appliedFunding, appliedSort]);

  const activeAppliedCount = [
    appliedCountry !== 'All',
    appliedFunding !== 'All',
    appliedSort !== 'amount',
  ].filter(Boolean).length;

  const hasUnappliedChanges =
    stagedCountry !== appliedCountry ||
    stagedFunding !== appliedFunding ||
    stagedSort !== appliedSort;

  const handleApply = () => {
    onApplyFilters({
      country: stagedCountry,
      funding: stagedFunding,
      sort: stagedSort,
    });
  };

  const handleReset = () => {
    setStagedCountry('All');
    setStagedFunding('All');
    setStagedSort('amount');
    onResetFilters();
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 px-6 bg-slate-50/70 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary">Scholarship Filters</h3>
            <p className="text-[11px] text-slate-500">
              Filter by funding coverage, host country, and value
            </p>
          </div>
          {activeAppliedCount > 0 && (
            <Badge variant="accent" className="ml-1">
              {activeAppliedCount} active
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {activeAppliedCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-200/60 hover:text-red-600 transition"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          )}

          <Button
            variant="primary"
            onClick={handleApply}
            className={`text-xs py-2 px-5 font-bold inline-flex items-center gap-1.5 shadow-sm transition ${
              hasUnappliedChanges ? 'ring-2 ring-brand ring-offset-1 animate-pulse' : ''
            }`}
          >
            <Check className="h-3.5 w-3.5" />
            Apply Filters
          </Button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
            title={isExpanded ? 'Collapse Filters' : 'Expand Filters'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Grid */}
      {isExpanded && (
        <div className="p-5 md:p-6 space-y-5 animate-fade-in bg-white">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* 1. Funding Coverage */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-brand" />
                <span>Funding Coverage Type</span>
              </label>
              <select
                value={stagedFunding}
                onChange={(e) => setStagedFunding(e.target.value)}
                aria-label="Funding Coverage Type"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-brand focus:bg-white focus:outline-none transition shadow-2xs"
              >
                {fundingOptions.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Host Country */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-brand" />
                <span>Host Country / Region</span>
              </label>
              <select
                value={stagedCountry}
                onChange={(e) => setStagedCountry(e.target.value)}
                aria-label="Host Country / Region"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-brand focus:bg-white focus:outline-none transition shadow-2xs"
              >
                <option value="All">All Host Countries</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Sort Order */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-brand" />
                <span>Sort Scholarships</span>
              </label>
              <select
                value={stagedSort}
                onChange={(e) => setStagedSort(e.target.value)}
                aria-label="Sort Scholarships"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-brand focus:bg-white focus:outline-none transition shadow-2xs"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Country Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 border-t border-slate-100 py-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Popular:
            </span>
            {['All', 'UK', 'USA', 'Germany', 'Europe', 'Japan', 'Australia', 'South Korea', 'Canada', 'Switzerland'].map(
              (c) => {
                const isSelected = stagedCountry === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setStagedCountry(c)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium shrink-0 transition ${
                      isSelected
                        ? 'border-brand bg-brand text-white shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-brand/40 hover:text-brand'
                    }`}
                  >
                    {c}
                  </button>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScholarshipFilterBar;
