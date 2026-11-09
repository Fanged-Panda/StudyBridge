import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquare, Tag } from 'lucide-react';
import AuthorAvatar from './AuthorAvatar';
import VoteControl from './VoteControl';
import { formatDate } from './format';

const JourneyCard = ({ journey }) => {
  const { slug, title, excerpt, author, image, tags = [], createdAt, score, myVote, commentCount } = journey;
  const visibleTags = tags.slice(0, 3);
  const extraTags = tags.length - visibleTags.length;

  return (
    <article className="academic-shadow-hover group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
      <Link
        to={`/community/${slug}`}
        className="flex h-full flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        aria-label={`Read post: ${title}`}
      >
        {image ? (
          <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
            <img
              src={image}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          </div>
        ) : null}

        <div className="flex flex-1 flex-col p-6">
          <div className="flex flex-wrap items-center gap-2">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-accent"
              >
                <Tag size={10} /> {tag}
              </span>
            ))}
            {extraTags > 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-text-muted">
                +{extraTags}
              </span>
            )}
          </div>

          <h3 className="mt-4 text-xl font-extrabold leading-snug tracking-tight text-primary transition-colors group-hover:text-accent">
            {title}
          </h3>

          <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-text-muted">{excerpt}</p>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex min-w-0 items-center gap-2">
              <AuthorAvatar name={author?.name} photo={author?.photo} size="sm" />
              <p className="truncate text-xs text-text-muted">{formatDate(createdAt)}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-accent">
              Read <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Link>

      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5">
        <VoteControl slug={slug} score={score} myVote={myVote} size="sm" />
        <Link
          to={`/community/${slug}#comments`}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold text-text-muted transition hover:bg-slate-100 hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <MessageSquare size={13} /> {commentCount || 0}
        </Link>
      </div>
    </article>
  );
};

export default JourneyCard;
