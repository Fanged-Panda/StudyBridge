import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, PenLine } from 'lucide-react';
import JourneyForm from '../../features/community/JourneyForm';
import { communityApi } from '../../services/api';

const SubmitJourneyPage = () => {
  const [tags, setTags] = useState([]);
  const [published, setPublished] = useState(null);

  useEffect(() => {
    communityApi
      .tags()
      .then(setTags)
      .catch(() => setTags([]));
  }, []);

  if (published) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-soft sm:p-10">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={26} />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">Your story is live</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-text-muted">
            “{published.title || 'Your post'}” is now in the community feed. Your profile picture travels with it, and
            readers can upvote it and reply to you.
          </p>

          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {published.slug ? (
              <Link
                to={`/community/${published.slug}`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                View your post
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setPublished(null)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            >
              Share another story
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/community"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted transition hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
      >
        <ArrowLeft size={14} /> All journeys
      </Link>

      <header className="mt-4">
        <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-brand">
          <PenLine size={14} className="text-accent" /> Share your journey
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">Tell us how it really went</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
          The deadlines you missed, the email that changed everything, the plan B that worked out. Your story is exactly
          what another student needs to read today.
        </p>
      </header>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <JourneyForm
          tagSuggestions={tags}
          onSubmit={(payload) => communityApi.submit(payload)}
          onSuccess={setPublished}
        />
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs text-text-muted">
        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
        Post only your own experience. You can delete the post at any time; moderators can also remove anything that breaks
        the community rules.
      </p>
    </div>
  );
};

export default SubmitJourneyPage;
