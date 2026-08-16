import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Filter, RotateCcw, Search, GraduationCap, DollarSign, Globe, Award } from 'lucide-react';

const budgetOptions = ['All', 'Low', 'Mid', 'High'];
const ieltsOptions = [
  { label: 'Any IELTS', value: 'All' },
  { label: '≤ 6.0 Band', value: '6.0' },
  { label: '≤ 6.5 Band', value: '6.5' },
  { label: '≤ 7.0 Band', value: '7.0' },
];

const sortOptions = [
  { label: 'World Ranking (Top First)', value: 'ranking' },
  { label: 'Tuition: Low to High', value: 'tuition-asc' },
  { label: 'Tuition: High to Low', value: 'tuition-desc' },
  { label: 'Acceptance: Highest First', value: 'acceptance-desc' },
  { label: 'University Name (A-Z)', value: 'name-asc' },
];

const FilterSidebar = ({
  countries = [],
  subjects = [],
  selectedCountry = 'All',
  selectedSubject = 'All',
  selectedBudget = 'All',
  selectedIelts = 'All',
  selectedSort = 'ranking',
  onCountryChange,
  onSubjectChange,
  onBudgetChange,
  onIeltsChange,
  onSortChange,
  onResetFilters,
}) => {
  const activeCount = [
    selectedCountry !== 'All',
    selectedSubject !== 'All',
    selectedBudget !== 'All',
    selectedIelts !== 'All',
    selectedSort !== 'ranking',
  ].filter(Boolean).length;

  return (
    <Card className="sticky top-24 space-y-6 p-6 no-scrollbar rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Header with active count & reset */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-brand" />
          <h3 className="text-base font-bold text-primary">Advanced Filters</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="accent">{activeCount} active</Badge>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition"
              title="Reset all filters"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Sort By Dropdown */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <span>Sort Results</span>
        </label>
        <select
          value={selectedSort}
          onChange={(e) => onSortChange?.(e.target.value)}
          aria-label="Sort Results"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-brand focus:bg-white focus:outline-none"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Subject / Program Area */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <GraduationCap className="h-3.5 w-3.5 text-brand" />
          <span>Field of Study / Major</span>
        </label>
        <select
          value={selectedSubject}
          onChange={(e) => onSubjectChange?.(e.target.value)}
          aria-label="Field of Study / Major"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-brand focus:bg-white focus:outline-none"
        >
          {subjects.map((sub) => (
            <option key={sub} value={sub}>
              {sub === 'All' ? 'All Disciplines & Fields' : sub}
            </option>
          ))}
        </select>
      </div>

      {/* Country Filter */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-brand" />
            <span>Country</span>
          </label>
          <span className="text-[11px] text-slate-400">{countries.length} available</span>
        </div>
        <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto no-scrollbar py-1">
          {['All', ...countries].map((country) => {
            const isSelected = selectedCountry === country;
            return (
              <button
                key={country}
                type="button"
                onClick={() => onCountryChange?.(country)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  isSelected
                    ? 'border-brand bg-brand text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-brand'
                }`}
              >
                {country}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tuition / Budget Band */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-brand" />
          <span>Annual Tuition Budget</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {budgetOptions.map((option) => {
            const isSelected = selectedBudget === option;
            const label =
              option === 'All'
                ? 'Any Budget'
                : option === 'Low'
                ? '< $15,000'
                : option === 'Mid'
                ? '$15k - $30k'
                : '> $30,000';

            return (
              <button
                key={option}
                type="button"
                onClick={() => onBudgetChange?.(option)}
                className={`rounded-2xl border px-3 py-2 text-xs font-medium transition text-center ${
                  isSelected
                    ? 'border-brand bg-brand text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-brand hover:text-brand hover:bg-white'
                }`}
              >
                <span className="block font-bold">{option}</span>
                <span className="text-[10px] opacity-80">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* IELTS Eligibility Requirement */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 text-brand" />
          <span>My IELTS Score (Max Req)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ieltsOptions.map((opt) => {
            const isSelected = selectedIelts === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onIeltsChange?.(opt.value)}
                className={`rounded-2xl border px-2.5 py-2 text-xs font-medium transition ${
                  isSelected
                    ? 'border-brand bg-brand text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-brand hover:text-brand hover:bg-white'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default FilterSidebar;