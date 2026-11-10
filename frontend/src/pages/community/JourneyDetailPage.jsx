import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Clock,
  Flag,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  Tag,
  Trash2,
} from 'lucide-react';
import AuthorAvatar from '../../features/community/AuthorAvatar';
import CommentSection from '../../features/community/CommentSection';
import ContactAuthorModal from '../../features/community/ContactAuthorModal';
import Modal from '../../features/community/Modal';
import ReportModal from '../../features/community/ReportModal';
import VoteControl from '../../features/community/VoteControl';
import { formatDate, readingTime } from '../../features/community/format';
import { communityApi } from '../../services/api';
import { getCache, setCache } from '../../services/pageCache';

const JourneyDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const cacheKey = `journey:${slug}`;
  const cachedJourney = getCache(cacheKey);
  const [journey, setJourney] = useState(cachedJourney ?? null);
  const [loading, setLoading] = useState(!cachedJourney);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const cached = getCache(cacheKey);
    if (cached) {
      setJourney(cached);
      setLoading(false);
    } else {
      setJourney(null);
      setLoading(true);
    }
    setError('');
    setNotFound(false);

    communityApi
      .journey(slug)
      .then((data) => {
        if (cancelled) return;
        setJourney(data);
        setCache(cacheKey, data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 404) setNotFound(true);
        else setError(err?.response?.data?.message || 'This journey could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, cacheKey]);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await communityApi.remove(slug);
      navigate('/community', { replace: true });
    } catch (err) {
      setDeleteError(err?.response?.data?.message || 'This post could not be deleted.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <div className="h-4 w-24 rounded bg-slate-100" />
          <div className="mt-5 h-9 w-4/5 rounded bg-slate-100" />
          <div className="mt-3 h-4 w-1/3 rounded bg-slate-100" />
          <div className="mt-8 space-y-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-3 w-full rounded bg-slate-100" />
            ))}
          </div>
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-text-muted">
          <Loader2 size={14} className="animate-spin" /> Loading journey…
        </p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-soft">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-accent">
          <BookOpen size={22} />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold text-primary">This journey is not available</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">
          The author may have removed it, or the link is no longer valid.
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

  if (error || !journey) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
        <p className="text-sm font-semibold text-red-700">{error || 'This journey could not be loaded.'}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <RefreshCw size={14} /> Try again
        </button>
      </div>
    );
  }

  const firstName = journey.author?.name?.split(' ')[0] || 'this author';

  return (
    <div>
      <Link
        to="/community"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted transition hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
      >
        <ArrowLeft size={14} /> All journeys
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
            <div className="border-b border-slate-100 bg-gradient-to-r from-secondary/60 to-white px-6 py-6 sm:px-9">
              <div className="flex flex-wrap items-center gap-2">
                {journey.tags.map((tag) => (
                  <Link
                    key={tag}
                    to="/community"
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-accent ring-1 ring-accent/15 transition hover:ring-accent/40"
                  >
                    <Tag size={10} /> {tag}
                  </Link>
                ))}
              </div>

              <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-primary sm:text-4xl">
                {journey.title}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-muted">
                <AuthorAvatar name={journey.author?.name} photo={journey.author?.photo} size="sm" />
                <span>{formatDate(journey.createdAt)}</span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={13} /> {readingTime(journey.story)} min read
                </span>
              </div>
            </div>

            {journey.image ? (
              <img
                src={journey.image}
                alt=""
                className="max-h-[460px] w-full border-b border-slate-100 object-cover"
              />
            ) : null}

            <div className="px-6 py-8 sm:px-9">
              <div className="journey-prose">
                <ReactMarkdown
                  components={{
                    a: ({ node, ...props }) => (
                      <a {...props} target="_blank" rel="noopener noreferrer nofollow" />
                    ),
                  }}
                >
                  {journey.story}
                </ReactMarkdown>
              </div>

              <div className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                <VoteControl slug={journey.slug} score={journey.score} myVote={journey.myVote} size="lg" />

                <div className="flex items-center gap-2">
                  {journey.isAuthor ? (
                    <button
                      type="button"
                      onClick={() => setDeleteOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-text-muted transition hover:border-red-300 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                    >
                      <Trash2 size={12} /> Delete post
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setReportOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-text-muted transition hover:border-red-300 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                  >
                    <Flag size={12} /> Report
                  </button>
                </div>
              </div>
            </div>
          </article>

          <CommentSection slug={slug} />
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="flex items-center gap-3">
              <AuthorAvatar name={journey.author?.name} photo={journey.author?.photo} size="lg" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">About the author</p>
                <p className="text-base font-extrabold text-primary">{journey.author?.name}</p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              {firstName} shared this journey with the StudyBridge community to help students walking the same road.
            </p>

            {journey.contactable ? (
              <button
                type="button"
                onClick={() => setContactOpen(true)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                <Mail size={15} /> Connect with {firstName}
              </button>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-text-muted">
                {firstName} is not taking messages through StudyBridge.
              </p>
            )}

            <p className="mt-3 flex items-start gap-1.5 text-xs text-text-muted">
              <Lock size={12} className="mt-0.5 shrink-0 text-accent" />
              Your email is only shared with the author, so they can reply.
            </p>
          </div>

          <div className="rounded-3xl border border-dashed border-accent/40 bg-secondary/40 p-5">
            <p className="text-sm font-bold text-primary">Something wrong with this post?</p>
            <p className="mt-1 text-xs text-text-muted">
              Reports are anonymous and go straight to the moderators, who can remove the post.
            </p>
            <button
              type="button"
              onClick={() => setReportOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-text-muted ring-1 ring-slate-200 transition hover:text-red-600 hover:ring-red-300 focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              <Flag size={12} /> Report this post
            </button>
          </div>

        </aside>
      </div>

      <ContactAuthorModal open={contactOpen} onClose={() => setContactOpen(false)} journey={journey} />
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} journey={journey} />

      <Modal
        open={deleteOpen}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        title="Delete this post?"
        description="The post, its votes and every comment will be removed for good. This cannot be undone."
        icon={AlertTriangle}
      >
        {deleteError && (
          <p role="alert" className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {deleteError}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setDeleteOpen(false)}
            disabled={deleting}
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-primary transition hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
          >
            Keep post
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 disabled:opacity-60"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {deleting ? 'Deleting…' : 'Delete post'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default JourneyDetailPage;
