import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  PenLine,
  ShieldAlert,
  Trash2,
  XCircle,
} from 'lucide-react';
import JourneyForm from '../../features/community/JourneyForm';
import { communityApi } from '../../services/api';

const STATUS_VIEW = {
  pending: {
    label: 'In review',
    tone: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: Clock,
    copy: 'Your story is waiting for a moderator. Only you and the moderators can see it right now.',
  },
  approved: {
    label: 'Published',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: CheckCircle2,
    copy: 'Your journey is live in the community feed.',
  },
  rejected: {
    label: 'Not published',
    tone: 'border-red-200 bg-red-50 text-red-800',
    icon: XCircle,
    copy: 'A moderator did not publish this story. You can edit it and submit again.',
  },
};

const ManageJourneyPage = () => {
  const { token } = useParams();
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saved, setSaved] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleted, setDeleted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setJourney(await communityApi.manage(token));
    } catch (error) {
      setLoadError(
        error?.response?.data?.message || 'This link is not valid. Please check the email we sent you, or submit again.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await communityApi.deleteManaged(token);
      setDeleted(true);
    } catch (error) {
      setDeleteError(error?.response?.data?.message || 'The journey could not be deleted. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-soft">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" />
        <p className="mt-3 text-sm text-text-muted">Opening your journey…</p>
      </div>
    );
  }

  if (deleted) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-soft">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="mt-4 text-2xl font-extrabold text-primary">Your journey was deleted</h1>
        <p className="mt-2 text-sm text-text-muted">
          It is no longer part of the community. Thanks for having shared it with us.
        </p>
        <Link
          to="/community"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
        >
          <ArrowLeft size={14} /> Back to the community
        </Link>
      </div>
    );
  }

  if (loadError || !journey) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
        <h1 className="mt-4 text-xl font-extrabold text-primary">We could not open that link</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-red-700">{loadError}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            Try again
          </button>
          <Link
            to="/community/share"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-primary transition hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
          >
            Submit a new journey
          </Link>
        </div>
      </div>
    );
  }

  const status = STATUS_VIEW[journey.status] || STATUS_VIEW.pending;
  const StatusIcon = status.icon;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/community"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted transition hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
      >
        <ArrowLeft size={14} /> Community
      </Link>

      <header className="mt-4">
        <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-brand">
          <PenLine size={14} className="text-accent" /> Manage your journey
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-primary">Edit or remove your story</h1>
        <p className="mt-2 text-sm text-text-muted">
          This private link was sent to you by email. Anyone with it can edit this post, so please keep it to yourself.
        </p>
      </header>

      <div className={`mt-6 rounded-2xl border px-5 py-4 ${status.tone}`}>
        <p className="flex items-center gap-2 text-sm font-bold">
          <StatusIcon size={16} /> {status.label}
        </p>
        <p className="mt-1 text-sm">{status.copy}</p>
        {journey.status === 'approved' && (
          <Link
            to={`/community/${journey.slug}`}
            className="mt-2 inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-2 hover:no-underline"
          >
            View it live <ExternalLink size={12} />
          </Link>
        )}
        {journey.status === 'rejected' && journey.moderationNote && (
          <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold">Moderator note: {journey.moderationNote}</p>
        )}
      </div>

      {saved && (
        <div
          role="status"
          className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>Changes saved. Your post is updated for everyone.</span>
        </div>
      )}

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <JourneyForm
          mode="edit"
          initial={journey}
          submitLabel="Save changes"
          onSubmit={(payload) => communityApi.updateManaged(token, payload)}
          onSuccess={(data) => {
            setJourney((prev) => ({ ...prev, ...data }));
            setSaved(data);
          }}
        />
      </div>

      <section className="mt-6 rounded-3xl border border-red-200 bg-white p-6 shadow-soft sm:p-8">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-primary">
          <ShieldAlert size={18} className="text-red-500" /> Remove this journey
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Deleting is permanent — the story and any messages sent through it are removed from StudyBridge.
        </p>

        {deleteError && (
          <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {deleteError}
          </p>
        )}

        {confirmDelete ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {deleting ? 'Deleting…' : 'Yes, delete permanently'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-text-muted transition hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Keep my story
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            <Trash2 size={14} /> Delete this journey
          </button>
        )}
      </section>
    </div>
  );
};

export default ManageJourneyPage;
