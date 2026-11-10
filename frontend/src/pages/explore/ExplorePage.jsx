import { Link, useLocation } from 'react-router-dom';
import { Award, Building2, GraduationCap } from 'lucide-react';
import UniversityPage from '../universities/UniversityPage';
import ScholarshipPage from '../scholarships/ScholarshipPage';
import ProfessorPage from '../professors/ProfessorPage';

const TABS = [
  {
    to: '/universities',
    label: 'Universities',
    blurb: 'Compare institutions, tuition and programs',
    icon: Building2,
  },
  {
    to: '/scholarships',
    label: 'Scholarships',
    blurb: 'Find funded programs you can apply for',
    icon: Award,
  },
  {
    to: '/professors',
    label: 'Professors',
    blurb: 'Find supervisors and research fields',
    icon: GraduationCap,
  },
];

const ExplorePage = () => {
  const { pathname } = useLocation();
  const active = TABS.find((tab) => pathname.startsWith(tab.to)) || TABS[0];

  return (
    <div className="space-y-5">
      <nav aria-label="Explore sections" className="rounded-3xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <div className="grid grid-cols-3 gap-1.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.to === active.to;

            return (
              <Link
                key={tab.to}
                to={tab.to}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-center transition sm:flex-row sm:items-center sm:gap-2.5 sm:px-3.5 sm:text-left ${
                  isActive ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 sm:h-4 sm:w-4 ${isActive ? 'text-accent' : 'text-slate-400'}`} />
                <span className="min-w-0 sm:flex-1">
                  <span className="block truncate text-[10px] font-bold uppercase tracking-[0.06em] sm:text-xs sm:tracking-[0.14em]">
                    {tab.label}
                  </span>
                  <span
                    className={`hidden truncate text-[11px] sm:block ${
                      isActive ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {tab.blurb}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {active.to === '/universities' && <UniversityPage />}
      {active.to === '/scholarships' && <ScholarshipPage />}
      {active.to === '/professors' && <ProfessorPage />}
    </div>
  );
};

export default ExplorePage;
