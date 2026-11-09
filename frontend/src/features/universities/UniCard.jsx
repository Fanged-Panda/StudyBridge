import { useState, useEffect } from 'react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { BookOpen, Bookmark, BookmarkCheck, ArrowRight, BadgeCheck, Edit3 } from 'lucide-react';
import { isBookmarked, toggleBookmark } from '../../services/bookmarks';
import api from '../../services/api';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const UniCard = (props) => {
  const {
    university,
    name: propName,
    country: propCountry,
    city: propCity,
    ranking: propRanking,
    tuition: propTuition,
    onSelect,
    onScholarshipClick,
    onEditClick,
  } = props;

  const [isSaved, setIsSaved] = useState(() => (university?.id ? isBookmarked(university.id) : false));
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('userProfile') || '{}');
      return u.role === 'admin' || u.email === 'admin@studybridge.com';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const syncAdmin = () => {
      try {
        const u = JSON.parse(localStorage.getItem('userProfile') || '{}');
        setIsAdmin(u.role === 'admin' || u.email === 'admin@studybridge.com');
      } catch {
        setIsAdmin(false);
      }
    };
    window.addEventListener('authchange', syncAdmin);
    return () => window.removeEventListener('authchange', syncAdmin);
  }, []);

  useEffect(() => {
    const uniId = university?.id;
    if (!uniId) return;
    const check = () => setIsSaved(isBookmarked(uniId));
    window.addEventListener('bookmarkschange', check);
    return () => window.removeEventListener('bookmarkschange', check);
  }, [university?.id]);

  // Normalize data whether passed as an object or individual props
  const uni = university || {
    name: propName,
    country: propCountry,
    city: propCity,
    ranking: propRanking,
    tuitionAnnualUsd: typeof propTuition === 'number' ? propTuition : (typeof propTuition === 'string' && propTuition.includes('$') ? parseInt(propTuition.replace(/\D/g, ''), 10) * 1000 : undefined),
    acceptanceRate: props.acceptanceRate,
    ieltsRequirement: props.ieltsRequirement,
    greRequirement: props.greRequirement,
    detailedCourses: props.detailedCourses || [],
    courses: props.courses || [],
  };

  const {
    id,
    name = propName,
    country = propCountry,
    city = propCity,
    ranking = propRanking,
    tuitionAnnualUsd,
    acceptanceRate,
    ieltsRequirement,
    greRequirement,
    detailedCourses = [],
    courses = [],
  } = uni;

  // One button, two jobs: it saves the university to the student's profile and,
  // when signed in, follows it so admission updates arrive as notifications.
  const handleBookmark = async (e) => {
    e.stopPropagation();

    const nowSaved = toggleBookmark(uni);

    const token = localStorage.getItem('token');
    if (!token || !id) return;

    setSavingBookmark(true);
    try {
      if (nowSaved) {
        await api.post(`/universities/${id}/follow`);
      } else {
        await api.delete(`/universities/${id}/follow`);
      }

      window.dispatchEvent(
        new CustomEvent('followchange', {
          detail: { universityId: id, isFollowing: nowSaved },
        })
      );
      window.dispatchEvent(new Event('notificationchange'));
    } catch (err) {
      console.error('Could not sync the follow with the server:', err);
    } finally {
      setSavingBookmark(false);
    }
  };

  const rawCourses = detailedCourses.length > 0 
    ? detailedCourses.map(c => c.name || c.discipline) 
    : (Array.isArray(courses) ? courses : []);

  const displayedCourses = rawCourses.slice(0, 3);
  const remainingCount = rawCourses.length - 3;

  const formattedTuition =
    tuitionAnnualUsd === 0
      ? 'Free / Funded'
      : tuitionAnnualUsd
      ? currencyFormatter.format(tuitionAnnualUsd)
      : propTuition || 'Contact Admissions';

  return (
    <Card className="group relative flex flex-col justify-between p-6 transition duration-200 hover:shadow-lg hover:border-brand/40 border border-slate-200 bg-white rounded-3xl">
      <div>
        {/* Header Strip */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand">{country}</Badge>
            {city && (
              <span className="text-xs font-medium text-slate-500">
                {city}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleBookmark}
            disabled={savingBookmark}
            aria-pressed={isSaved}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 ${
              isSaved
                ? 'border-brand bg-brand text-white hover:bg-primary'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-accent hover:bg-accent/5 hover:text-accent'
            }`}
            title={
              isSaved
                ? 'Saved to your profile. Click to remove and stop updates.'
                : 'Save to your profile and get notifications about admission changes'
            }
          >
            {isSaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        {/* Title */}
        <button
          type="button"
          onClick={() => onSelect?.(uni)}
          className="mt-3 text-left group-hover:text-brand transition"
        >
          <h3 className="text-xl font-extrabold tracking-tight text-primary line-clamp-1">
            {name}
          </h3>
        </button>

        {/* Key Metrics */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
          <span className="font-semibold text-slate-900">
            QS #{ranking}
          </span>
          <span>•</span>
          <span>
            Tuition: <strong className="text-primary font-bold">{formattedTuition}</strong>
          </span>
          <span>•</span>
          <span>
            Acceptance: <strong className="text-slate-900 font-medium">{acceptanceRate ? `${acceptanceRate}%` : 'Selective'}</strong>
          </span>
        </div>

        {/* Eligibility requirements row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {ieltsRequirement && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
              IELTS {ieltsRequirement}+
            </span>
          )}
          {greRequirement && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
              GRE {greRequirement}+
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            <BadgeCheck className="h-3 w-3" /> Live Verified
          </span>
        </div>

        {/* Courses Preview */}
        {displayedCourses.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
              <BookOpen className="h-3.5 w-3.5 text-slate-400" />
              <span>Available Programs:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {displayedCourses.map((c, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-700"
                >
                  {typeof c === 'string' ? c : c?.name}
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="rounded-full bg-brand/5 px-2 py-0.5 text-[11px] font-semibold text-brand">
                  +{remainingCount} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => onScholarshipClick?.(uni)}
          className="text-xs py-2 px-3.5"
        >
          Scholarships
        </Button>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick?.(uni);
              }}
              className="text-xs py-2 px-3 inline-flex items-center gap-1 border-primary/30 text-primary hover:bg-primary hover:text-white font-bold transition shadow-xs"
            >
              <Edit3 className="h-3.5 w-3.5 text-accent" />
              <span>Edit & Notify</span>
            </Button>
          )}

          <Button
            variant="primary"
            onClick={() => onSelect?.(uni)}
            className="text-xs py-2 px-4 inline-flex items-center gap-1.5"
          >
            View Full Details
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default UniCard;