import { useEffect, useState, useRef, useCallback } from 'react';
import { Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { getCache, setCache } from '../../services/pageCache';
import { initialUniversities, initialScholarships } from '../../data/initialData';

const words = ['University', 'Scholarship', 'Professor', 'Country'];

const formatCount = (n) => `${(Math.floor(n / 10) * 10).toLocaleString()}+`;

const TypewriterHero = () => {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const [counts, setCounts] = useState(() => {
    const cached = getCache('home:stats');
    return {
      universities: cached?.universityCount ?? (initialUniversities.length || 50),
      scholarships: cached?.scholarshipCount ?? (initialScholarships.length || 10),
      students: cached?.studentCount ?? 10,
    };
  });

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    if (getCache('home:stats')) return undefined;
    api.get('/stats')
      .then((res) => {
        const d = res.data?.data;
        if (d) {
          setCache('home:stats', d);
          setCounts({
            universities: d.universityCount ?? initialUniversities.length,
            scholarships: d.scholarshipCount ?? initialScholarships.length,
            students: d.studentCount ?? 10,
          });
        }
      })
      .catch(() => {});
    return undefined;
  }, []);

  useEffect(() => {
    const activeWord = words[wordIndex % words.length];
    const typingSpeed = isDeleting ? 55 : 95;

    const timeout = window.setTimeout(() => {
      if (!isDeleting && displayText === activeWord) {
        window.setTimeout(() => setIsDeleting(true), 1000);
        return;
      }

      if (isDeleting && displayText === '') {
        window.setTimeout(() => {
          setIsDeleting(false);
          setWordIndex((current) => (current + 1) % words.length);
        }, 1000);
        return;
      }

      setDisplayText((current) => {
        const nextValue = isDeleting ? activeWord.slice(0, current.length - 1) : activeWord.slice(0, current.length + 1);
        return nextValue;
      });
    }, typingSpeed);

    return () => window.clearTimeout(timeout);
  }, [displayText, isDeleting, wordIndex]);

  // Fetch search results from universities, scholarships and professors
  const fetchResults = useCallback((searchQuery) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    Promise.all([
      api.get('/universities', { params: { search: searchQuery, limit: 5 } }).catch(() => null),
      api.get('/scholarships', { params: { search: searchQuery, limit: 5 } }).catch(() => null),
      api.get('/professors', { params: { search: searchQuery, limit: 5 } }).catch(() => null),
    ]).then(([uniRes, schRes, profRes]) => {
      let unis = uniRes?.data?.data;
      if (!Array.isArray(unis) || unis.length === 0) {
        unis = initialUniversities.filter(
          (u) => u.name.toLowerCase().includes(q) || u.country.toLowerCase().includes(q)
        ).slice(0, 5);
      }
      let schs = schRes?.data?.data;
      if (!Array.isArray(schs) || schs.length === 0) {
        schs = initialScholarships.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.country.toLowerCase().includes(q) ||
            (s.eligibility && s.eligibility.toLowerCase().includes(q))
        ).slice(0, 5);
      }

      const profs = Array.isArray(profRes?.data?.data?.items) ? profRes.data.data.items : [];

      const uniResults = unis.map((u) => ({
        id: u.id,
        name: u.name,
        category: 'University',
        link: `/universities?search=${encodeURIComponent(u.name)}`,
        state: { universityId: u.id, search: u.name },
      }));
      const schResults = schs.map((s) => ({
        id: s.id,
        name: s.name,
        category: 'Scholarship',
        link: `/scholarships?search=${encodeURIComponent(s.name)}`,
        state: { scholarshipId: s.id, search: s.name },
      }));
      const profResults = profs.map((p) => ({
        id: p.id,
        name: p.name,
        category: 'Professor',
        link: `/professors?search=${encodeURIComponent(p.name)}`,
        state: { search: p.name },
      }));

      // Sort so prefix matches on item name rank highest
      const combined = [...uniResults, ...schResults, ...profResults].sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q);
        const bStarts = b.name.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });

      setResults(combined);
      setShowDropdown(true);
      setHighlightIdx(-1);
    });
  }, []);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchResults(val), 200);
  };

  const handleSearchSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed) {
      navigate('/universities');
      return;
    }

    if (highlightIdx >= 0 && results[highlightIdx]) {
      const r = results[highlightIdx];
      navigate(r.link, { state: r.state });
    } else {
      const topResult = results[0];
      if (topResult && topResult.category === 'Scholarship') {
        navigate(`/scholarships?search=${encodeURIComponent(trimmed)}`, { state: { search: trimmed } });
      } else if (topResult && topResult.category === 'Professor') {
        navigate(`/professors?search=${encodeURIComponent(trimmed)}`, { state: { search: trimmed } });
      } else {
        navigate(`/universities?search=${encodeURIComponent(trimmed)}`, { state: { search: trimmed } });
      }
    }
    setShowDropdown(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className="relative pt-24 pb-32">
      <div className="mx-auto max-w-[1200px] px-8 text-center relative z-10">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
          <span className="material-symbols-outlined text-sm">star</span>
          Your future starts here
        </div>

        {/* Headline with typewriter */}
        <h1 className="mx-auto mb-8 max-w-4xl text-5xl font-extrabold leading-[1.1] tracking-tight text-primary md:text-6xl">
          Find Your Perfect
          <br />
          <span className="text-accent" style={{ fontFamily: '"Kaushan Script", cursive' }}>
            {displayText}
            <span className="ml-1 animate-pulse" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>|</span>
          </span>
        </h1>

        <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-text-muted">
          Navigate your academic journey with confidence. Discover world-class institutions,
          specialized scholarships, and expert mentorship tailored to your ambitions.
        </p>

        {/* Search Bar */}
        <div ref={searchRef} className="academic-shadow mx-auto mb-20 max-w-3xl relative">
          <div className={`flex items-center gap-2 rounded-2xl border-2 bg-white p-1.5 transition-all duration-200 md:flex-row ${searchFocused ? 'border-accent shadow-[0_0_0_4px_rgba(38,166,154,0.15)]' : 'border-transparent shadow-[0_0_0_1px_rgba(203,213,225,0.5)]'}`}>
            <div className="flex w-full flex-1 items-center gap-3 px-4">
              <Search className="h-5 w-5 text-text-muted shrink-0" />
              <input
                type="text"
                className="w-full border-none bg-transparent py-3 text-sm placeholder:text-text-muted focus:outline-none focus:ring-0 md:py-4 md:text-base"
                placeholder="Search universities, scholarships, or professors..."
                value={query}
                onChange={handleQueryChange}
                onKeyDown={handleKeyDown}
                onFocus={() => { setSearchFocused(true); if (query.trim() && results.length > 0) setShowDropdown(true); }}
                onBlur={() => setSearchFocused(false)}
              />
            </div>
            <div className="hidden h-8 w-px bg-outline md:block" />
            <button
              type="button"
              onClick={handleSearchSubmit}
              className="shrink-0 whitespace-nowrap rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-all hover:bg-opacity-90 md:px-10 md:py-4 md:text-base"
            >
              <span className="md:hidden">Explore</span>
              <span className="hidden md:inline">Start Exploring</span>
            </button>
          </div>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-outline bg-white shadow-xl">
              {results.length > 0 ? (
                results.map((r, idx) => (
                  <button
                    key={`${r.category}-${r.id}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      navigate(r.link, { state: r.state });
                      setShowDropdown(false);
                    }}
                    onMouseEnter={() => setHighlightIdx(idx)}
                    className={`flex w-full items-center justify-between px-5 py-3 text-left transition-colors ${
                      idx === highlightIdx ? 'bg-secondary' : 'hover:bg-background'
                    }`}
                  >
                    <span className="truncate text-sm font-semibold text-primary">{r.name}</span>
                    <span
                      className={`ml-3 shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        r.category === 'University'
                          ? 'bg-blue-50 text-blue-600'
                          : r.category === 'Professor'
                            ? 'bg-violet-50 text-violet-600'
                            : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {r.category}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-5 py-4 text-center text-sm text-text-muted">
                  No match found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 md:grid-cols-3">
          <div className="academic-shadow-hover rounded-2xl border border-outline bg-white p-8 transition-all">
            <div className="mb-2 text-4xl font-extrabold text-primary">{counts.universities != null ? formatCount(counts.universities) : '—'}</div>
            <div className="text-sm font-semibold uppercase tracking-widest text-text-muted">Universities</div>
          </div>
          <div className="academic-shadow-hover rounded-2xl border border-outline bg-white p-8 transition-all">
            <div className="mb-2 text-4xl font-extrabold text-primary">{counts.scholarships != null ? formatCount(counts.scholarships) : '—'}</div>
            <div className="text-sm font-semibold uppercase tracking-widest text-text-muted">Scholarships</div>
          </div>
          <div className="academic-shadow-hover rounded-2xl border border-outline bg-white p-8 transition-all">
            <div className="mb-2 text-4xl font-extrabold text-primary">{counts.students != null ? formatCount(counts.students) : '—'}</div>
            <div className="text-sm font-semibold uppercase tracking-widest text-text-muted">Students Guided</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TypewriterHero;
