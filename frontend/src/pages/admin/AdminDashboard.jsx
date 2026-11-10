import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Building2,
  Bell,
  GraduationCap,
  Users,
  Send,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Search,
  Megaphone,
  DollarSign,
  Calendar,
  X,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import AdminJourneyPanel from '../../features/community/AdminJourneyPanel';
import { clearCache, getCache, setCache } from '../../services/pageCache';

const HACKER_AVATAR =
  'https://api.dicebear.com/9.x/bottts/svg?seed=CyberHacker&backgroundColor=041d1a';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('universities'); // 'universities' | 'announcements' | 'scholarships'
  const cachedStats = getCache('admin:stats');
  const [stats, setStats] = useState(() =>
    cachedStats || {
      universityCount: 0,
      scholarshipCount: 0,
      studentCount: 0,
      totalFollows: 0,
      totalNotificationsSent: 0,
    }
  );
  const [statsLoading, setStatsLoading] = useState(!cachedStats);

  // Universities list & editing
  const cachedUniversities = getCache('admin:universities');
  const [universities, setUniversities] = useState(cachedUniversities || []);
  const [uniSearch, setUniSearch] = useState('');
  const [uniLoading, setUniLoading] = useState(!cachedUniversities);
  const [selectedUni, setSelectedUni] = useState(null);
  const [editingUni, setEditingUni] = useState(null);
  const [savingUni, setSavingUni] = useState(false);
  const [uniFeedback, setUniFeedback] = useState(null);

  // Announcement state
  const [targetUniId, setTargetUniId] = useState('');
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceMessage, setAnnounceMessage] = useState('');
  const [announceType, setAnnounceType] = useState('ADMISSION_UPDATE');
  const [broadcasting, setBroadcasting] = useState(false);
  const [announceFeedback, setAnnounceFeedback] = useState(null);

  // Scholarships list & editing
  const [scholarships, setScholarships] = useState(() => getCache('admin:scholarships') || []);
  const [schSearch, setSchSearch] = useState('');
  const [editingSch, setEditingSch] = useState(null);
  const [savingSch, setSavingSch] = useState(false);

  // Load Admin Stats
  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/stats');
      if (res.data?.success) {
        setStats(res.data.data);
        setCache('admin:stats', res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load admin stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load Universities
  const loadUniversities = useCallback(async () => {
    try {
      const res = await api.get('/universities', { params: { limit: 100 } });
      if (res.data?.data) {
        setUniversities(res.data.data);
        setCache('admin:universities', res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load universities in admin:', err);
    } finally {
      setUniLoading(false);
    }
  }, []);

  // Load Scholarships
  const loadScholarships = useCallback(async () => {
    try {
      const res = await api.get('/scholarships', { params: { limit: 100 } });
      if (res.data?.data) {
        setScholarships(res.data.data);
        setCache('admin:scholarships', res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load scholarships in admin:', err);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadUniversities();
    loadScholarships();
  }, [loadStats, loadUniversities, loadScholarships]);

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

  // Handle Edit University
  const handleSaveUniversity = async (e) => {
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

        // Update local state
        setUniversities((prev) =>
          prev.map((u) => (u.id === editingUni.id ? { ...u, ...res.data.data } : u))
        );
        // Public directory caches hold the old tuition/deadline values.
        clearCache('uni:list:');

        loadStats();
        setTimeout(() => {
          setEditingUni(null);
          setUniFeedback(null);
        }, 1500);
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

  // Handle Broadcast Announcement
  const handleBroadcastAnnouncement = async (e) => {
    e.preventDefault();
    if (!targetUniId || !announceTitle.trim() || !announceMessage.trim()) {
      setAnnounceFeedback({
        type: 'error',
        message: 'Please select a university and fill in title and message.',
      });
      return;
    }

    setBroadcasting(true);
    setAnnounceFeedback(null);

    try {
      const res = await api.post(`/admin/universities/${targetUniId}/announcement`, {
        title: announceTitle.trim(),
        message: announceMessage.trim(),
        type: announceType,
      });

      if (res.data?.success) {
        setAnnounceFeedback({
          type: 'success',
          message: res.data.message,
        });
        setAnnounceTitle('');
        setAnnounceMessage('');
        loadStats();
      }
    } catch (err) {
      setAnnounceFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to broadcast announcement.',
      });
    } finally {
      setBroadcasting(false);
    }
  };

  // Filtered universities
  const filteredUniversities = universities.filter((u) => {
    const q = uniSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      u.name?.toLowerCase().includes(q) ||
      u.country?.toLowerCase().includes(q) ||
      u.city?.toLowerCase().includes(q)
    );
  });

  // Filtered scholarships
  const filteredScholarships = scholarships.filter((s) => {
    const q = schSearch.toLowerCase().trim();
    if (!q) return true;
    return s.name?.toLowerCase().includes(q) || s.country?.toLowerCase().includes(q);
  });

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary border border-primary/20">
                <ShieldAlert className="h-3.5 w-3.5" />
                Administrator Portal
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                <Megaphone className="h-3 w-3" /> Live Follower Broadcaster
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
              Admin & Notification Control
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Manage university admissions criteria, update scholarship details, and broadcast targeted notifications directly to student followers in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/90 p-2.5 pr-4 shadow-2xs">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-xs">
                <img
                  src={HACKER_AVATAR}
                  alt="Administrator Profile"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5 text-xs font-black text-primary">
                  <span>Root Admin</span>
                  <span className="rounded-md bg-emerald-100 px-1.5 py-0.2 text-[9px] font-black uppercase text-emerald-800">
                    Active
                  </span>
                </div>
                <div className="font-mono text-[11px] text-slate-500">admin@studybridge.com</div>
              </div>
            </div>

            <Link
              to="/universities"
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:border-primary hover:text-primary transition"
            >
              Public Catalog
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-center">
            <div className="text-2xl font-black text-primary">
              {statsLoading ? '—' : stats.universityCount}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
              Universities
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-center">
            <div className="text-2xl font-black text-primary">
              {statsLoading ? '—' : stats.scholarshipCount}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
              Scholarships
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-center">
            <div className="text-2xl font-black text-primary">
              {statsLoading ? '—' : stats.studentCount}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
              Students
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-center">
            <div className="text-2xl font-black text-accent">
              {statsLoading ? '—' : stats.totalFollows}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
              Active Follows
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-center">
            <div className="text-2xl font-black text-emerald-600">
              {statsLoading ? '—' : stats.totalNotificationsSent}
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
              Notifs Sent
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 overflow-x-auto border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('universities')}
          className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === 'universities'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-primary'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Universities & Follower Alerts</span>
          <Badge variant="outline">{universities.length}</Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === 'announcements'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-primary'
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>Broadcast Announcement</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scholarships')}
          className={`inline-flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === 'scholarships'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-primary'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Scholarships</span>
          <Badge variant="outline">{scholarships.length}</Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('community')}
          className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === 'community'
              ? 'border-brand text-brand'
              : 'border-transparent text-slate-500 hover:text-primary'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Community Journeys</span>
        </button>
      </div>

      {/* TAB 4: COMMUNITY MODERATION */}
      {activeTab === 'community' && <AdminJourneyPanel />}

      {/* TAB 1: UNIVERSITIES MANAGER */}
      {activeTab === 'universities' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search university to modify details or notify followers..."
                value={uniSearch}
                onChange={(e) => setUniSearch(e.target.value)}
                className="w-full rounded-full border border-slate-300 bg-white pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-brand focus:outline-none shadow-xs"
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredUniversities.length} institutions
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredUniversities.map((uni) => (
              <Card
                key={uni.id}
                className="p-5 border border-slate-200 bg-white rounded-3xl flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="brand">{uni.country}</Badge>
                    <span className="text-xs font-bold text-slate-600">QS #{uni.ranking}</span>
                  </div>

                  <h3 className="mt-2 text-base font-extrabold text-primary line-clamp-1">
                    {uni.name}
                  </h3>
                  {uni.city && <p className="text-xs text-slate-500">{uni.city}</p>}

                  <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tuition:</span>
                      <strong className="text-primary font-bold">
                        {uni.tuitionAnnualUsd ? `$${uni.tuitionAnnualUsd.toLocaleString()}/yr` : '—'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Deadline:</span>
                      <strong className="text-emerald-700 font-semibold">
                        {uni.applicationDeadline || 'Rolling Admissions'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Acceptance:</span>
                      <span>{uni.acceptanceRate ? `${uni.acceptanceRate}%` : 'Selective'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">IELTS Req:</span>
                      <span>{uni.ieltsRequirement ? `${uni.ieltsRequirement}+` : 'Optional'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetUniId(uni.id);
                      setAnnounceTitle(`Admission Update: ${uni.name}`);
                      setActiveTab('announcements');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                  >
                    <Send className="h-3 w-3" />
                    Quick Alert
                  </button>

                  <Button
                    variant="primary"
                    onClick={() => {
                      setEditingUni({
                        ...uni,
                        notifyFollowers: true,
                        customNotificationTitle: '',
                        customNotificationMessage: '',
                      });
                      setUniFeedback(null);
                    }}
                    className="text-xs py-1.5 px-3.5 inline-flex items-center gap-1"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit & Notify
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BROADCAST ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <Card className="p-6 md:p-8 border border-slate-200 bg-white rounded-3xl max-w-2xl mx-auto shadow-sm space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-accent text-2xl">campaign</span>
              <h2 className="text-2xl font-extrabold text-primary">Broadcast Admission Announcement</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Publish critical admission dates, scholarship updates, or policy changes. The system delivers notifications strictly to students who follow this university.
            </p>
          </div>

          {announceFeedback && (
            <div
              className={`rounded-2xl p-4 text-xs font-semibold flex items-center gap-2.5 ${
                announceFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {announceFeedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              )}
              <span>{announceFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleBroadcastAnnouncement} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Target University
              </label>
              <select
                value={targetUniId}
                onChange={(e) => setTargetUniId(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-primary focus:border-brand focus:outline-none"
              >
                <option value="">-- Choose a university to notify its followers --</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.country})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Announcement Type
              </label>
              <select
                value={announceType}
                onChange={(e) => setAnnounceType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-primary focus:border-brand focus:outline-none"
              >
                <option value="ADMISSION_UPDATE">Admission Update</option>
                <option value="DEADLINE_ALERT">Deadline Alert</option>
                <option value="SCHOLARSHIP_ALERT">Scholarship Alert</option>
                <option value="REQUIREMENTS_CHANGE">Requirements Change</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Notification Title
              </label>
              <input
                type="text"
                placeholder="e.g. Fall 2026 Regular Decision Deadline Extended to Dec 15"
                value={announceTitle}
                onChange={(e) => setAnnounceTitle(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-primary focus:border-brand focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Notification Details / Message
              </label>
              <textarea
                rows={4}
                placeholder="Describe the update in detail for students..."
                value={announceMessage}
                onChange={(e) => setAnnounceMessage(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-primary focus:border-brand focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={broadcasting}
              className="w-full py-3 text-sm font-bold inline-flex items-center justify-center gap-2"
            >
              {broadcasting ? (
                <span>Broadcasting to Followers...</span>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Notification to Followers</span>
                </>
              )}
            </Button>
          </form>
        </Card>
      )}

      {/* TAB 3: SCHOLARSHIPS MANAGER */}
      {activeTab === 'scholarships' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search scholarships..."
                value={schSearch}
                onChange={(e) => setSchSearch(e.target.value)}
                className="w-full rounded-full border border-slate-300 bg-white pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-brand focus:outline-none shadow-xs"
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredScholarships.length} programs
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredScholarships.map((sch) => (
              <Card
                key={sch.id}
                className="p-5 border border-slate-200 bg-white rounded-3xl flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="brand">{sch.country}</Badge>
                    <Badge variant="accent">{sch.fundingLevel}</Badge>
                  </div>

                  <h3 className="mt-2 text-base font-extrabold text-primary line-clamp-1">
                    {sch.name}
                  </h3>

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Funding Amount:</span>
                      <strong className="text-primary font-bold">
                        {sch.amountUsd ? `$${sch.amountUsd.toLocaleString()}` : 'Full / Variable'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Deadline:</span>
                      <strong className="text-emerald-700 font-semibold">
                        {sch.deadline || 'Ongoing'}
                      </strong>
                    </div>
                  </div>

                  {sch.eligibility && (
                    <p className="mt-2 text-[11px] text-slate-500 line-clamp-2">
                      {sch.eligibility}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {sch.websiteUrl && (
                    <a
                      href={sch.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-500 hover:text-primary inline-flex items-center gap-1 font-semibold"
                    >
                      <ExternalLink className="h-3 w-3" /> Visit Portal
                    </a>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setEditingSch(sch)}
                    className="text-xs py-1 px-3"
                  >
                    Edit Program
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* EDIT UNIVERSITY MODAL (PORTAL TO DOCUMENT.BODY) */}
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

              <form onSubmit={handleSaveUniversity} className="space-y-4">
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
                    {savingUni ? 'Saving Changes...' : 'Save & Broadcast'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AdminDashboard;
