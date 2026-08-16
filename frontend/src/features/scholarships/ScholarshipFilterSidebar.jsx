import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { Filter, RotateCcw, Globe, DollarSign, Award } from 'lucide-react';

const fundingOptions = [
  { label: 'All Funding Types', value: 'All' },
  { label: 'Full Funding (100%)', value: 'Full' },
  { label: 'Partial / Grant', value: 'Partial' },
];

const sortOptions = [
  { label: 'Award Value (Highest First)', value: 'amount' },
  { label: 'Scholarship Name (A-Z)', value: 'name-asc' },
  { label: 'Country (A-Z)', value: 'country-asc' },
];

const ScholarshipFilterSidebar = ({
  countries = [],
  selectedCountry = 'All',
  selectedFunding = 'All',
  selectedSort = 'amount',
  onCountryChange,
  onFundingChange,
  onSortChange,
  onResetFilters,
}) => {
  const activeCount = [
    selectedCountry !== 'All',
    selectedFunding !== 'All',
    selectedSort !== 'amount',
  ].filter(Boolean).length;

  return (
    <Card className="sticky top-24 space-y-6 p-6 no-scrollbar rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-brand" />
          <h3 className="text-base font-bold text-primary">Scholarship Filters</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="accent">{activeCount} active</Badge>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition"
              title="Reset filters"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Sort By */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Sort Scholarships
        </label>
        <select
          value={selectedSort}
          onChange={(e) => onSortChange?.(e.target.value)}
          aria-label="Sort Scholarships"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-brand focus:bg-white focus:outline-none"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Funding Level Filter */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 text-brand" />
          <span>Funding Coverage</span>
        </label>
        <div className="flex flex-col gap-1.5">
          {fundingOptions.map((opt) => {
            const isSelected = selectedFunding === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onFundingChange?.(opt.value)}
                className={`rounded-2xl border px-3.5 py-2 text-xs font-semibold text-left transition ${
                  isSelected
                    ? 'border-brand bg-brand text-white shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-brand hover:text-brand hover:bg-white'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Host Country Filter */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-brand" />
            <span>Host Country / Region</span>
          </label>
          <span className="text-[11px] text-slate-400">{countries.length} available</span>
        </div>
        <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto no-scrollbar py-1">
          {['All', ...countries].map((c) => {
            const isSelected = selectedCountry === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onCountryChange?.(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  isSelected
                    ? 'border-brand bg-brand text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-brand'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default ScholarshipFilterSidebar;
