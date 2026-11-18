import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Bell,
  Users,
  Send,
  CheckCircle2,
  AlertCircle,
  Search,
  Megaphone,
  ShieldAlert,
  RefreshCw,
  Plus,
  Globe2,
  ExternalLink,
  Trash2,
  UserRound,
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import AdminJourneyPanel from '../../features/community/AdminJourneyPanel';
import { clearCache, getCache, setCache } from '../../services/pageCache';

const HACKER_AVATAR =
  'https://api.dicebear.com/9.x/bottts/svg?seed=CyberHacker&backgroundColor=041d1a';

const TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'universities', label: 'Add University', icon: Building2 },
  { id: 'announcements', label: 'Broadcast', icon: Bell },
  { id: 'community', label: 'Community', icon: Megaphone },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('users');
  const cachedStats = getCache('admin:stats');
  const [stats, setStats] = useState(() =>
    cachedStats || {
      universityCount: 0,
      scholarshipCount: 0,
      studentCount: 0,
      totalFollows: 0,
      totalNotificationsSent: 0,
    },
  );
  const [statsLoading, setStatsLoading] = useState(!cachedStats);

  const [users, setUsers] = useState([]);
  const [userQuery, setUserQuery] = useState('');
  const [usersLoading, setUsersLoading] = useState(true);
  const [userFeedback, setUserFeedback] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);

  const [universities, setUniversities] = useState(() => getCache('admin:universities') || []);
  const [targetUniId, setTargetUniId] = useState('');
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceMessage, setAnnounceMessage] = useState('');
  const [announceType, setAnnounceType] = useState('ADMISSION_UPDATE');
  const [broadcasting, setBroadcasting] = useState(false);
  const [announceFeedback, setAnnounceFeedback] = useState(null);

  const [discoveryCountry, setDiscoveryCountry] = useState('');
  const [discoveryQuery, setDiscoveryQuery] = useState('');
  const [discoveryLimit, setDiscoveryLimit] = useState('10');
  const [discoveryResults, setDiscoveryResults] = useState([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryFeedback, setDiscoveryFeedback] = useState(null);
  const [addingKey, setAddingKey] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/stats');
      if (res.data?.success) {
        setStats(res.data.data);
        setCache('admin:stats', res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load admin stats:', err?.message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadUniversities = useCallback(async () => {
    try {
      const res = await api.get('/universities', { params: { limit: 100 } });
      if (res.data?.data) {
        setUniversities(res.data.data);
        setCache('admin:universities', res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load universities in admin:', err?.message);
    }
  }, []);

  const loadUsers = useCallback(async (search = '') => {
    setUsersLoading(true);
    try {
      const res = await api.get('/admin/users', {
        params: { search: search.trim() || undefined, limit: 100 },
      });
      setUsers(res.data?.data?.items || []);
    } catch (err) {
      setUserFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to load users.',
      });
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadUniversities();
  }, [loadStats, loadUniversities]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadUsers(userQuery), 300);
    return () => window.clearTimeout(timer);
  }, [userQuery, loadUsers]);

  const handleDeleteUser = async (user) => {
    if (!user?.id) return;
    if (!window.confirm(`Permanently delete ${user.name} (${user.email})?`)) return;

    setDeletingUserId(user.id);
    setUserFeedback(null);
    try {
      const res = await api.delete(`/admin/users/${user.id}`);
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
      setUserFeedback({ type: 'success', message: res.data?.message || 'User deleted.' });
      loadStats();
    } catch (err) {
      setUserFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete user.',
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleDiscover = async (event) => {
    event?.preventDefault();
    if (!discoveryCountry.trim() && !discoveryQuery.trim()) return;

    setDiscoveryLoading(true);
    setDiscoveryFeedback(null);
    setDiscoveryResults([]);
    try {
      const res = await api.get('/admin/university-discovery', {
        params: {
          country: discoveryCountry.trim() || undefined,
          query: discoveryQuery.trim() || undefined,
          limit: Number(discoveryLimit) || 10,
        },
      });
      setDiscoveryResults(res.data?.data?.results || []);
      const warnings = res.data?.data?.warnings || [];
      if (warnings.length) {
        setDiscoveryFeedback({ type: 'error', message: warnings.join(' · ') });
      }
    } catch (err) {
      setDiscoveryFeedback({
        type: 'error',
        message: err.response?.data?.message || 'University discovery failed.',
      });
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const handleAddAndSync = async (candidate) => {
    const key = `${candidate.name}|${candidate.websiteUrl || ''}`;
    setAddingKey(key);
    setDiscoveryFeedback(null);
    try {
      const res = await api.post(
        '/admin/universities/import',
        {
          name: candidate.name,
          country: candidate.country,
          websiteUrl: candidate.websiteUrl,
          ranking: candidate.ranking,
          source: candidate.source,
        },
        { timeout: 180000 },
      );

      const imported = res.data?.data?.university;
      setDiscoveryResults((prev) =>
        prev.map((item) =>
          item.name === candidate.name
            ? { ...item, existing: true, id: imported?.id || item.id }
            : item,
        ),
      );
      setDiscoveryFeedback({
        type: 'success',
        message: res.data?.message || `Added and synced ${candidate.name}.`,
      });
      clearCache('uni:');
      clearCache('admin:');
      clearCache('home:');
      await Promise.all([loadUniversities(), loadStats()]);
    } catch (err) {
      setDiscoveryFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Could not add and sync this university.',
      });
    } finally {
      setAddingKey(null);
    }
  };

  const handleBroadcastAnnouncement = async (event) => {
    event.preventDefault();
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
      setAnnounceFeedback({ type: 'success', message: res.data?.message || 'Announcement sent.' });
      setAnnounceTitle('');
      setAnnounceMessage('');
      loadStats();
    } catch (err) {
      setAnnounceFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to broadcast announcement.',
      });
    } finally {
      setBroadcasting(false);
    }
  };

  const feedbackBox = (feedback) =>
    feedback && (
      <div
        className={`flex items-center gap-2.5 rounded-2xl border p-3.5 text-xs font-semibold ${
          feedback.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}
      >
        {feedback.type === 'success' ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        ) : (
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
        )}
        <span>{feedback.message}</span>
      </div>
    );

  return (
    <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 animate-fade-in md:px-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                <ShieldAlert className="h-3.5 w-3.5" />
                Administrator Portal
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                <Megaphone className="h-3 w-3" /> Live follower broadcaster
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
              Admin Control
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Manage member accounts, add universities from live data sources, broadcast follower updates, and run
              synchronization operations from one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/90 p-2.5 pr-4 shadow-2xs">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-xs">
                <img src={HACKER_AVATAR} alt="Administrator profile" className="h-full w-full object-cover" />
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
              className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-primary hover:text-primary"
            >
              Public Catalog
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ['Universities', stats.universityCount],
            ['Scholarships', stats.scholarshipCount],
            ['Users', stats.studentCount],
            ['Active follows', stats.totalFollows],
            ['Notifications', stats.totalNotificationsSent],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-center">
              <div className="text-2xl font-black text-primary">{statsLoading ? '—' : value}</div>
              <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
                active
                  ? 'border-brand text-brand'
                  : 'border-transparent text-slate-500 hover:text-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.id === 'users' && <Badge variant="outline">{stats.studentCount}</Badge>}
            </button>
          );
        })}
      </div>

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
                placeholder="Search by name, email, or country…"
                className="w-full rounded-full border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 shadow-xs placeholder:text-slate-400 focus:border-brand focus:outline-none"
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Showing {users.length} user{users.length === 1 ? '' : 's'}
            </span>
          </div>

          {feedbackBox(userFeedback)}

          <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            {usersLoading ? (
              <div className="p-10 text-center text-sm font-semibold text-slate-500">Loading users…</div>
            ) : users.length === 0 ? (
              <div className="p-10 text-center">
                <UserRound className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-600">No users match this search.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col gap-3 p-4 transition hover:bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-black text-white">
                        {user.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-extrabold text-primary">{user.name}</p>
                          {user.role === 'admin' && <Badge variant="accent">Admin</Badge>}
                        </div>
                        <p className="truncate text-xs text-slate-500">{user.email}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {[user.institution, user.country].filter(Boolean).join(' · ') || 'No institution listed'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-right text-[11px] text-slate-500">
                        <p>{user._count?.followedUniversities ?? 0} follows</p>
                        <p>
                          Joined{' '}
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user)}
                        disabled={deletingUserId === user.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-700 transition hover:border-red-400 hover:bg-red-100 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingUserId === user.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'universities' && (
        <div className="space-y-5">
          <Card className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-accent" />
              <h2 className="text-2xl font-extrabold text-primary">Add a university</h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Search the verified HipoLabs directory by name or country, then match each result to OpenAlex
              research metrics before adding. Imports sync admissions, costs, scholarships, programs, and faculty.
            </p>

            <form onSubmit={handleDiscover} className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_1fr_140px_auto]">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  University name (optional)
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={discoveryQuery}
                    onChange={(event) => setDiscoveryQuery(event.target.value)}
                    placeholder="e.g. Technical University of Munich"
                    className="w-full rounded-2xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-primary focus:border-brand focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Country (optional)
                </label>
                <div className="relative">
                  <Globe2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={discoveryCountry}
                    onChange={(event) => setDiscoveryCountry(event.target.value)}
                    placeholder="e.g. Germany"
                    className="w-full rounded-2xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-primary focus:border-brand focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Show
                </label>
                <select
                  value={discoveryLimit}
                  onChange={(event) => setDiscoveryLimit(event.target.value)}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-primary focus:border-brand focus:outline-none"
                >
                  {[5, 10, 15, 20].map((count) => (
                    <option key={count} value={count}>
                      {count} universities
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" variant="primary" disabled={discoveryLoading} className="w-full">
                  <Search className="h-4 w-4" />
                  {discoveryLoading ? 'Searching…' : 'Search'}
                </Button>
              </div>
            </form>

            {discoveryFeedback && <div className="mt-4">{feedbackBox(discoveryFeedback)}</div>}
          </Card>

          {discoveryResults.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {discoveryResults.map((candidate) => {
                const key = `${candidate.name}|${candidate.websiteUrl || ''}`;
                return (
                  <Card
                    key={key}
                    className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="brand">{candidate.source}</Badge>
                        {candidate.existing && <Badge variant="accent">In catalog</Badge>}
                      </div>
                      <h3 className="mt-2 text-base font-extrabold leading-snug text-primary">{candidate.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">{candidate.country}</p>
                      {candidate.worksCount != null && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          {Number(candidate.worksCount).toLocaleString()} research works
                        </p>
                      )}
                      {candidate.citedByCount != null && (
                        <p className="mt-1 text-[11px] text-slate-400">
                          {Number(candidate.citedByCount).toLocaleString()} citations
                        </p>
                      )}
                      {candidate.websiteUrl && (
                        <a
                          href={candidate.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> Official website
                        </a>
                      )}
                    </div>

                    <Button
                      variant={candidate.existing ? 'outline' : 'primary'}
                      onClick={() => handleAddAndSync(candidate)}
                      disabled={addingKey === key}
                      className="mt-4 w-full text-xs"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${addingKey === key ? 'animate-spin' : ''}`} />
                      {addingKey === key
                        ? 'Syncing…'
                        : candidate.existing
                          ? 'Sync again'
                          : 'Add & sync'}
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'announcements' && (
        <Card className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-accent" />
              <h2 className="text-2xl font-extrabold text-primary">Broadcast admission announcement</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Publish admission dates, scholarship updates, or policy changes to students following a university.
            </p>
          </div>

          {feedbackBox(announceFeedback)}

          <form onSubmit={handleBroadcastAnnouncement} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Target university
              </label>
              <select
                value={targetUniId}
                onChange={(event) => setTargetUniId(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-primary focus:border-brand focus:outline-none"
              >
                <option value="">-- Choose a university --</option>
                {universities.map((university) => (
                  <option key={university.id} value={university.id}>
                    {university.name} ({university.country})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Announcement type
              </label>
              <select
                value={announceType}
                onChange={(event) => setAnnounceType(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-primary focus:border-brand focus:outline-none"
              >
                <option value="ADMISSION_UPDATE">Admission update</option>
                <option value="DEADLINE_ALERT">Deadline alert</option>
                <option value="SCHOLARSHIP_ALERT">Scholarship alert</option>
                <option value="REQUIREMENTS_CHANGE">Requirements change</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Notification title
              </label>
              <input
                value={announceTitle}
                onChange={(event) => setAnnounceTitle(event.target.value)}
                required
                placeholder="e.g. Fall 2027 deadline extended"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-primary placeholder:text-slate-400 focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700">
                Message
              </label>
              <textarea
                rows={4}
                value={announceMessage}
                onChange={(event) => setAnnounceMessage(event.target.value)}
                required
                placeholder="Describe the update for students…"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-primary placeholder:text-slate-400 focus:border-brand focus:outline-none"
              />
            </div>

            <Button type="submit" variant="primary" disabled={broadcasting} className="w-full py-3">
              <Send className="h-4 w-4" />
              {broadcasting ? 'Broadcasting…' : 'Send notification to followers'}
            </Button>
          </form>
        </Card>
      )}

      {activeTab === 'community' && <AdminJourneyPanel />}
    </div>
  );
};

export default AdminDashboard;
