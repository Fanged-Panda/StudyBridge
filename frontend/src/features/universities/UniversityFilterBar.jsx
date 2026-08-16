import { useState, useEffect } from 'react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  SlidersHorizontal,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Globe,
  DollarSign,
  Award,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

const budgetOptions = [
  { label: 'Any Budget', value: 'All' },
  { label: 'Low (< $15k)', value: 'Low' },
  { label: 'Mid ($15k - $30k)', value: 'Mid' },
  { label: 'High (> $30k)', value: 'High' },
];

const ieltsOptions = [
  { label: 'Any IELTS', value: 'All' },
  { label: '≤ 6.0 Band', value: '6.0' },
  { label: '≤ 6.5 Band', value: '6.5' },
  { label: '≤ 7.0 Band', value: '7.0' },
];

const sortOptions = [
  { label: 'QS Ranking (Top First)', value: 'ranking' },
  { label: 'Tuition: Low to High', value: 'tuition-asc' },
  { label: 'Tuition: High to Low', value: 'tuition-desc' },
  { label: 'Acceptance: Highest First', value: 'acceptance-desc' },
  { label: 'Name (A-Z)', value: 'name-asc' },
];

const UniversityFilterBar = ({
  countries = [],
  subjects = [],
  appliedCountry = 'All',
  appliedSubject = 'All',
  appliedBudget = 'All',
  appliedIelts = 'All',
  appliedSort = 'ranking',
  onApplyFilters,
  onResetFilters,
}) => {
  // Staged state for pending filter selections
  const [stagedCountry, setStagedCountry] = useState(appliedCountry);
  const [stagedSubject, setStagedSubject] = useState(appliedSubject);
  const [stagedBudget, setStagedBudget] = useState(appliedBudget);
  const [stagedIelts, setStagedIelts] = useState(appliedIelts);
  const [stagedSort, setStagedSort] = useState(appliedSort);

  const [isExpanded, setIsExpanded] = useState(true);

  // Sync staged state when applied filters change externally (e.g. reset)
  useEffect(() => {
    setStagedCountry(appliedCountry);
    setStagedSubject(appliedSubject);
    setStagedBudget(appliedBudget);
    setStagedIelts(appliedIelts);
    setStagedSort(appliedSort);
  }, [appliedCountry, appliedSubject, appliedBudget, appliedIelts, appliedSort]);

  const activeAppliedCount = [
    appliedCountry !== 'All',
    appliedSubject !== 'All',
    appliedBudget !== 'All',
    appliedIelts !== 'All',
    appliedSort !== 'ranking',
  ].filter(Boolean).length;

  const hasUnappliedChanges =
    stagedCountry !== appliedCountry ||
    stagedSubject !== appliedSubject ||
    stagedBudget !== appliedBudget ||
    stagedIelts !== appliedIelts ||
    stagedSort !== appliedSort;

  const handleApply = () => {
    onApplyFilters({
      country: stagedCountry,
      subject: stagedSubject,
      budget: stagedBudget,
      ielts: stagedIelts,
      sort: stagedSort,
    });
  };

  const handleReset = () => {
    setStagedCountry('All');
    setStagedSubject('All');
    setStagedBudget('All');
    setStagedIelts('All');
    setStagedSort('ranking');
    onResetFilters();
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all">
      {/* Top Filter Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 px-6 bg-slate-50/70 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary">Advanced Filters</h3>
            <p className="text-[11px] text-slate-500">
              Customize subject, country, budget, and requirements
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

      {/* Expandable Filter Grid */}
      {isExpanded && (
        <div className="p-5 md:p-6 space-y-5 animate-fade-in bg-white">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Field of Study / Subject */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-brand" />
                <span>Field of Study / Major</span>
              </label>
              <select
                value={stagedSubject}
                onChange={(e) => setStagedSubject(e.target.value)}
                aria-label="Field of Study / Major"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-brand focus:bg-white focus:outline-none transition shadow-2xs"
              >
                {subjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub === 'All' ? 'All Disciplines & Fields' : sub}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Country */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-brand" />
                <span>Country / Destination</span>
              </label>
              <select
                value={stagedCountry}
                onChange={(e) => setStagedCountry(e.target.value)}
                aria-label="Country / Destination"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-brand focus:bg-white focus:outline-none transition shadow-2xs"
              >
                <option value="All">All Countries Worldwide</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Tuition Budget Band */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-brand" />
                <span>Annual Tuition Budget</span>
              </label>
              <select
                value={stagedBudget}
                onChange={(e) => setStagedBudget(e.target.value)}
                aria-label="Annual Tuition Budget"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-brand focus:bg-white focus:outline-none transition shadow-2xs"
              >
                {budgetOptions.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. IELTS Requirement & Sort */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-brand" />
                <span>My IELTS Requirement</span>
              </label>
              <select
                value={stagedIelts}
                onChange={(e) => setStagedIelts(e.target.value)}
                aria-label="My IELTS Requirement"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-brand focus:bg-white focus:outline-none transition shadow-2xs"
              >
                {ieltsOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Country Pills & Sort Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                Popular:
              </span>
              {['All', 'USA', 'UK', 'Canada', 'Germany', 'Switzerland', 'Australia', 'Japan', 'Singapore'].map(
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

            <div className="flex items-center gap-2 shrink-0">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500">Sort:</span>
              <select
                value={stagedSort}
                onChange={(e) => setStagedSort(e.target.value)}
                aria-label="Sort Order"
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-brand focus:bg-white focus:outline-none transition"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversityFilterBar;
