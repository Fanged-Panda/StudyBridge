import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  X,
  ExternalLink,
  Award,
  CheckCircle2,
  Calendar,
  Globe,
  GraduationCap,
  Sparkles,
  Building2,
  FileText,
  DollarSign,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const ScholarshipDetailModal = ({ scholarship, onClose, onUniversityClick }) => {
  // Lock background scroll and listen for Escape key
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!scholarship) return null;

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
    requirements = [],
    applicationSteps = [
      { step: 1, title: 'Check Eligibility & Academic Alignment', detail: 'Ensure your degree background, nationality, and target field of study qualify for the current intake cycle.' },
      { step: 2, title: 'Compile Academic Credentials & References', detail: 'Prepare certified grade transcripts, English test report (IELTS/TOEFL), and 2-3 academic reference letters.' },
      { step: 3, title: 'Draft Statement of Purpose & Impact Proposal', detail: 'Demonstrate how your research or graduate degree will foster development and positive impact upon return.' },
      { step: 4, title: 'Submit Dossier via Commission Portal', detail: `Complete and submit the formal online application before the ${deadline || 'annual'} deadline.` },
    ],
    eligibleUniversities = [],
  } = scholarship;

  const isFull = fundingLevel?.toLowerCase() === 'full';

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/75 p-3 sm:p-4 md:p-6 backdrop-blur-md"
      onClick={onClose}
      style={{ margin: 0 }}
    >
      <div
        className="relative flex max-h-[88vh] w-full max-w-3xl lg:max-w-4xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative bg-gradient-to-br from-primary via-[#132034] to-[#0d1624] p-5 sm:p-6 md:p-8 text-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/80 hover:bg-white/25 hover:text-white transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white shadow-xs">
              <Award className="h-3.5 w-3.5" />
              {fundingLevel} Funding
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-xs">
              <Globe className="h-3.5 w-3.5 text-teal-300" />
              Host: {country}
            </span>
            {amountUsd && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-400/30">
                Award Value: {currencyFormatter.format(amountUsd)}
              </span>
            )}
          </div>

          <h2 className="mt-3.5 text-2xl font-black tracking-tight text-white md:text-3xl pr-8 leading-snug">
            {name}
          </h2>

          <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-2xl">
            {eligibility || 'International government and institutional scholarship program.'}
          </p>

          {/* Quick Details Ribbon */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs border border-white/10 hover:bg-white/15 transition">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Degree Levels</p>
              <p className="mt-0.5 text-xs sm:text-sm font-extrabold text-white line-clamp-1">
                {degrees.join(', ')}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs border border-white/10 hover:bg-white/15 transition">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Intake Deadline</p>
              <p className="mt-0.5 text-xs sm:text-sm font-extrabold text-teal-300">
                {deadline || 'Annual Cycle'}
              </p>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-2xl bg-white/10 p-3 backdrop-blur-xs border border-white/10 hover:bg-white/15 transition">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Verification Status</p>
              <p className="mt-0.5 text-xs sm:text-sm font-extrabold text-emerald-300 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Active Commission
              </p>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 md:p-8 space-y-6 no-scrollbar">
          {/* Section 1: Financial Package & Benefits */}
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 sm:p-6 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-primary flex items-center gap-2">
                <DollarSign className="h-4.5 w-4.5 text-accent" />
                Statutory Financial Package & Coverage
              </h3>
              <span className="text-xs font-bold text-brand">{isFull ? '100% Comprehensive' : 'Tuition Support'}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Scholars receive the following allowances throughout the duration of their degree:
            </p>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {(coverage.length > 0
                ? coverage
                : [
                    '100% Full university tuition fees waiver',
                    'Monthly living allowance stipend',
                    'Round-trip international air travel grant',
                    'Comprehensive national student health coverage',
                  ]
              ).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-brand/30 transition"
                >
                  <CheckCircle2 className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Candidate Eligibility Guidelines */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-3.5 shadow-2xs">
            <h3 className="text-base font-bold text-primary flex items-center gap-2">
              <GraduationCap className="h-4.5 w-4.5 text-brand" />
              Candidate Eligibility Guidelines
            </h3>

            <div className="space-y-2.5">
              {(requirements.length > 0
                ? requirements
                : [
                    'Undergraduate degree with high academic distinction (CGPA 3.0+ / Upper Second Class)',
                    'Certified English proficiency (IELTS 6.5+ or TOEFL iBT equivalent)',
                    'Commitment to contribute positively to international development',
                  ]
              ).map((req, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5"
                >
                  <div className="rounded-full bg-brand/10 p-1 text-brand shrink-0 mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">{req}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Application Roadmap */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-3.5 shadow-2xs">
            <h3 className="text-base font-bold text-primary flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-brand" />
              Application Process & Roadmap
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              {applicationSteps.map((step) => (
                <div key={step.step} className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white">
                      {step.step}
                    </span>
                    <h4 className="text-xs font-bold text-primary">{step.title}</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Eligible Host Universities */}
          {eligibleUniversities && eligibleUniversities.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-primary flex items-center gap-2">
                  <Building2 className="h-4.5 w-4.5 text-accent" />
                  Eligible Host Universities ({country})
                </h3>
                <span className="text-xs text-slate-400">Top destinations</span>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {eligibleUniversities.map((uni) => (
                  <div
                    key={uni.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex items-center justify-between gap-3 hover:border-brand/40 transition"
                  >
                    <div>
                      <h5 className="text-xs font-bold text-primary">{uni.name}</h5>
                      <p className="text-[11px] text-slate-500">QS #{uni.ranking} • {uni.city || uni.country}</p>
                    </div>
                    {onUniversityClick && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onUniversityClick(uni);
                        }}
                        className="text-xs font-bold text-brand hover:underline shrink-0 inline-flex items-center gap-0.5"
                      >
                        View Uni
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/90 p-4 px-5 sm:px-6 md:px-8 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>Application Deadline: <strong>{deadline || 'Annual Bilateral Cycle'}</strong></span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={onClose} className="text-xs py-2 px-4">
              Close
            </Button>
            {websiteUrl && (
              <Button
                variant="primary"
                href={websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs py-2 px-4 inline-flex items-center gap-1.5 font-bold"
              >
                Official Commission Portal
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ScholarshipDetailModal;
