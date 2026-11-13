import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { flushSync } from 'react-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import ExplorePage from './pages/explore/ExplorePage';
import VocabularyPage from './pages/vocabulary/VocabularyPage';
import CommunityPage from './pages/community/CommunityPage';
import JourneyDetailPage from './pages/community/JourneyDetailPage';
import SubmitJourneyPage from './pages/community/SubmitJourneyPage';
import ManageJourneyPage from './pages/community/ManageJourneyPage';
import { LoginPage, ProfilePage } from './features/auth';
import { ChatbotPage } from './features/ai';

import AdminDashboard from './pages/admin/AdminDashboard';

// Profile sits after the last top-nav link so it always enters from the right
// and, when leaving it, exits to the right.
const NAV_ORDER = ['/', '/universities', '/professors', '/scholarships', '/wordlab', '/community', '/chatbot', '/admin', '/profile'];

const getNavIndex = (pathname) => {
  const legacyWordLab =
    pathname.startsWith('/exam') || pathname.startsWith('/quiz') || pathname.startsWith('/vocabulary');
  const normalized = legacyWordLab ? '/wordlab' : pathname;
  const index = NAV_ORDER.findIndex((path) => {
    if (path === '/') return normalized === '/';
    return normalized.startsWith(path);
  });
  return index !== -1 ? index : 999;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

let isLoggingOut = false;
export const beginLogout = () => { isLoggingOut = true; };
export const endLogout = () => { isLoggingOut = false; };

const RequireAuth = ({ children }) => {
  const isLoggedIn = Boolean(localStorage.getItem('token'));
  const location = useLocation();

  if (!isLoggedIn && !isLoggingOut) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};

// Profile guard: If an administrator accesses /profile, redirect them to /admin
const ProfileOrAdminGuard = () => {
  try {
    const u = JSON.parse(localStorage.getItem('userProfile') || '{}');
    if (u.role === 'admin' || u.email === 'admin@studybridge.com') {
      return <Navigate to="/admin" replace />;
    }
  } catch {}
  return <ProfilePage />;
};

// Admin route guard: redirects to login or home if not an admin
const RequireAdmin = ({ children }) => {
  const isLoggedIn = Boolean(localStorage.getItem('token'));
  let role = 'student';
  try {
    const u = JSON.parse(localStorage.getItem('userProfile') || '{}');
    role = u.role || 'student';
  } catch {
    role = 'student';
  }

  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
};

const EmptyPage = ({ title }) => {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">StudyBridge</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-primary">{title}</h1>
      <p className="mt-4 max-w-2xl text-slate-600">This section is intentionally empty for now.</p>
    </section>
  );
};

const EXPLORE_ROUTE_PATHS = new Set(['/universities', '/scholarships', '/professors']);

const ViewTransitionRoutes = () => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const prevPathRef = useRef(location.pathname);

  useLayoutEffect(() => {
    if (
      location.pathname === displayLocation.pathname &&
      location.search === displayLocation.search &&
      location.hash === displayLocation.hash
    ) return;

    const prevPath = prevPathRef.current;
    const nextPath = location.pathname;

    // Tabs inside Explore share one page; switching them should swap content
    // in place without a page transition.
    if (EXPLORE_ROUTE_PATHS.has(prevPath) && EXPLORE_ROUTE_PATHS.has(nextPath)) {
      prevPathRef.current = nextPath;
      setDisplayLocation(location);
      return;
    }

    // Skip slide transitions for /login for instant, stable rendering
    if (prevPath === '/login' || nextPath === '/login' || nextPath.startsWith('/login')) {
      prevPathRef.current = nextPath;
      setDisplayLocation(location);
      return;
    }

    const prevIdx = getNavIndex(prevPath);
    const nextIdx = getNavIndex(nextPath);
    const direction = nextIdx >= prevIdx ? 'slide-forward' : 'slide-backward';
    prevPathRef.current = nextPath;

    if (
      typeof document !== 'undefined' &&
      'startViewTransition' in document &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      document.documentElement.classList.remove('slide-forward', 'slide-backward');
      document.documentElement.classList.add(direction);
      const transition = document.startViewTransition(() => {
        flushSync(() => {
          setDisplayLocation(location);
        });
      });
      transition.finished.finally(() => {
        document.documentElement.classList.remove('slide-forward', 'slide-backward');
      });
    } else {
      setDisplayLocation(location);
    }
  }, [location, displayLocation]);

  return (
    <Routes location={displayLocation}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/*" element={<LoginPage />} />
      <Route element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="profile" element={<RequireAuth><ProfileOrAdminGuard /></RequireAuth>} />
        <Route path="explore" element={<Navigate to="/universities" replace />} />
        <Route path="universities" element={<ExplorePage />} />
        <Route path="scholarships" element={<ExplorePage />} />
        <Route path="professors" element={<ExplorePage />} />
        <Route path="wordlab" element={<RequireAuth><VocabularyPage /></RequireAuth>} />
        <Route path="vocabulary" element={<Navigate to="/wordlab" replace />} />
        <Route path="community" element={<CommunityPage />} />
        <Route path="community/share" element={<RequireAuth><SubmitJourneyPage /></RequireAuth>} />
        <Route path="community/manage/:token" element={<ManageJourneyPage />} />
        <Route path="community/:slug" element={<JourneyDetailPage />} />
        <Route path="exam" element={<Navigate to="/wordlab" replace />} />
        <Route path="quiz" element={<Navigate to="/wordlab" replace />} />
        <Route path="chatbot" element={<RequireAuth><ChatbotPage /></RequireAuth>} />
        <Route path="admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ViewTransitionRoutes />
    </BrowserRouter>
  );
}

export default App;
