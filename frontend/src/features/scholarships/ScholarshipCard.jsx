import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Award, Calendar, CheckCircle2, Globe, ArrowRight, ExternalLink, Sparkles } from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const ScholarshipCard = ({ scholarship, onSelect }) => {
  const {
    id,
    name,
    country,
    amountUsd,
    fundingLevel,
    eligibility,
    deadline,
    websiteUrl,
    degrees = ["Master's", 'PhD'],
    coverage = [],
  } = scholarship || {};

  const isFull = fundingLevel?.toLowerCase() === 'full';

  return (
    <Card className="group relative flex flex-col justify-between p-6 transition duration-200 hover:shadow-lg hover:border-brand/40 border border-slate-200 bg-white rounded-3xl">
      <div>
        {/* Header Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isFull ? 'accent' : 'default'} className={isFull ? 'bg-accent/15 text-accent font-bold' : 'bg-slate-100 text-slate-700'}>
              {fundingLevel} Funding
            </Badge>
            <Badge variant="brand">{country}</Badge>
          </div>

          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            <Sparkles className="h-3 w-3" /> Live
          </span>
        </div>

        {/* Title */}
        <button
          type="button"
          onClick={() => onSelect?.(scholarship)}
          className="mt-3 text-left group-hover:text-brand transition"
        >
          <h3 className="text-xl font-extrabold tracking-tight text-primary line-clamp-1">
            {name}
          </h3>
        </button>

        {/* Eligibility summary */}
        <p className="mt-2 text-xs text-slate-600 line-clamp-2">
          {eligibility || 'Comprehensive merit and bilateral scholarship program.'}
        </p>

        {/* Value and Deadline Box */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Award Value</p>
            <p className="mt-0.5 text-lg font-extrabold text-brand">
              {amountUsd ? currencyFormatter.format(amountUsd) : 'Full Coverage'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deadline</p>
            <p className="mt-0.5 text-xs font-bold text-slate-800 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {deadline || 'Annual Intake'}
            </p>
          </div>
        </div>

        {/* Coverage Highlights */}
        {coverage && coverage.length > 0 && (
          <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Program Highlights:
            </p>
            <ul className="space-y-1">
              {coverage.slice(0, 2).map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                  <span className="line-clamp-1">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        {websiteUrl ? (
          <Button
            variant="outline"
            href={websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs py-2 px-3.5 inline-flex items-center gap-1"
          >
            Official Site
            <ExternalLink className="h-3 w-3" />
          </Button>
        ) : (
          <div />
        )}

        <Button
          variant="primary"
          onClick={() => onSelect?.(scholarship)}
          className="text-xs py-2 px-4 inline-flex items-center gap-1.5"
        >
          Check Fit & Details
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
};

export default ScholarshipCard;
