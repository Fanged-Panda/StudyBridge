import { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import UniversityFilterBar from '../../features/universities/UniversityFilterBar';
import UniCard from '../../features/universities/UniCard';
import UniversityDetailModal from '../../features/universities/UniversityDetailModal';
import { Search, RotateCcw, X, Globe2, Building2, ShieldAlert, Edit3, CheckCircle2, AlertCircle, Bell, GraduationCap } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { initialUniversities } from '../../data/initialData';

const UniversityPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Start with instant initial data so page is never blank
  const [universities, setUniversities] = useState(initialUniversities);
  const [availableSubjects, setAvailableSubjects] = useState([
    'All',
    'AI',
    'Architecture',
    'Business',
    'Computer Science',
    'Data Science',
    'Economics',
    'Engineering',
    'Law',
    'Mathematics',
    'Medicine',
    'Physics',
    'Robotics',
  ]);

  // Admin state
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('userProfile') || '{}');
      return u.role === 'admin' || u.email === 'admin@studybridge.com';
    } catch {
      return false;
    }
  });
  const [editingUni, setEditingUni] = useState(null);
  const [savingUni, setSavingUni] = useState(false);
  const [uniFeedback, setUniFeedback] = useState(null);

  // Search state
  const initialSearch = searchParams.get('search') || '';
  const initialCountry = searchParams.get('country') || 'All';
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  // Applied Filter states (updated only when user clicks Apply Filters or Reset)
  const [appliedCountry, setAppliedCountry] = useState(initialCountry);
  const [appliedSubject, setAppliedSubject] = useState('All');
  const [appliedBudget, setAppliedBudget] = useState('All');
  const [appliedIelts, setAppliedIelts] = useState('All');
  const [appliedSort, setAppliedSort] = useState('ranking');

  // Detail Modal state
  const [activeModalUni, setActiveModalUni] = useState(null);

  // Sync search / country params if updated from URL
  useEffect(() => {
    const q = searchParams.get('search');
    const c = searchParams.get('country');
    if (q !== null && q !== undefined) {
      setSearchQuery(q);
    }
    if (c) {
      setAppliedCountry(c);
    }
  }, [searchParams]);

  useEffect(() => {
    const syncAdminRole = () => {
      try {
        const u = JSON.parse(localStorage.getItem('userProfile') || '{}');
        setIsAdmin(u.role === 'admin' || u.email === 'admin@studybridge.com');
      } catch {
        setIsAdmin(false);
      }
    };
    window.addEventListener('authchange', syncAdminRole);
    return () => window.removeEventListener('authchange', syncAdminRole);
  }, []);

  useEffect(() => {
    if (editingUni) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [editingUni]);

  // Auto-open university detail or apply search when navigated from homepage with state
  useEffect(() => {
    const targetId = location.state?.universityId;
    const targetSearch = location.state?.search;
    if (targetId) {
      const uni = universities.find((u) => u.id === targetId);
      if (uni) {
        setActiveModalUni(uni);
      }
    }
    if (targetSearch) {
      setSearchQuery(targetSearch);
    }
    if (targetId || targetSearch) {
      window.history.replaceState({}, '');
    }
  }, [location.state, universities]);

  // Followed universities state
  const [followedUniIds, setFollowedUniIds] = useState(new Set());
  const [onlyFollowed, setOnlyFollowed] = useState(false);

  // Load followed universities IDs from backend
  const loadFollowedIds = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setFollowedUniIds(new Set());
      return;
    }

    try {
      const res = await api.get('/universities/followed/ids');
      if (res.data?.success && Array.isArray(res.data.followedIds)) {
        setFollowedUniIds(new Set(res.data.followedIds));
      }
    } catch (err) {
      console.warn('Could not load followed universities IDs:', err?.message);
    }
  }, []);

  useEffect(() => {
    loadFollowedIds();

    const handleFollowChange = (e) => {
      const { universityId, isFollowing } = e.detail || {};
      if (universityId) {
        setFollowedUniIds((prev) => {
          const next = new Set(prev);
          if (isFollowing) {
            next.add(universityId);
          } else {
            next.delete(universityId);
          }
          return next;
        });
      }
    };

    window.addEventListener('followchange', handleFollowChange);
    window.addEventListener('authchange', loadFollowedIds);

    return () => {
      window.removeEventListener('followchange', handleFollowChange);
      window.removeEventListener('authchange', loadFollowedIds);
    };
  }, [loadFollowedIds]);

  // Load available subjects from backend in background
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get('/universities/subjects');
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 1) {
          setAvailableSubjects(res.data.data);
        }
      } catch (e) {
        // Keep initial subjects
      }
    };
    fetchSubjects();
  }, []);

  // Fetch universities with applied filters from backend
  const loadUniversities = useCallback(async () => {
    try {
      const params = {
        limit: 100,
        sort: appliedSort,
      };

      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (appliedCountry !== 'All') params.country = appliedCountry;
      if (appliedSubject !== 'All') params.subject = appliedSubject;
      if (appliedBudget !== 'All') params.budget = appliedBudget;
      if (appliedIelts !== 'All') params.maxIelts = Number(appliedIelts);

      const response = await api.get('/universities', { params });
      if (response.data?.data && response.data.data.length > 0) {
        setUniversities(response.data.data);
      }
    } catch (requestError) {
      console.warn('API fetch notice, using responsive dataset:', requestError?.message);
    }
  }, [searchQuery, appliedCountry, appliedSubject, appliedBudget, appliedIelts, appliedSort]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadUniversities();
    }, 150);

    return () => clearTimeout(debounceTimer);
  }, [loadUniversities]);

  // Client-side filtering
  const displayedUniversities = useMemo(() => {
    let list = universities.filter((u) => {
      if (onlyFollowed && u.id && !followedUniIds.has(u.id)) {
        return false;
      }

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        u.name?.toLowerCase().includes(query) ||
        u.country?.toLowerCase().includes(query) ||
        u.city?.toLowerCase().includes(query) ||
        (Array.isArray(u.courses) && u.courses.some((c) => (typeof c === 'string' ? c : c?.name || '').toLowerCase().includes(query)));

      const matchesCountry = appliedCountry === 'All' || u.country?.toLowerCase() === appliedCountry.toLowerCase();

      const matchesSubject =
        appliedSubject === 'All' ||
        (Array.isArray(u.courses) && u.courses.some((c) => (typeof c === 'string' ? c : c?.name || '').toLowerCase().includes(appliedSubject.toLowerCase())));

      let matchesBudget = true;
      const tuition = u.tuitionAnnualUsd || 0;
      if (appliedBudget === 'Low') matchesBudget = tuition < 15000;
      else if (appliedBudget === 'Mid') matchesBudget = tuition >= 15000 && tuition < 30000;
      else if (appliedBudget === 'High') matchesBudget = tuition >= 30000;

      let matchesIelts = true;
      if (appliedIelts !== 'All') {
        matchesIelts = !u.ieltsRequirement || u.ieltsRequirement <= Number(appliedIelts);
      }

      return matchesSearch && matchesCountry && matchesSubject && matchesBudget && matchesIelts;
    });

    // Client sort
    if (appliedSort === 'ranking') {
      list = [...list].sort((a, b) => (a.ranking || 999) - (b.ranking || 999));
    } else if (appliedSort === 'tuition-asc') {
      list = [...list].sort((a, b) => (a.tuitionAnnualUsd || 0) - (b.tuitionAnnualUsd || 0));
    } else if (appliedSort === 'tuition-desc') {
      list = [...list].sort((a, b) => (b.tuitionAnnualUsd || 0) - (a.tuitionAnnualUsd || 0));
    } else if (appliedSort === 'acceptance-desc') {
      list = [...list].sort((a, b) => (b.acceptanceRate || 0) - (a.acceptanceRate || 0));
    } else if (appliedSort === 'name-asc') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [universities, searchQuery, appliedCountry, appliedSubject, appliedBudget, appliedIelts, appliedSort, onlyFollowed, followedUniIds]);

  // Extract unique countries
  const countries = useMemo(() => {
    const all = universities.map((u) => u.country).filter(Boolean);
    return [...new Set(all)].sort();
  }, [universities]);

  const handleApplyFilters = ({ country, subject, budget, ielts, sort }) => {
    setAppliedCountry(country);
    setAppliedSubject(subject);
    setAppliedBudget(budget);
    setAppliedIelts(ielts);
    setAppliedSort(sort);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setAppliedCountry('All');
    setAppliedSubject('All');
    setAppliedBudget('All');
    setAppliedIelts('All');
    setAppliedSort('ranking');
  };

  const handleOpenDetails = async (uni) => {
    setActiveModalUni(uni);
    try {
      if (uni.id && !uni.id.startsWith('uni-')) {
        const res = await api.get(`/universities/${uni.id}`);
        if (res.data?.success) {
          setActiveModalUni(res.data.data);
        }
      }
    } catch (e) {
      // Keep rich modal data
    }
  };

  const handleSaveAdminUni = async (e) => {
    e.preventDefault();
    if (!editingUni) return;

    setSavingUni(true);
    setUniFeedback(null);

    try {
      const res = await api.put(`/admin/universities/${editingUni.id}`, {
        tuitionAnnualUsd: editingUni.tuitionAnnualUsd,
        applicationDeadline: editingUni.applicationDeadline,
        acceptanceRate: editingUni.acceptanceRate,
        ieltsRequirement: editingUni.ieltsRequirement,
        greRequirement: editingUni.greRequirement,
        applicationFee: editingUni.applicationFee,
        websiteUrl: editingUni.websiteUrl,
        notifyFollowers: editingUni.notifyFollowers ?? true,
        customNotificationTitle: editingUni.customNotificationTitle,
        customNotificationMessage: editingUni.customNotificationMessage,
      });

      if (res.data?.success) {
        setUniFeedback({
          type: 'success',
          message: res.data.message,
        });

        // Update local list
        setUniversities((prev) =>
          prev.map((u) => (u.id === editingUni.id ? { ...u, ...res.data.data } : u))
        );

        setTimeout(() => {
          setEditingUni(null);
          setUniFeedback(null);
        }, 1400);
      }
    } catch (err) {
      setUniFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update university.',
      });
    } finally {
      setSavingUni(false);
    }
  };

  const hasActiveFilters =
    appliedCountry !== 'All' ||
    appliedSubject !== 'All' ||
    appliedBudget !== 'All' ||
    appliedIelts !== 'All' ||
    appliedSort !== 'ranking' ||
    searchQuery;

  return (
    <section className="space-y-6 animate-fade-in">
      {/* Admin Quick Action Banner */}
      {isAdmin && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white font-bold shadow-xs">
              <ShieldAlert className="h-4 w-4 text-accent" />
            </span>
            <div>
              <strong className="font-extrabold text-primary text-sm">Administrator Controls Active:</strong>
              <p className="text-slate-600">You can click "Edit & Notify" on any university below to update deadlines/tuition and broadcast alerts to followers.</p>
            </div>
          </div>
          <Button
            to="/admin"
            variant="primary"
            className="text-xs py-2 px-4 inline-flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            Open Admin Portal &rarr;
          </Button>
        </div>
      )}

      {/* Top Banner with Search Bar */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full bg-slate-100 p-1">
            <span className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-primary shadow-sm">Universities</span>
            <Link
              to="/professors"
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-slate-600 transition hover:text-primary"
            >
              <GraduationCap size={13} /> Professors
            </Link>
          </div>

          <Link
            to="/professors"
            className="text-xs font-semibold text-brand hover:underline"
          >
            Looking for a supervisor? Browse the faculty directory →
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.24em] text-brand">
                StudyBridge
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                <Globe2 className="h-3 w-3" /> Global Directory
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
              Universities
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Browse world-class universities across 15+ countries, compare annual tuition & estimated living budgets, explore detailed degree curricula, and discover tailored scholarships.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-2xl px-3.5 py-2">
            <Building2 className="h-4 w-4 text-brand" />
            <span>{displayedUniversities.length} Institutions Found</span>
          </div>
        </div>

        {/* Real-time Search Box */}
        <div className="mt-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search universities by name, city, country, or study program..."
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
      <UniversityFilterBar
        countries={countries}
        subjects={availableSubjects}
        appliedCountry={appliedCountry}
        appliedSubject={appliedSubject}
        appliedBudget={appliedBudget}
        appliedIelts={appliedIelts}
        appliedSort={appliedSort}
        onApplyFilters={handleApplyFilters}
        onResetFilters={handleResetFilters}
      />

      {/* Results Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold text-slate-500">
            Showing <strong className="text-slate-900 font-bold">{displayedUniversities.length}</strong> universities matching criteria
          </p>

          {followedUniIds.size > 0 && (
            <button
              type="button"
              onClick={() => setOnlyFollowed(!onlyFollowed)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                onlyFollowed
                  ? 'bg-accent text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{onlyFollowed ? '✓ Showing Followed' : 'Show Followed'}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${onlyFollowed ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {followedUniIds.size}
              </span>
            </button>
          )}
        </div>

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

      {/* Expansive University Cards Grid */}
      {displayedUniversities.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 shadow-sm space-y-4">
          <p className="text-base font-semibold text-slate-700">No universities match your selected criteria.</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {onlyFollowed
              ? "You haven't followed any universities yet. Browse and follow universities to receive updates!"
              : 'Try adjusting your budget filter, changing the major/country, or clicking Reset Filters.'}
          </p>
          <Button variant="outline" onClick={handleResetFilters}>
            {onlyFollowed ? 'Show All Universities' : 'Reset All Filters'}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedUniversities.map((university) => (
            <UniCard
              key={university.id || university.name}
              university={university}
              onSelect={handleOpenDetails}
              onEditClick={(uni) => {
                setEditingUni({
                  ...uni,
                  notifyFollowers: true,
                  customNotificationTitle: '',
                  customNotificationMessage: '',
                });
                setUniFeedback(null);
              }}
              onScholarshipClick={(uni) => {
                navigate(`/scholarships?search=${encodeURIComponent(uni.country)}`);
              }}
            />
          ))}
        </div>
      )}

      {/* Refined University Detail Modal */}
      {activeModalUni && (
        <UniversityDetailModal
          university={activeModalUni}
          onClose={() => setActiveModalUni(null)}
          onEditClick={(uni) => {
            setActiveModalUni(null);
            setEditingUni({
              ...uni,
              notifyFollowers: true,
              customNotificationTitle: '',
              customNotificationMessage: '',
            });
            setUniFeedback(null);
          }}
          onScholarshipClick={(scholarship) => {
            navigate(`/scholarships?search=${encodeURIComponent(scholarship.name || scholarship.country)}`);
          }}
        />
      )}

      {/* Admin University Edit & Notification Modal (PORTAL TO DOCUMENT.BODY) */}
      {editingUni &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 99999,
              margin: 0,
            }}
          >
            <div
              className="fixed inset-0"
              onClick={() => setEditingUni(null)}
              aria-hidden="true"
            />
            <Card className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 bg-white border border-slate-200 rounded-3xl shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-accent">
                    Administrator Edit
                  </span>
                  <h2 className="text-xl font-extrabold text-primary">{editingUni.name}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUni(null)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {uniFeedback && (
                <div
                  className={`rounded-2xl p-4 text-xs font-semibold flex items-center gap-2.5 ${
                    uniFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {uniFeedback.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <span>{uniFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handleSaveAdminUni} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Application Deadline
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 15 Jan, 2027"
                      value={editingUni.applicationDeadline || ''}
                      onChange={(e) =>
                        setEditingUni({ ...editingUni, applicationDeadline: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-primary focus:border-brand focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Annual Tuition ($ USD)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 54000"
                      value={editingUni.tuitionAnnualUsd ?? ''}
                      onChange={(e) =>
                        setEditingUni({
                          ...editingUni,
                          tuitionAnnualUsd: e.target.value ? Number(e.target.value) : '',
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-primary focus:border-brand focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Acceptance Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 4.5"
                      value={editingUni.acceptanceRate ?? ''}
                      onChange={(e) =>
                        setEditingUni({
                          ...editingUni,
                          acceptanceRate: e.target.value ? Number(e.target.value) : '',
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-primary focus:border-brand focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      IELTS Requirement
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="e.g. 7.0"
                      value={editingUni.ieltsRequirement ?? ''}
                      onChange={(e) =>
                        setEditingUni({
                          ...editingUni,
                          ieltsRequirement: e.target.value ? Number(e.target.value) : '',
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-primary focus:border-brand focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      GRE Requirement
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 320"
                      value={editingUni.greRequirement ?? ''}
                      onChange={(e) =>
                        setEditingUni({
                          ...editingUni,
                          greRequirement: e.target.value ? Number(e.target.value) : '',
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-primary focus:border-brand focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Application Fee ($ USD)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 85"
                      value={editingUni.applicationFee ?? ''}
                      onChange={(e) =>
                        setEditingUni({
                          ...editingUni,
                          applicationFee: e.target.value ? Number(e.target.value) : '',
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-primary focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                {/* Notification Dispatch Option */}
                <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-accent" />
                      <span className="text-xs font-extrabold text-primary">
                        Notify Followed Students
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={editingUni.notifyFollowers ?? true}
                      onChange={(e) =>
                        setEditingUni({ ...editingUni, notifyFollowers: e.target.checked })
                      }
                      className="h-4 w-4 rounded text-accent focus:ring-accent"
                    />
                  </div>
                  <p className="text-[11px] text-slate-600">
                    When enabled, all students who follow {editingUni.name} will automatically receive an admission update notification in their top navigation bell.
                  </p>

                  {(editingUni.notifyFollowers ?? true) && (
                    <div className="pt-2 border-t border-accent/10 space-y-2">
                      <input
                        type="text"
                        placeholder="Custom Notification Title (Optional)"
                        value={editingUni.customNotificationTitle || ''}
                        onChange={(e) =>
                          setEditingUni({
                            ...editingUni,
                            customNotificationTitle: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Custom Message (Optional: defaults to summary of modified fields)"
                        value={editingUni.customNotificationMessage || ''}
                        onChange={(e) =>
                          setEditingUni({
                            ...editingUni,
                            customNotificationMessage: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button variant="outline" onClick={() => setEditingUni(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={savingUni}>
                    {savingUni ? 'Saving Changes...' : 'Save & Broadcast to Followers'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>,
          document.body
        )}
    </section>
  );
};

export default UniversityPage;
