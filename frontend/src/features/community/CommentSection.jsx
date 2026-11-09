import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CornerDownRight, Loader2, MessageSquare, MessageSquarePlus, Send, X } from 'lucide-react';
import { communityApi } from '../../services/api';
import { formatDate, pluralize } from './format';

const initialsOf = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const CommentBubble = ({ comment, isReply = false }) => (
  <div className={`flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 ${isReply ? 'rounded-tl-md' : ''}`}>
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-extrabold text-white ${
        isReply ? 'h-8 w-8 bg-slate-400 text-[10px]' : 'h-9 w-9 bg-primary text-[11px]'
      }`}
    >
      {initialsOf(comment.authorName)}
    </span>
    <div className="min-w-0">
      <p className="flex flex-wrap items-baseline gap-2">
        <span className="text-sm font-bold text-primary">{comment.authorName}</span>
        <span className="text-[11px] text-text-muted">{formatDate(comment.createdAt)}</span>
      </p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-text-main">{comment.body}</p>
    </div>
  </div>
);

const CommentSection = ({ slug }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = Boolean(localStorage.getItem('token'));

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [body, setBody] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const startedAt = useRef(Date.now());
  const bodyRef = useRef(null);

  const [replyTo, setReplyTo] = useState(null);
  const [replyBody, setReplyBody] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyError, setReplyError] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await communityApi.comments(slug);
      setComments(data?.items || []);
    } catch (err) {
      setLoadError(err?.response?.data?.message || 'Comments could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Older versions remembered the last commenter's name; comments now use the
    // signed-in member's first name, so drop the stored value.
    localStorage.removeItem('communityCommentName');
    load();
    startedAt.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (formOpen) bodyRef.current?.focus();
  }, [formOpen]);

  const goToLogin = () => navigate('/login', { state: { from: location.pathname } });

  const total =
    comments.length + comments.reduce((sum, comment) => sum + (comment.replies?.length || 0), 0);

  const toggleComposer = () => {
    if (!isLoggedIn) {
      goToLogin();
      return;
    }
    setFormOpen((open) => !open);
    setFormError('');
    setNotice('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const trimmedBody = body.trim();
    if (trimmedBody.length < 3) {
      setFormError('Write a short comment first.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    setNotice('');

    try {
      const data = await communityApi.addComment(slug, {
        body: trimmedBody,
        website: honeypot,
        formStartedAt: startedAt.current,
      });

      setComments((current) => [...current, { ...data.comment, replies: [] }]);
      setBody('');
      setNotice('Your comment is live.');
      setFormOpen(false);
      startedAt.current = Date.now();
    } catch (err) {
      if (err?.response?.status === 401) {
        goToLogin();
        return;
      }
      setFormError(err?.response?.data?.message || 'Your comment could not be posted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const openReply = (id) => {
    if (!isLoggedIn) {
      goToLogin();
      return;
    }
    setReplyTo((current) => (current === id ? null : id));
    setReplyBody('');
    setReplyError('');
    setNotice('');
  };

  const handleReply = async (event, parentId) => {
    event.preventDefault();
    if (replyBusy) return;

    const trimmed = replyBody.trim();
    if (trimmed.length < 3) {
      setReplyError('Write a short reply first.');
      return;
    }

    setReplyBusy(true);
    setReplyError('');

    try {
      const data = await communityApi.addComment(slug, {
        body: trimmed,
        parentId,
        website: honeypot,
        formStartedAt: startedAt.current,
      });

      // The server keeps threads one level deep, so a reply always lands on the
      // top-level comment it belongs to.
      setComments((current) =>
        current.map((comment) =>
          data.comment.parentId === comment.id
            ? { ...comment, replies: [...(comment.replies || []), data.comment] }
            : comment,
        ),
      );

      setReplyTo(null);
      setReplyBody('');
      setNotice('Your reply is live.');
    } catch (err) {
      if (err?.response?.status === 401) {
        goToLogin();
        return;
      }
      setReplyError(err?.response?.data?.message || 'Your reply could not be posted. Please try again.');
    } finally {
      setReplyBusy(false);
    }
  };

  return (
    <section
      id="comments"
      className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white shadow-soft"
      aria-labelledby="comments-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 sm:px-9">
        <h2 id="comments-heading" className="inline-flex items-center gap-2 text-lg font-extrabold text-primary">
          <MessageSquare size={17} className="text-accent" />
          Comments
          {!loading && total > 0 && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-accent">{total}</span>
          )}
        </h2>
        <button
          type="button"
          onClick={toggleComposer}
          aria-expanded={formOpen}
          aria-controls="comment-composer"
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-accent ${
            formOpen
              ? 'border border-slate-200 text-text-muted hover:border-slate-300 hover:text-primary'
              : 'bg-primary text-white hover:bg-opacity-90'
          }`}
        >
          {formOpen ? <X size={12} /> : <MessageSquarePlus size={12} />}
          {formOpen ? 'Cancel' : 'Comment'}
        </button>
      </div>

      <div className="px-6 py-6 sm:px-9">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <Loader2 size={14} className="animate-spin" /> Loading comments…
          </p>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-sm font-semibold text-red-700">{loadError}</p>
            <button
              type="button"
              onClick={load}
              className="mt-3 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white"
            >
              Try again
            </button>
          </div>
        ) : comments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-center text-sm text-text-muted">
            No comments yet. Be the first to say something useful.
          </p>
        ) : (
          <>
            <p className="text-xs font-semibold text-text-muted">{pluralize(total, 'comment')}</p>
            <ol className="mt-3 space-y-4">
              {comments.map((comment) => (
                <li key={comment.id} className="space-y-2">
                  <CommentBubble comment={comment} />

                  <div className="flex items-center gap-3 pl-4">
                    <button
                      type="button"
                      onClick={() => openReply(comment.id)}
                      aria-expanded={replyTo === comment.id}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold text-text-muted transition hover:bg-slate-100 hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <CornerDownRight size={11} />
                      {replyTo === comment.id ? 'Cancel' : 'Reply'}
                    </button>
                    {comment.replies?.length ? (
                      <span className="text-[11px] font-semibold text-text-muted">
                        {pluralize(comment.replies.length, 'reply', 'replies')}
                      </span>
                    ) : null}
                  </div>

                  {comment.replies?.length ? (
                    <ol className="ml-4 space-y-2 border-l-2 border-slate-100 pl-4">
                      {comment.replies.map((reply) => (
                        <li key={reply.id}>
                          <CommentBubble comment={reply} isReply />
                        </li>
                      ))}
                    </ol>
                  ) : null}

                  {replyTo === comment.id ? (
                    <form
                      onSubmit={(event) => handleReply(event, comment.id)}
                      className="ml-4 rounded-2xl border border-slate-200 bg-white p-3.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-primary">Replying to {comment.authorName}</p>
                        <button
                          type="button"
                          onClick={() => setReplyTo(null)}
                          aria-label="Cancel reply"
                          className="rounded-full p-1 text-text-muted transition hover:bg-slate-100"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      <textarea
                        value={replyBody}
                        onChange={(event) => setReplyBody(event.target.value)}
                        rows={2}
                        autoFocus
                        aria-label={`Reply to ${comment.authorName}`}
                        className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
                        placeholder="Add your reply…"
                      />
                      {replyError && (
                        <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700">
                          {replyError}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <button
                          type="submit"
                          disabled={replyBusy || !replyBody.trim()}
                          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-white transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {replyBusy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                          {replyBusy ? 'Posting…' : 'Post reply'}
                        </button>
                      </div>
                    </form>
                  ) : null}
                </li>
              ))}
            </ol>
          </>
        )}

        {notice && (
          <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            {notice}
          </p>
        )}

        {formOpen && (
          <form
            id="comment-composer"
            onSubmit={handleSubmit}
            className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
          >
            <p className="text-sm font-extrabold text-primary">Add a comment</p>
            <p className="mt-0.5 text-xs text-text-muted">
              You are commenting as your StudyBridge profile. Anyone can reply to you here.
            </p>

            <div className="mt-3">
              <label htmlFor="comment-body" className="mb-1 block text-xs font-bold text-primary">
                Comment *
              </label>
              <textarea
                id="comment-body"
                ref={bodyRef}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={3}
                className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
                placeholder="How did this help you? What would you add?"
              />
              <p className="mt-1 text-[11px] text-text-muted">Your email is never shown.</p>
              <div className="hidden" aria-hidden="true">
                <label htmlFor="comment-website">Website</label>
                <input
                  id="comment-website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(event) => setHoneypot(event.target.value)}
                />
              </div>
            </div>

            {formError && (
              <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {submitting ? 'Posting…' : 'Post comment'}
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

export default CommentSection;
