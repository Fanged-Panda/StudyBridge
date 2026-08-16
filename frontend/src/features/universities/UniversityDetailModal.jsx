import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  X,
  ExternalLink,
  BookOpen,
  DollarSign,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Globe,
  Award,
  Clock,
  Sparkles,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const UniversityDetailModal = ({ university, onClose, onScholarshipClick }) => {
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' | 'budget' | 'eligibility' | 'scholarships'
  const [courseSearch, setCourseSearch] = useState('');
  const [expandedCourseId, setExpandedCourseId] = useState(null);

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

  if (!university) return null;

  const {
    id,
    name,
    country,
    city,
    ranking,
    tuitionAnnualUsd = 0,
    acceptanceRate,
    applicationFee,
    applicationDeadline,
    ieltsRequirement,
    greRequirement,
    websiteUrl,
    detailedCourses = [],
    livingCostAnnualUsd = 14000,
    totalEstimatedAnnualUsd = tuitionAnnualUsd + 14000,
    budgetCategory,
    scholarships = [],
    eligibilityChecklist = [],
  } = university;

  const filteredCourses = (detailedCourses || []).filter((c) => {
    if (!courseSearch.trim()) return true;
    const query = courseSearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(query) ||
      c.discipline?.toLowerCase().includes(query) ||
      (c.degrees || []).some((d) => d.toLowerCase().includes(query)) ||
      (c.skills || []).some((s) => s.toLowerCase().includes(query))
    );
  });

  const tuitionPercent = totalEstimatedAnnualUsd > 0 ? Math.round((tuitionAnnualUsd / totalEstimatedAnnualUsd) * 100) : 60;
  const livingPercent = 100 - tuitionPercent;

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

          {/* Badges strip */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white shadow-xs">
              <Award className="h-3.5 w-3.5" />
              QS World Rank #{ranking}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-xs">
              <Globe className="h-3.5 w-3.5 text-teal-300" />
              {country} {city ? `• ${city}` : ''}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-400/30">
              <ShieldCheck className="h-3.5 w-3.5" />
              Accredited Official
            </span>
          </div>

          <h2 className="mt-3.5 text-2xl font-black tracking-tight text-white md:text-3xl pr-8 leading-snug">
            {name}
          </h2>

          {/* Key Metrics Quick Ribbon */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs border border-white/10 hover:bg-white/15 transition">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Annual Tuition</p>
              <p className="mt-0.5 text-base font-extrabold text-white">
                {tuitionAnnualUsd === 0 ? 'Free / Funded' : currencyFormatter.format(tuitionAnnualUsd)}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs border border-white/10 hover:bg-white/15 transition">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Acceptance Rate</p>
              <p className="mt-0.5 text-base font-extrabold text-teal-300">
                {acceptanceRate ? `${acceptanceRate}%` : 'Selective'}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs border border-white/10 hover:bg-white/15 transition">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">IELTS Min</p>
              <p className="mt-0.5 text-base font-extrabold text-white">
                {ieltsRequirement ? `${ieltsRequirement} Band` : 'Optional'}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-xs border border-white/10 hover:bg-white/15 transition">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Priority Deadline</p>
              <p className="mt-0.5 text-base font-extrabold text-white line-clamp-1">
                {applicationDeadline || 'Rolling'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 sm:px-6 md:px-8 overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'courses', label: 'Programs & Curricula', count: detailedCourses?.length, icon: BookOpen },
            { id: 'budget', label: 'Budget & Cost Breakdown', icon: DollarSign },
            { id: 'eligibility', label: 'Eligibility & Requirements', icon: CheckCircle2 },
            { id: 'scholarships', label: 'Scholarships & Aid', count: scholarships?.length, icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold whitespace-nowrap transition ${
                  isActive
                    ? 'border-brand text-brand bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-brand' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      isActive ? 'bg-brand/10 text-brand' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 md:p-8 space-y-6 no-scrollbar">
          {/* TAB 1: PROGRAMS & CURRICULA */}
          {activeTab === 'courses' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs sm:text-sm text-slate-600">
                  Select a faculty or program track to view available degrees and key focus areas.
                </p>
                <input
                  type="text"
                  placeholder="Search program tracks..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-brand focus:bg-white focus:outline-none w-full sm:w-56 shadow-2xs"
                />
              </div>

              {filteredCourses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs sm:text-sm text-slate-500">
                  No courses match "{courseSearch}".
                </div>
              ) : (
                <div className="grid gap-3.5 md:grid-cols-2">
                  {filteredCourses.map((c, i) => {
                    const isExpanded = expandedCourseId === (c.id || i);
                    return (
                      <div
                        key={c.id || i}
                        className={`rounded-2xl border p-4.5 transition bg-white shadow-2xs ${
                          isExpanded ? 'border-brand ring-1 ring-brand/30' : 'border-slate-200 hover:border-brand/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="rounded-lg bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">
                            {c.discipline || c.name}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                            <Clock className="h-3 w-3" />
                            {c.duration || 'Full-time'}
                          </span>
                        </div>

                        <h4 className="mt-2.5 text-base font-bold text-primary">{c.name}</h4>

                        {/* Available Degrees */}
                        {c.degrees && (
                          <div className="mt-3 space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Degree Tracks:
                            </p>
                            <div className="space-y-1">
                              {c.degrees.map((deg, di) => (
                                <div key={di} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                                  <GraduationCap className="h-3.5 w-3.5 text-accent shrink-0" />
                                  <span>{deg}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Skills / Modules preview */}
                        {c.skills && c.skills.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {c.skills.map((skill, si) => (
                              <span
                                key={si}
                                className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BUDGET & COSTS */}
          {activeTab === 'budget' && (
            <div className="space-y-6">
              {/* Cost of Attendance Visual Card */}
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 sm:p-6 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-primary">Estimated Annual Cost of Attendance</h3>
                    <p className="text-xs text-slate-500">Calculated for 1 standard academic year in {country}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Est. Budget</span>
                    <span className="text-2xl font-black text-brand">{currencyFormatter.format(totalEstimatedAnnualUsd)}</span>
                  </div>
                </div>

                {/* Visual Ratio Bar */}
                <div className="mt-5 space-y-2">
                  <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-100 flex shadow-inner">
                    <div
                      style={{ width: `${tuitionPercent}%` }}
                      className="bg-brand transition-all duration-500"
                      title={`Tuition: ${tuitionPercent}%`}
                    />
                    <div
                      style={{ width: `${livingPercent}%` }}
                      className="bg-accent transition-all duration-500"
                      title={`Living Costs: ${livingPercent}%`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                      Tuition: {currencyFormatter.format(tuitionAnnualUsd)} ({tuitionPercent}%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                      Est. Living & Housing: {currencyFormatter.format(livingCostAnnualUsd)} ({livingPercent}%)
                    </span>
                  </div>
                </div>

                {/* 3 Metrics */}
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Institutional Tuition</p>
                    <p className="mt-1 text-lg font-bold text-primary">
                      {tuitionAnnualUsd === 0 ? 'Funded' : currencyFormatter.format(tuitionAnnualUsd)}
                    </p>
                    <p className="text-[11px] text-slate-500">Per academic year</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Est. Monthly Living</p>
                    <p className="mt-1 text-lg font-bold text-accent">
                      {currencyFormatter.format(Math.round(livingCostAnnualUsd / 12))}/mo
                    </p>
                    <p className="text-[11px] text-slate-500">Rent, food & transport</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Application Fee</p>
                    <p className="mt-1 text-lg font-bold text-slate-800">
                      {applicationFee ? `$${applicationFee} USD` : 'No Fee / Waiver'}
                    </p>
                    <p className="text-[11px] text-slate-500">Non-refundable</p>
                  </div>
                </div>
              </div>

              {/* Financial Support Tips */}
              <div className="rounded-2xl border border-slate-200 p-5 bg-white space-y-3 shadow-2xs">
                <h4 className="text-sm font-bold text-primary flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  Financial Aid & Work-Study Options in {country}
                </h4>
                <div className="grid gap-2.5 sm:grid-cols-2 text-xs text-slate-600">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <strong className="block text-slate-900 mb-1">Campus Assistantships</strong>
                    Teaching (GTA) and Research (GRA) assistantships often provide partial or 100% tuition remission.
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <strong className="block text-slate-900 mb-1">Student Work Rights</strong>
                    International students are eligible to work up to 20 hours per week during term time.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ELIGIBILITY & ADMISSIONS */}
          {activeTab === 'eligibility' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs">
                <h3 className="text-base font-bold text-primary">Admissions & Eligibility Standards</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Standard criteria for international degree candidates applying to {name}.
                </p>

                <div className="mt-4 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                      <span className="text-xs font-bold text-primary">English Proficiency (IELTS)</span>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-800 border border-slate-200">
                      {ieltsRequirement ? `Minimum ${ieltsRequirement} Band overall` : 'Optional / Test Waivers'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                      <span className="text-xs font-bold text-primary">Graduate Record Exam (GRE)</span>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-800 border border-slate-200">
                      {greRequirement ? `Competitive target: ${greRequirement}+` : 'Not Required / Test-Optional'}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                      <span className="text-xs font-bold text-primary">Acceptance Selectivity</span>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-800 border border-slate-200">
                      {acceptanceRate ? `${acceptanceRate}% Acceptance Rate` : 'Holistic Evaluation'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dossier Checklist */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-3">
                <h4 className="text-sm font-bold text-primary">Required Application Dossier Checklist</h4>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs text-slate-700">
                    <strong className="block text-primary mb-1">1. Certified Academic Transcripts</strong>
                    Undergraduate / High School grade transcripts (GPA ~3.0+ equivalent).
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs text-slate-700">
                    <strong className="block text-primary mb-1">2. Language Proficiency Report</strong>
                    Official test results sent directly from IELTS/TOEFL testing bodies.
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs text-slate-700">
                    <strong className="block text-primary mb-1">3. Letters of Recommendation</strong>
                    2 to 3 references from academic advisors or research mentors.
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs text-slate-700">
                    <strong className="block text-primary mb-1">4. Statement of Purpose (SOP)</strong>
                    Academic mission statement and career aspirations (1–2 pages).
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SCHOLARSHIPS */}
          {activeTab === 'scholarships' && (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-slate-600">
                Government and international scholarship programs applicable for students studying in {country}.
              </p>

              {(!scholarships || scholarships.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs sm:text-sm text-slate-500 space-y-3">
                  <p>Explore international bilateral programs in the Scholarships section.</p>
                  {onScholarshipClick && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        onClose();
                        onScholarshipClick({ country });
                      }}
                      className="text-xs"
                    >
                      Browse {country} Scholarships
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-3.5 sm:grid-cols-2">
                  {scholarships.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs hover:border-brand/40 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="accent">{s.fundingLevel} Funding</Badge>
                          <span className="text-[11px] font-bold text-slate-400">{s.country}</span>
                        </div>
                        <h4 className="mt-2.5 text-base font-bold text-primary">{s.name}</h4>
                        <p className="mt-1.5 text-xs text-slate-600 line-clamp-2">
                          {s.eligibility || 'Full or partial grant towards tuition and living expenses.'}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Award Value</p>
                          <p className="text-sm font-extrabold text-brand">
                            {currencyFormatter.format(s.amountUsd || 0)}
                          </p>
                        </div>
                        {onScholarshipClick && (
                          <Button
                            variant="secondary"
                            onClick={() => {
                              onClose();
                              onScholarshipClick(s);
                            }}
                            className="text-xs py-1.5 px-3"
                          >
                            Explore Program
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/90 p-4 px-5 sm:px-6 md:px-8 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>Next Intake Deadline: <strong>{applicationDeadline || 'Rolling Admissions'}</strong></span>
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
                Official Admissions Site
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

export default UniversityDetailModal;
