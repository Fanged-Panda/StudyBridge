import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PenLine,
  RefreshCw,
  Search,
  Tag,
  Users,
  X,
} from 'lucide-react';
import JourneyCard from '../../features/community/JourneyCard';
import { communityApi } from '../../services/api';
import { getCache, setCache } from '../../services/pageCache';

const PAGE_SIZE = 9;
const TAGS_CACHE_KEY = 'community:tags';

const feedCacheKey = (search, tag, page) => `community:feed:${search}|${tag}|${page}`;

// The feed is stored in the database; this sample keeps the page readable when
// the API cannot be reached.
const SAMPLE_TAGS = [
  { name: 'Scholarship', count: 4 },
  { name: 'Visa', count: 3 },
  { name: 'SOP', count: 2 },
  { name: 'Germany', count: 2 },
  { name: 'Rejection', count: 1 },
];

const SAMPLE_JOURNEYS = [
  {
    slug: 'daad-scholarship-first-try',
    title: 'How I got the DAAD scholarship on my first attempt',
    excerpt:
      'Two rejections taught me more than any guide. Here is the exact timeline, the documents that mattered, and what I would do differently.',
    author: { name: 'Nusrat Jahan', photo: null },
    image: null,
    tags: ['Scholarship', 'Germany'],
    createdAt: '2026-10-28T10:20:00.000Z',
    score: 34,
    myVote: 0,
    commentCount: 6,
  },
  {
    slug: 'visa-interview-questions-asked',
    title: 'Every question they asked me at the visa interview',
    excerpt:
      'Fifteen minutes, eight questions, one approval. I wrote them down on the bus afterwards so nobody else has to guess.',
    author: { name: 'Tanvir Ahmed', photo: null },
    image: null,
    tags: ['Visa'],
    createdAt: '2026-10-21T08:05:00.000Z',
    score: 27,
    myVote: 0,
    commentCount: 4,
  },
  {
    slug: 'sop-that-worked',
    title: 'The SOP structure that worked for three UK universities',
    excerpt:
      'One page, four paragraphs, no generic opening. I share the full outline and the sentences I cut.',
    author: { name: 'Farhana Karim', photo: null },
    image: null,
    tags: ['SOP'],
    createdAt: '2026-10-12T14:40:00.000Z',
    score: 19,
    myVote: 0,
    commentCount: 2,
  },
  {
    slug: 'rejection-then-funding',
    title: 'Rejected in April, fully funded by September',
    excerpt:
      'I treated the rejection as data instead of a verdict. Here is how I rebuilt the application in six weeks.',
    author: { name: 'Sadia Islam', photo: null },
    image: null,
    tags: ['Rejection', 'Scholarship'],
    createdAt: '2026-10-03T18:15:00.000Z',
    score: 41,
    myVote: 0,
    commentCount: 9,
  },
  {
    slug: 'living-costs-germany',
    title: 'Real monthly budget for a student in Germany',
    excerpt:
      'Rent, semester fee, groceries, transport and the small costs nobody mentions — with the receipts.',
    author: { name: 'Rakib Hasan', photo: null },
    image: null,
    tags: ['Germany', 'Scholarship'],
    createdAt: '2026-09-24T09:30:00.000Z',
    score: 22,
    myVote: 0,
    commentCount: 3,
  },
  {
    slug: 'master-vs-phd-deciding',
    title: 'Master’s or straight to a PhD? How I decided',
    excerpt:
      'A short checklist of the questions that actually changed my mind, and who I asked before signing anything.',
    author: { name: 'Imran Chowdhury', photo: null },
    image: null,
    tags: ['Visa', 'SOP'],
    createdAt: '2026-09-16T12:00:00.000Z',
    score: 15,
    myVote: 0,
    commentCount: 1,
  },
];

const filterSampleJourneys = (search, tag) => {
  const term = String(search || '').trim().toLowerCase();
  const tagTerm = String(tag || '').trim().toLowerCase();

  return SAMPLE_JOURNEYS.filter((journey) => {
    const matchesTag = !tagTerm || journey.tags.some((entry) => entry.toLowerCase() === tagTerm);
    const matchesSearch =
      !term ||
      [journey.title, journey.excerpt, journey.author?.name, ...journey.tags]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));

    return matchesTag && matchesSearch;
  });
};

const SkeletonCard = () => (
  <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
    <div className="flex gap-2">
      <div className="h-5 w-20 rounded-full bg-slate-100" />
      <div className="h-5 w-16 rounded-full bg-slate-100" />
    </div>
    <div className="mt-4 h-6 w-4/5 rounded bg-slate-100" />
    <div className="mt-2 h-4 w-3/5 rounded bg-slate-100" />
    <div className="mt-5 space-y-2">
      <div className="h-3 w-full rounded bg-slate-100" />
      <div className="h-3 w-11/12 rounded bg-slate-100" />
      <div className="h-3 w-2/3 rounded bg-slate-100" />
    </div>
    <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
      <div className="h-9 w-9 rounded-full bg-slate-100" />
      <div className="h-3 w-24 rounded bg-slate-100" />
    </div>
  </div>
);

const CommunityPage = () => {
  const cachedFeed = getCache(feedCacheKey('', '', 1));

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [page, setPage] = useState(1);

  const [items, setItems] = useState(cachedFeed?.items ?? []);
  const [pagination, setPagination] = useState(cachedFeed?.pagination ?? { page: 1, total: 0, totalPages: 1 });
  const [tags, setTags] = useState(getCache(TAGS_CACHE_KEY) ?? []);
  const [loading, setLoading] = useState(!cachedFeed);
  const requestId = useRef(0);

  // Debounce typing so the feed does not refetch on every keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadFeed = useCallback(
    async (force = false) => {
      const key = feedCacheKey(search, activeTag, page);
      const cached = force ? null : getCache(key);

      if (cached) {
        setItems(cached.items);
        setPagination(cached.pagination);
        setLoading(false);
        return;
      }

      const id = requestId.current + 1;
      requestId.current = id;
      setLoading(true);

      try {
        const data = await communityApi.journeys({
          search: search || undefined,
          tag: activeTag || undefined,
          page,
          limit: PAGE_SIZE,
        });
        if (requestId.current !== id) return;
        setItems(data.items || []);
        setPagination(data.pagination);
        setCache(key, { items: data.items || [], pagination: data.pagination });
      } catch {
        if (requestId.current !== id) return;
        // Database/API unavailable: fall back to the samples that match the
        // active search/topic, just like the live feed would.
        const sample = filterSampleJourneys(search, activeTag);
        setItems(sample);
        setPagination({ page: 1, limit: PAGE_SIZE, total: sample.length, totalPages: 1 });
      } finally {
        if (requestId.current === id) setLoading(false);
      }
    },
    [search, activeTag, page]
  );

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  useEffect(() => {
    if (getCache(TAGS_CACHE_KEY)) return undefined;
    communityApi
      .tags()
      .then((data) => {
        setTags(data);
        setCache(TAGS_CACHE_KEY, data);
      })
      .catch(() => {
        setTags(SAMPLE_TAGS);
        setCache(TAGS_CACHE_KEY, SAMPLE_TAGS);
      });
    return undefined;
  }, []);

  const filtersActive = Boolean(search || activeTag);
  const total = pagination?.total || 0;

  const emptyCopy = useMemo(() => {
    if (filtersActive) {
      return {
        title: 'No journeys match that yet',
        body: 'Try a different word, or clear the filters to browse every story.',
      };
    }
    return {
      title: 'The first story could be yours',
      body: 'Nobody has shared a journey here yet. Tell the community how your application really went.',
    };
  }, [filtersActive]);

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-secondary/50 to-white p-7 shadow-soft sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-2xl" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.24em] text-brand">
            <Users size={14} className="text-accent" /> Community
          </p>
          <h1 className="mt-2 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-primary sm:text-4xl">
            Real journeys from students who have been there
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted sm:text-base">
            Scholarships, rejections, visa interviews and quiet wins — shared by members of the StudyBridge community.
            Upvote the stories that helped you and reply with what you learned.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/community/share"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              <PenLine size={15} /> Share your journey
            </Link>
            <p className="text-xs text-text-muted">
              Sign in, write it once, and readers can upvote and reply.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="relative">
            <label htmlFor="community-search" className="sr-only">
              Search journeys
            </label>
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              id="community-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by title or a phrase from the story…"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-sm text-primary outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted transition hover:bg-slate-100 hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.16em] text-text-muted">
              <Tag size={12} /> Topics
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveTag('');
                setPage(1);
              }}
              aria-pressed={!activeTag}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-accent ${
                !activeTag
                  ? 'bg-primary text-white'
                  : 'border border-slate-200 bg-white text-text-muted hover:border-accent hover:text-primary'
              }`}
            >
              All
            </button>
            {tags.map((entry) => {
              const active = activeTag.toLowerCase() === entry.name.toLowerCase();
              return (
                <button
                  key={entry.name}
                  type="button"
                  onClick={() => {
                    setActiveTag(active ? '' : entry.name);
                    setPage(1);
                  }}
                  aria-pressed={active}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-accent ${
                    active
                      ? 'bg-accent text-white'
                      : 'border border-slate-200 bg-white text-text-muted hover:border-accent hover:text-primary'
                  }`}
                >
                  {entry.name}
                  <span className={`ml-1.5 text-[10px] ${active ? 'text-white/80' : 'text-slate-400'}`}>{entry.count}</span>
                </button>
              );
            })}
            {!tags.length && !loading && (
              <span className="text-xs text-text-muted">Tags appear here once stories are published.</span>
            )}
          </div>
        </div>
      </div>


      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text-muted" aria-live="polite">
          {loading ? 'Loading journeys…' : `${total} ${total === 1 ? 'journey' : 'journeys'}${activeTag ? ` in ${activeTag}` : ''}`}
        </p>
        <button
          type="button"
          onClick={() => loadFeed(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-text-muted transition hover:border-accent hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
          <span className="sr-only" role="status">
            <Loader2 className="animate-spin" /> Loading journeys
          </span>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-soft">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-accent">
            <BookOpen size={22} />
          </span>
          <h2 className="mt-4 text-xl font-extrabold text-primary">{emptyCopy.title}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">{emptyCopy.body}</p>
          {filtersActive ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setActiveTag('');
                setPage(1);
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-primary transition hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <X size={14} /> Clear filters
            </button>
          ) : (
            <Link
              to="/community/share"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              <PenLine size={14} /> Write the first journey
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((journey) => (
              <JourneyCard key={journey.slug} journey={journey} />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Journey pagination">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={pagination.page <= 1}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-text-muted transition hover:border-accent hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              {Array.from({ length: pagination.totalPages }).map((_, index) => {
                const pageNumber = index + 1;
                if (pagination.totalPages > 6 && Math.abs(pageNumber - pagination.page) > 2) return null;
                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    aria-current={pageNumber === pagination.page ? 'page' : undefined}
                    className={`h-9 min-w-9 rounded-full px-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-accent ${
                      pageNumber === pagination.page
                        ? 'bg-primary text-white'
                        : 'border border-slate-200 bg-white text-text-muted hover:border-accent hover:text-primary'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-text-muted transition hover:border-accent hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next <ChevronRight size={14} />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
};

export default CommunityPage;
