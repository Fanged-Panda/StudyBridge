import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';

// Route-level code splitting: auth + profile load on demand, keeping the Home
// bundle (above-the-fold) as small and fast as possible.
const LoginPage = lazy(() =>
  import('./features/auth').then((mod) => ({ default: mod.LoginPage })),
);
const ProfilePage = lazy(() =>
  import('./features/auth').then((mod) => ({ default: mod.ProfilePage })),
);

// Scrolls to the top whenever the route changes (React Router preserves scroll by default)
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Route guard: redirects to login when there's no auth token
const RequireAuth = ({ children }) => {
  const isLoggedIn = Boolean(localStorage.getItem('token'));
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
};

// Branded fallback shown while a lazy route chunk loads.
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-secondary border-t-accent" />
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">StudyBridge</p>
    </div>
  </div>
);

const EmptyPage = ({ title }) => {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand">StudyBridge</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-primary">{title}</h1>
      <p className="mt-4 max-w-2xl text-slate-600">This section is intentionally empty for now.</p>
    </section>
  );
};

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="universities" element={<EmptyPage title="Universities" />} />
          <Route path="scholarships" element={<EmptyPage title="Scholarships" />} />
          <Route path="quiz" element={<EmptyPage title="Quiz" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
