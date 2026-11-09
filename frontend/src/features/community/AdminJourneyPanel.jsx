import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Flag,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { communityAdminApi } from '../../services/api';
import { formatDate } from './format';
import AuthorAvatar from './AuthorAvatar';

const STATUS_TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Published' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'reports', label: 'Reports' },
];

const statusBadge = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-700',
};

const AdminJourneyPanel = () => {
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [data, setData] = useState({ items: [], counts: { pending: 0, approved: 0, rejected: 0 } });
  const [reports, setReports] = useState({ items: [], openCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [comments, setComments] = useState({});
  const [commentsLoadingId, setCommentsLoadingId] = useState(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'reports') {
        setReports(await communityAdminApi.reports({ status: 'open' }));
      } else {
        setData(await communityAdminApi.journeys({ status: tab, search: debounced || undefined, limit: 30 }));
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Moderation data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [tab, debounced]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (journey, status) => {
    setBusyId(journey.id);
    setFeedback(null);
    try {
      await communityAdminApi.review(journey.id, { status, moderationNote: notes[journey.id] || '' });
      setFeedback({
        tone: 'success',
        message:
          status === 'approved'
            ? `“${journey.title}” is now published.`
            : status === 'rejected'
              ? `“${journey.title}” was rejected.`
              : `“${journey.title}” is back in review.`,
      });
      setExpandedId(null);
      await load();
    } catch (err) {
      setFeedback({ tone: 'error', message: err?.response?.data?.message || 'That action failed. Please try again.' });
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (journey) => {
    if (!window.confirm(`Delete “${journey.title}” permanently?`)) return;
    setBusyId(journey.id);
    setFeedback(null);
    try {
      await communityAdminApi.remove(journey.id);
      setFeedback({ tone: 'success', message: `“${journey.title}” was deleted.` });
      await load();
    } catch (err) {
      setFeedback({ tone: 'error', message: err?.response?.data?.message || 'The journey could not be deleted.' });
    } finally {
      setBusyId(null);
    }
  };

  const resolveReport = async (report, status, unpublish = false) => {
    setBusyId(report.id);
    setFeedback(null);
    try {
      await communityAdminApi.resolveReport(report.id, { status, unpublish });
      setFeedback({
        tone: 'success',
        message: unpublish ? 'Report resolved and the post was unpublished.' : `Report ${status}.`,
      });
      await load();
    } catch (err) {
      setFeedback({ tone: 'error', message: err?.response?.data?.message || 'The report could not be updated.' });
    } finally {
      setBusyId(null);
    }
  };

  const loadComments = async (journeyId) => {
    setCommentsLoadingId(journeyId);
    try {
      const result = await communityAdminApi.comments(journeyId);
      setComments((prev) => ({ ...prev, [journeyId]: result?.items || [] }));
    } catch {
      setComments((prev) => ({ ...prev, [journeyId]: [] }));
    } finally {
      setCommentsLoadingId(null);
    }
  };

  const toggleExpanded = (journeyId) => {
    const next = expandedId === journeyId ? null : journeyId;
    setExpandedId(next);
    if (next && !comments[next]) loadComments(next);
  };

  const deleteComment = async (journeyId, commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await communityAdminApi.deleteComment(commentId);
      setComments((prev) => ({
        ...prev,
        [journeyId]: (prev[journeyId] || []).filter((entry) => entry.id !== commentId),
      }));
      setData((prev) => ({
        ...prev,
        items: prev.items.map((entry) =>
          entry.id === journeyId
            ? { ...entry, commentCount: Math.max(0, (entry.commentCount || 0) - 1) }
            : entry,
        ),
      }));
    } catch {
      setFeedback({ tone: 'error', message: 'That comment could not be deleted.' });
    }
  };

  const items = tab === 'reports' ? reports.items : data.items;
  const counts = data.counts || { pending: 0, approved: 0, rejected: 0 };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((entry) => {
            const active = tab === entry.id;
            const count =
              entry.id === 'reports' ? reports.openCount : counts[entry.id] || 0;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setTab(entry.id);
                  setExpandedId(null);
                  setFeedback(null);
                }}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent ${
                  active ? 'bg-primary text-white' : 'border border-slate-200 bg-white text-text-muted hover:border-accent hover:text-primary'
                }`}
              >
                {entry.label}
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-100 text-text-muted'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {tab !== 'reports' && (
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, author, email"
                aria-label="Search journeys"
                className="w-full rounded-full border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10 sm:w-64"
              />
            </div>
          )}
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-text-muted transition hover:border-accent hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold ${
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.tone === 'success' ? <Check size={15} className="mt-0.5" /> : <AlertCircle size={15} className="mt-0.5" />}
          {feedback.message}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-accent" />
          <p className="mt-2 text-sm text-text-muted">Loading…</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <ShieldCheck className="mx-auto h-8 w-8 text-accent" />
          <p className="mt-3 text-sm font-semibold text-primary">
            {tab === 'reports' ? 'No open reports' : `Nothing ${tab === 'pending' ? 'waiting for review' : tab} right now`}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {tab === 'reports' ? 'Reported posts will appear here.' : 'New submissions show up here automatically.'}
          </p>
        </div>
      ) : tab === 'reports' ? (
        <ul className="space-y-3">
          {items.map((report) => (
            <li key={report.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-red-600">
                    <Flag size={12} /> {report.reason}
                  </p>
                  <p className="mt-2 text-sm font-extrabold text-primary">{report.journey?.title || 'Deleted journey'}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    by {report.journey?.authorName || '—'} · reported {formatDate(report.createdAt)}
                    {report.reporterEmail ? ` · from ${report.reporterEmail}` : ''}
                  </p>
                  {report.details && (
                    <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-text-main">{report.details}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.journey?.slug && (
                    <Link
                      to={`/community/${report.journey.slug}`}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:border-accent hover:text-primary"
                    >
                      <ExternalLink size={12} /> View post
                    </Link>
                  )}
                  {report.journey?.status === 'approved' && (
                    <button
                      type="button"
                      onClick={() => resolveReport(report, 'resolved', true)}
                      disabled={busyId === report.id}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                    >
                      Unpublish + resolve
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => resolveReport(report, 'dismissed')}
                    disabled={busyId === report.id}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:border-slate-300 disabled:opacity-60"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveReport(report, 'resolved')}
                    disabled={busyId === report.id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-opacity-90 disabled:opacity-60"
                  >
                    {busyId === report.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Resolve
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-3">
          {items.map((journey) => {
            const expanded = expandedId === journey.id;
            const busy = busyId === journey.id;
            return (
              <li key={journey.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                  <AuthorAvatar name={journey.authorName} photo={journey.photo} size="md" />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${statusBadge[journey.status]}`}>
                        {journey.status}
                      </span>
                      {journey.reportCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                          <Flag size={10} /> {journey.reportCount}
                        </span>
                      )}
                      <span className="text-[11px] text-text-muted">{formatDate(journey.createdAt)}</span>
                    </div>

                    <h3 className="mt-1.5 text-base font-extrabold text-primary">{journey.title}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
                      <span className="font-semibold text-text-main">{journey.authorName}</span>
                      <span className="inline-flex items-center gap-1">
                        <Mail size={11} /> {journey.authorEmail}
                      </span>
                      <span>· {journey.views} views</span>
                      <span>· {journey.contactCount} messages</span>
                      <span>· {journey.commentCount || 0} comments</span>
                    </p>

                    <p className={`mt-2 text-sm leading-relaxed text-text-muted ${expanded ? '' : 'line-clamp-2'}`}>
                      {expanded ? journey.story : journey.excerpt}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {journey.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-accent">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {expanded && journey.status !== 'approved' && (
                      <div className="mt-3">
                        <label htmlFor={`note-${journey.id}`} className="text-xs font-bold text-primary">
                          Note to author (optional, shown when rejected)
                        </label>
                        <input
                          id={`note-${journey.id}`}
                          value={notes[journey.id] ?? journey.moderationNote ?? ''}
                          onChange={(event) => setNotes((prev) => ({ ...prev, [journey.id]: event.target.value }))}
                          maxLength={300}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                          placeholder="e.g. Please remove the contact details in paragraph 3."
                        />
                      </div>
                    )}

                    {expanded && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                        <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
                          <MessageSquare size={12} className="text-accent" /> Comments
                          <span className="text-text-muted">({(comments[journey.id] || []).length})</span>
                        </p>
                        {commentsLoadingId === journey.id ? (
                          <p className="mt-2 text-xs text-text-muted">Loading comments…</p>
                        ) : (comments[journey.id] || []).length === 0 ? (
                          <p className="mt-2 text-xs text-text-muted">No comments on this journey.</p>
                        ) : (
                          <ul className="mt-2 space-y-2">
                            {(comments[journey.id] || []).map((comment) => (
                              <li
                                key={comment.id}
                                className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2 text-xs"
                              >
                                <div className="min-w-0">
                                  <span className="font-bold text-primary">{comment.authorName}</span>
                                  <span className="ml-2 text-text-muted">{formatDate(comment.createdAt)}</span>
                                  <p className="mt-1 whitespace-pre-wrap break-words text-text-main">{comment.body}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => deleteComment(journey.id, comment.id)}
                                  className="shrink-0 rounded-full p-1.5 text-text-muted transition hover:bg-red-50 hover:text-red-600"
                                  aria-label={`Delete comment by ${comment.authorName}`}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {journey.status !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => review(journey, 'approved')}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve & publish
                        </button>
                      )}
                      {journey.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => review(journey, 'rejected')}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          <X size={12} /> Reject
                        </button>
                      )}
                      {journey.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => review(journey, 'pending')}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-text-muted transition hover:border-slate-300 disabled:opacity-60"
                        >
                          <Clock size={12} /> Unpublish
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleExpanded(journey.id)}
                        aria-expanded={expanded}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-text-muted transition hover:border-accent hover:text-primary"
                      >
                        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />} {expanded ? 'Collapse' : 'Read full'}
                      </button>
                      {journey.status === 'approved' && (
                        <Link
                          to={`/community/${journey.slug}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-text-muted transition hover:border-accent hover:text-primary"
                        >
                          <ExternalLink size={12} /> View
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(journey)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AdminJourneyPanel;
