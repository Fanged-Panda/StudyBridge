import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getBookmarks, removeBookmark } from '../../services/bookmarks';
import EditHigherStudyModal from './EditHigherStudyModal';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face';

const DEMO_USER = {
  name: 'Tahmid Hossain',
  tagline: 'Computer Science aspirant from Bangladesh — exploring top universities worldwide.',
  country: 'Bangladesh',
  institution: 'Chittagong University of Engineering and Technology',
  subject: 'B.Sc. in Computer Science and Engineering',
  preferredSubject: 'Computer Science',
  targetDegree: "Master's (MS/MSc)",
  targetIntake: 'Fall 2025',
  targetCountry: 'USA, Canada, Germany',
  fundingPreference: 'Fully Funded (Assistantship RA/TA)',
  cgpa: '3.5',
  satScore: '1350',
  ieltsScore: '7.0',
  greScore: '322',
  toeflScore: '102',
  duolingoScore: '100',
  graduationYear: 2027,
  researchInterests: 'Machine Learning, Computer Vision, Distributed Systems',
  publicationsCount: 0,
  workExperienceYears: 1.5,
  linkedinUrl: 'https://linkedin.com',
  githubUrl: 'https://github.com',
  researchGateUrl: 'https://researchgate.net',
  statementOfPurpose:
    'Dedicated Computer Science aspirant specializing in intelligent systems and machine learning. Focusing on graduate admissions for Fall 2025 with research assistantship opportunities.',
};

const formatNotifTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getNotifMeta = (type) => {
  switch (type) {
    case 'APPLICATION_DEADLINE':
      return { icon: 'event', iconColor: 'text-amber-600 bg-amber-50 border-amber-200', label: 'Deadline' };
    case 'RESULT_UPDATE':
      return { icon: 'auto_awesome', iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200', label: 'Result' };
    case 'REQUIREMENT_UPDATE':
      return { icon: 'info', iconColor: 'text-blue-600 bg-blue-50 border-blue-200', label: 'Requirement' };
    case 'ADMISSION_UPDATE':
    case 'GENERAL_UNIVERSITY_UPDATE':
    default:
      return { icon: 'school', iconColor: 'text-accent bg-accent/10 border-accent/20', label: 'Admission' };
  }
};

// Cached profile saved at login/registration, so the page isn't blank while /me loads
const getCachedUser = () => {
  try {
    const cached = localStorage.getItem('userProfile');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState(localStorage.getItem('userAvatar') || DEFAULT_AVATAR);
  const [user, setUser] = useState(getCachedUser());
  const [bookmarks, setBookmarks] = useState(getBookmarks());
  const [manageMode, setManageMode] = useState(false);
  const [editingScores, setEditingScores] = useState(false);
  const [scoreDraft, setScoreDraft] = useState({
    cgpa: '',
    satScore: '',
    ieltsScore: '',
    greScore: '',
    toeflScore: '',
    duolingoScore: '',
  });
  const [savingScores, setSavingScores] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const fileInputRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    if (!localStorage.getItem('token')) return;
    setNotifLoading(true);
    try {
      const res = await api.get('/notifications?limit=20');
      const list = res.data?.data || [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.isRead).length);
    } catch {
      // silently fail
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    window.addEventListener('notificationchange', loadNotifications);
    window.addEventListener('authchange', loadNotifications);
    return () => {
      window.removeEventListener('notificationchange', loadNotifications);
      window.removeEventListener('authchange', loadNotifications);
    };
  }, [loadNotifications]);

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      window.dispatchEvent(new Event('notificationchange'));
    } catch {
      // silently fail
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await api.patch(`/notifications/${notif.id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        window.dispatchEvent(new Event('notificationchange'));
      } catch {
        // ignore
      }
    }

    if (notif.university?.name) {
      navigate(`/universities?search=${encodeURIComponent(notif.university.name)}`);
    } else if (notif.metadata?.universityName) {
      navigate(`/universities?search=${encodeURIComponent(notif.metadata.universityName)}`);
    } else if (notif.metadata?.actionUrl) {
      navigate(notif.metadata.actionUrl);
    } else {
      navigate('/universities');
    }
  };

  useEffect(() => {
    const refresh = () => setBookmarks(getBookmarks());
    window.addEventListener('bookmarkschange', refresh);
    return () => window.removeEventListener('bookmarkschange', refresh);
  }, []);

  // Load the logged-in student's real data from backend
  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (!cancelled && data.user) {
          setUser(data.user);
          localStorage.setItem('userProfile', JSON.stringify(data.user));
        }
      } catch {
        // Keep cached/demo profile
      }
    };
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 400;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setAvatar(dataUrl);
        localStorage.setItem('userAvatar', dataUrl);
        window.dispatchEvent(new Event('profileupdate'));
      };
      img.onerror = () => {
        e.target.value = '';
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Real data wins; cached/demo values fill gaps
  const name = user?.name || DEMO_USER.name;
  const taglineParts = user
    ? [
        user.preferredSubject && `${user.preferredSubject} aspirant`,
        user.country && `from ${user.country}`,
        user.institution && `at ${user.institution}`,
      ].filter(Boolean)
    : [];
  const tagline = taglineParts.length
    ? `${taglineParts.join(' ')} — exploring top universities worldwide.`
    : DEMO_USER.tagline;

  const gpa = user ? (user.cgpa != null ? String(user.cgpa) : '—') : DEMO_USER.cgpa;
  const sat = user ? (user.satScore != null ? String(user.satScore) : '—') : DEMO_USER.sat;
  const ielts = user ? (user.ieltsScore != null ? String(user.ieltsScore) : '—') : DEMO_USER.ielts;
  const gre = user ? (user.greScore != null ? String(user.greScore) : '—') : DEMO_USER.greScore;
  const toefl = user?.toeflScore != null ? String(user.toeflScore) : (DEMO_USER.toeflScore != null ? String(DEMO_USER.toeflScore) : null);
  const duolingo = user?.duolingoScore != null ? String(user.duolingoScore) : (DEMO_USER.duolingoScore != null ? String(DEMO_USER.duolingoScore) : null);

  const targetDegree = user?.targetDegree || DEMO_USER.targetDegree;
  const targetIntake = user?.targetIntake || DEMO_USER.targetIntake;
  const targetCountry = user?.targetCountry || DEMO_USER.targetCountry;
  const fundingPreference = user?.fundingPreference || DEMO_USER.fundingPreference;
  const institution = user?.institution || DEMO_USER.institution;
  const subject = user?.subject || DEMO_USER.subject;
  const graduationYear = user?.graduationYear || DEMO_USER.graduationYear;
  const researchInterests = user?.researchInterests || DEMO_USER.researchInterests;
  const publicationsCount = user?.publicationsCount != null ? user.publicationsCount : DEMO_USER.publicationsCount;
  const workExperienceYears = user?.workExperienceYears != null ? user.workExperienceYears : DEMO_USER.workExperienceYears;
  const linkedinUrl = user?.linkedinUrl || DEMO_USER.linkedinUrl;
  const githubUrl = user?.githubUrl || DEMO_USER.githubUrl;
  const researchGateUrl = user?.researchGateUrl || DEMO_USER.researchGateUrl;
  const statementOfPurpose = user?.statementOfPurpose || DEMO_USER.statementOfPurpose;

  const startEditingScores = () => {
    setScoreDraft({
      cgpa: user?.cgpa != null ? String(user.cgpa) : (DEMO_USER.cgpa || ''),
      satScore: user?.satScore != null ? String(user.satScore) : (DEMO_USER.sat || ''),
      ieltsScore: user?.ieltsScore != null ? String(user.ieltsScore) : (DEMO_USER.ielts || ''),
      greScore: user?.greScore != null ? String(user.greScore) : (DEMO_USER.greScore || ''),
      toeflScore: user?.toeflScore != null ? String(user.toeflScore) : '',
      duolingoScore: user?.duolingoScore != null ? String(user.duolingoScore) : '',
    });
    setEditingScores(true);
  };

  const saveScores = async () => {
    setSavingScores(true);
    try {
      const { data } = await api.put('/auth/profile', {
        name: user?.name || DEMO_USER.name,
        country: user?.country || DEMO_USER.country,
        cgpa: scoreDraft.cgpa || null,
        satScore: scoreDraft.satScore || null,
        ieltsScore: scoreDraft.ieltsScore || null,
        greScore: scoreDraft.greScore || null,
        toeflScore: scoreDraft.toeflScore || null,
        duolingoScore: scoreDraft.duolingoScore || null,
        preferredSubject: user?.preferredSubject || null,
      });
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('userProfile', JSON.stringify(data.user));
      }
      if (data.token) localStorage.setItem('token', data.token);
      window.dispatchEvent(new Event('profileupdate'));
    } catch {
      // silently keep old values
    } finally {
      setSavingScores(false);
      setEditingScores(false);
    }
  };

  const handleSaveModalSuccess = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('userProfile', JSON.stringify(updatedUser));
    window.dispatchEvent(new Event('profileupdate'));
  };

  const parseResearchTags = (str) => {
    if (!str) return [];
    return str
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto px-4 sm:px-6">
      {/* Profile Header */}
      <section className="mb-14 text-center">
        <div className="relative mb-6 inline-block">
          <img
            className="h-36 w-36 sm:h-40 sm:w-40 rounded-full border-4 border-white object-cover shadow-xl"
            src={avatar}
            alt={`${name} portrait`}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border border-surface-variant bg-white text-on-surface shadow-lg transition-transform hover:scale-105"
            aria-label="Upload profile photo"
          >
            <span className="material-symbols-outlined text-[20px] text-deep-navy">
              photo_camera
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <h1 className="mb-3 font-['Plus_Jakarta_Sans'] text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-deep-navy">
          {name}
        </h1>

        <p className="mx-auto mb-8 max-w-2xl text-base sm:text-lg leading-relaxed text-on-surface-variant">
          {tagline}
        </p>

        {/* Scores & Metric Cards Strip */}
        <div className="border-y border-outline-variant/50 py-8">
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8">
            {[
              { key: 'cgpa', label: 'CGPA', value: gpa, color: 'accent', show: true },
              { key: 'greScore', label: 'GRE', value: gre, color: 'deep-navy', show: true },
              { key: 'ieltsScore', label: 'IELTS', value: ielts, color: 'deep-navy', show: user?.ieltsScore != null || (!user?.duolingoScore && !user?.toeflScore) || editingScores },
              { key: 'duolingoScore', label: 'DUOLINGO', value: duolingo || '—', color: 'accent', show: user?.duolingoScore != null || editingScores },
              { key: 'toeflScore', label: 'TOEFL', value: toefl || '—', color: 'deep-navy', show: user?.toeflScore != null || editingScores },
              { key: 'satScore', label: 'SAT', value: sat, color: 'deep-navy', show: user?.satScore != null || editingScores || DEMO_USER.sat },
            ]
              .filter((s) => s.show)
              .map((s) => (
              <div
                key={s.key}
                className={`group relative flex flex-col items-center rounded-2xl px-5 py-4 transition-all duration-300 ${
                  editingScores
                    ? 'bg-white shadow-[0_2px_16px_rgba(26,43,72,0.08)] scale-100'
                    : 'hover:bg-white hover:shadow-[0_2px_12px_rgba(26,43,72,0.06)]'
                }`}
              >
                {editingScores ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={scoreDraft[s.key]}
                      onChange={(e) => setScoreDraft((p) => ({ ...p, [s.key]: e.target.value }))}
                      className={`block w-20 text-center bg-transparent border-b-2 border-accent font-['Plus_Jakarta_Sans'] text-[26px] font-bold outline-none ${
                        s.key === 'cgpa' || s.key === 'duolingoScore' ? 'text-accent' : 'text-deep-navy'
                      }`}
                      placeholder="—"
                      inputMode={s.key === 'satScore' || s.key === 'greScore' || s.key === 'toeflScore' || s.key === 'duolingoScore' ? 'numeric' : 'decimal'}
                      autoFocus={s.key === 'cgpa'}
                    />
                    <div
                      className="absolute -bottom-0.5 left-1/2 h-0.5 w-0 bg-accent transition-all duration-300 group-hover:full -translate-x-1/2"
                      style={{ width: '100%' }}
                    />
                  </div>
                ) : (
                  <span
                    className={`block font-['Plus_Jakarta_Sans'] text-2xl sm:text-[28px] font-bold ${
                      s.key === 'cgpa' || s.key === 'duolingoScore' ? 'text-accent' : 'text-deep-navy'
                    }`}
                  >
                    {s.value}
                  </span>
                )}
                <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {editingScores ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={saveScores}
                  disabled={savingScores}
                  className="flex items-center gap-1.5 rounded-full bg-accent px-6 py-2 text-xs font-bold text-white shadow-md shadow-accent/20 transition-all hover:shadow-lg hover:shadow-accent/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {savingScores ? 'hourglass_top' : 'check'}
                  </span>
                  {savingScores ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingScores(false)}
                  className="rounded-full border border-outline bg-white px-5 py-2 text-xs font-bold text-on-surface transition-all hover:bg-surface-container-low hover:scale-[1.02] active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={startEditingScores}
                  className="group/btn flex items-center gap-2 rounded-full border border-outline/60 bg-white px-5 py-2 text-xs font-bold text-on-surface-variant transition-all hover:border-accent hover:text-accent hover:shadow-md hover:shadow-accent/10 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[15px] transition-transform group-hover/btn:rotate-[-12deg]">
                    edit
                  </span>
                  Edit Scores
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-xs font-bold text-white shadow-md shadow-accent/20 transition-all hover:bg-accent-teal hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[16px]">school</span>
                  Edit Higher Study Profile
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* HIGHER STUDY CREDENTIALS & AMBITIONS SECTION */}
      <section className="mb-20">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-accent text-[22px]">workspace_premium</span>
              <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-deep-navy">
                Higher Study & Academic Profile
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
              Comprehensive qualifications, target degree preferences, and research background.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-xs font-bold text-accent transition hover:bg-accent hover:text-white"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            Update Profile Info
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Study Goals */}
          <div className="rounded-2xl border border-outline-variant/50 bg-white p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <span className="material-symbols-outlined text-[18px]">explore</span>
                </span>
                <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-extrabold text-accent uppercase tracking-wider">
                  Goals
                </span>
              </div>
              <h3 className="font-bold text-base text-deep-navy mb-3">
                {targetDegree}
              </h3>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-on-surface-variant/70 block text-[11px]">Intended Major</span>
                  <span className="font-semibold text-deep-navy">
                    {user?.preferredSubject || DEMO_USER.preferredSubject || 'Computer Science'}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant/70 block text-[11px]">Target Intake</span>
                  <span className="font-semibold text-accent flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">event</span>
                    {targetIntake}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant/70 block text-[11px]">Target Destinations</span>
                  <span className="font-medium text-deep-navy">{targetCountry}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant/70 block text-[11px]">Funding Preference</span>
                  <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                    {fundingPreference}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Academic Background */}
          <div className="rounded-2xl border border-outline-variant/50 bg-white p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <span className="material-symbols-outlined text-[18px]">account_balance</span>
                </span>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">
                  Academic
                </span>
              </div>
              <h3 className="font-bold text-base text-deep-navy mb-3 leading-snug break-words" title={institution}>
                {institution}
              </h3>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-on-surface-variant/70 block text-[11px]">Completed / Current Degree</span>
                  <span className="font-semibold text-deep-navy break-words">
                    {subject}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant/70 block text-[11px]">Graduation Year</span>
                  <span className="font-semibold text-deep-navy">
                    {graduationYear ? `Class of ${graduationYear}` : 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant/70 block text-[11px]">Cumulative GPA</span>
                  <span className="font-bold text-accent">
                    {gpa !== '—' ? `${gpa} / 4.00 Scale` : 'Not recorded'}
                  </span>
                </div>
                {(user?.duolingoScore != null || user?.toeflScore != null || user?.ieltsScore != null || user?.greScore != null || user?.satScore != null) && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-on-surface-variant/70 block text-[11px] mb-1.5 font-medium">Standardized Tests & English</span>
                    <div className="flex flex-wrap gap-1.5">
                      {user?.duolingoScore != null && (
                        <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                          Duolingo {user.duolingoScore}
                        </span>
                      )}
                      {user?.toeflScore != null && (
                        <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                          TOEFL {user.toeflScore}
                        </span>
                      )}
                      {user?.ieltsScore != null && (
                        <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                          IELTS {user.ieltsScore}
                        </span>
                      )}
                      {user?.greScore != null && (
                        <span className="rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[11px] font-bold text-purple-700">
                          GRE {user.greScore}
                        </span>
                      )}
                      {user?.satScore != null && (
                        <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                          SAT {user.satScore}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Research & Work */}
          <div className="rounded-2xl border border-outline-variant/50 bg-white p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <span className="material-symbols-outlined text-[18px]">biotech</span>
                </span>
                <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-600 uppercase tracking-wider">
                  Research
                </span>
              </div>
              <h3 className="font-bold text-base text-deep-navy mb-3">
                {publicationsCount} Published Paper{publicationsCount === 1 ? '' : 's'}
              </h3>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-on-surface-variant/70 block text-[11px] mb-1">Research Specializations</span>
                  <div className="flex flex-wrap gap-1">
                    {parseResearchTags(researchInterests).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700"
                      >
                        {tag}
                      </span>
                    ))}
                    {parseResearchTags(researchInterests).length === 0 && (
                      <span className="text-slate-400 italic">No specializations added</span>
                    )}
                  </div>
                </div>
                <div className="pt-1">
                  <span className="text-on-surface-variant/70 block text-[11px]">Relevant Experience</span>
                  <span className="font-semibold text-deep-navy">
                    {workExperienceYears ? `${workExperienceYears} Years (Research & Industry)` : 'None added'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Portfolios & Statement */}
          <div className="rounded-2xl border border-outline-variant/50 bg-white p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <span className="material-symbols-outlined text-[18px]">share</span>
                </span>
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">
                  Portfolio
                </span>
              </div>
              <h3 className="font-bold text-base text-deep-navy mb-3">
                Profiles & Links
              </h3>
              <div className="space-y-2 text-xs">
                {linkedinUrl ? (
                  <a
                    href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 transition text-slate-700"
                  >
                    <span className="font-medium">LinkedIn</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                ) : (
                  <span className="text-slate-400 text-xs italic block">No LinkedIn linked</span>
                )}

                {githubUrl ? (
                  <a
                    href={githubUrl.startsWith('http') ? githubUrl : `https://${githubUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 transition text-slate-700"
                  >
                    <span className="font-medium">GitHub / Portfolio</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                ) : (
                  <span className="text-slate-400 text-xs italic block">No GitHub linked</span>
                )}

                {researchGateUrl ? (
                  <a
                    href={researchGateUrl.startsWith('http') ? researchGateUrl : `https://${researchGateUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 transition text-slate-700"
                  >
                    <span className="font-medium">Scholar / ResearchGate</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                ) : (
                  <span className="text-slate-400 text-xs italic block">No Scholar link</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statement of Purpose / Academic Pitch Quote Block */}
        {statementOfPurpose && (
          <div className="mt-5 rounded-2xl border border-outline-variant/40 bg-gradient-to-r from-surface-container-low via-white to-surface-container-low p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-accent text-[22px] mt-0.5 shrink-0">
                format_quote
              </span>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent mb-1">
                  Academic Vision & Statement of Purpose
                </h4>
                <p className="text-xs sm:text-sm leading-relaxed text-on-surface-variant italic">
                  "{statementOfPurpose}"
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Two Column Grid: University Pipeline & Notifications */}
      <div className="mb-24 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left: University Pipeline */}
        <div className="lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-['Plus_Jakarta_Sans'] text-[26px] sm:text-[28px] font-semibold text-deep-navy">
              University Pipeline
            </h3>
            {bookmarks.length > 0 && (
              <button
                type="button"
                onClick={() => setManageMode(!manageMode)}
                className="text-sm font-semibold text-accent transition hover:underline"
              >
                {manageMode ? 'Done' : 'Manage All'}
              </button>
            )}
          </div>

          <div className="space-y-4">
            {bookmarks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant/50 bg-white p-8 text-center">
                <span className="material-symbols-outlined mb-2 text-3xl text-on-surface-variant/40">
                  bookmark_border
                </span>
                <p className="text-sm text-on-surface-variant">
                  No saved universities yet. Tap “Save” on any university to add it here and follow its updates.
                </p>
                <Link
                  to="/universities"
                  className="mt-3 inline-block text-sm font-semibold text-accent hover:underline"
                >
                  Browse Universities
                </Link>
              </div>
            ) : (
              bookmarks.map((uni) => {
                const initials = uni.name
                  .split(' ')
                  .filter((w) => w.length > 2 || w === 'MIT')
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase();
                const Wrapper = manageMode ? 'div' : Link;
                const wrapperProps = manageMode
                  ? { key: uni.id }
                  : { key: uni.id, to: '/universities', state: { universityId: uni.id } };
                return (
                  <Wrapper
                    {...wrapperProps}
                    className="group flex items-center justify-between rounded-xl border border-outline-variant/50 bg-white p-6 transition-all hover:shadow-lg hover:shadow-on-surface/5"
                  >
                    <div className="flex items-center gap-6">
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-deep-navy font-bold text-white">
                        {initials}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-deep-navy">
                          {uni.name}
                        </h4>
                        <p className="text-sm text-on-surface-variant">
                          {[uni.ranking && `QS #${uni.ranking}`, uni.country].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                    </div>
                    {manageMode ? (
                      <button
                        type="button"
                        onClick={() => removeBookmark(uni.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-error transition hover:bg-error/10"
                        title="Remove from pipeline"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    ) : (
                      <span className="material-symbols-outlined text-on-surface-variant transition-colors group-hover:text-accent">
                        chevron_right
                      </span>
                    )}
                  </Wrapper>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Notifications */}
        <div className="lg:col-span-5">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-['Plus_Jakarta_Sans'] text-[28px] font-semibold text-deep-navy">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs font-bold text-accent hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="space-y-4">
            {notifLoading && notifications.length === 0 ? (
              <div className="rounded-xl border border-outline-variant/50 bg-white p-8 text-center text-xs text-on-surface-variant">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-outline-variant border-t-accent mb-2" />
                <p>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-xl border border-dashed border-outline-variant/50 bg-white p-8 text-center">
                <span className="material-symbols-outlined mb-2 text-3xl text-on-surface-variant/40">
                  notifications_off
                </span>
                <p className="text-sm font-semibold text-deep-navy">No notifications yet</p>
                <p className="mt-1 text-xs text-on-surface-variant max-w-xs mx-auto">
                  Save a university to your pipeline and you will get admission updates, deadline reminders and scholarship alerts here.
                </p>
                <Link
                  to="/universities"
                  className="mt-4 inline-block rounded-lg bg-accent/10 px-4 py-2 text-xs font-bold text-accent hover:bg-accent/20 transition"
                >
                  Explore Universities
                </Link>
              </div>
            ) : (
              notifications.map((notif) => {
                const meta = getNotifMeta(notif.type);
                const isUnread = !notif.isRead;
                const uniName = notif.university?.name || notif.metadata?.universityName;
                const timeStr = formatNotifTime(notif.createdAt);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`group relative flex items-start gap-4 rounded-xl border p-5 transition-all cursor-pointer ${
                      isUnread
                        ? 'border-accent/40 bg-accent/5 hover:bg-accent/10 shadow-xs'
                        : 'border-outline-variant/50 bg-white hover:border-outline-variant hover:shadow-md'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-xs ${meta.iconColor}`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{meta.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        {uniName ? (
                          <span className="text-xs font-bold uppercase tracking-wider text-accent truncate">
                            {uniName}
                          </span>
                        ) : (
                          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70">
                            {meta.label}
                          </span>
                        )}
                        <span className="text-[11px] font-medium text-on-surface-variant/60 shrink-0">
                          {timeStr}
                        </span>
                      </div>

                      <h4 className={`mt-1 text-sm text-deep-navy ${isUnread ? 'font-bold' : 'font-semibold'}`}>
                        {notif.title}
                      </h4>

                      <p className="mt-1 text-xs leading-relaxed text-on-surface-variant line-clamp-2">
                        {notif.message}
                      </p>
                    </div>

                    {isUnread && (
                      <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Edit Higher Study Profile Modal */}
      <EditHigherStudyModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user || DEMO_USER}
        onSaveSuccess={handleSaveModalSuccess}
      />
    </div>
  );
};

export default ProfilePage;
