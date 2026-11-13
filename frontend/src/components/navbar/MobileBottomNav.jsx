import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const EXPLORE_PATHS = ['/universities', '/scholarships', '/professors'];

const items = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/universities', label: 'Explore', icon: 'explore', matches: EXPLORE_PATHS },
  { to: '/wordlab', label: 'WordLab', icon: 'menu_book' },
  { to: '/community', label: 'Community', icon: 'groups' },
  { to: '/chatbot', label: 'Chatbot', icon: 'smart_toy' },
];

const MobileBottomNav = () => {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem('token')));

  useEffect(() => {
    const syncAuth = () => setIsLoggedIn(Boolean(localStorage.getItem('token')));
    window.addEventListener('storage', syncAuth);
    window.addEventListener('authchange', syncAuth);
    syncAuth();
    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('authchange', syncAuth);
    };
  }, []);

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  // Profile is reachable from the avatar in the top bar, not this nav.
  const visibleItems = items.filter((item) => isLoggedIn || item.to !== '/wordlab');

  return (
    <nav className="fixed inset-x-3 bottom-4 z-50 sm:inset-x-6 sm:bottom-6 md:hidden" aria-label="Primary">
      <div className="flex h-16 items-center justify-around rounded-2xl border border-outline/70 bg-white/85 px-1.5 shadow-2xl backdrop-blur-xl">
        {visibleItems.map((item) => {
          const active = item.matches ? item.matches.some((path) => location.pathname.startsWith(path)) : isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center transition-colors ${
                active ? 'text-accent' : 'text-text-muted hover:text-primary'
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontVariationSettings: active
                    ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24"
                    : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                }}
              >
                {item.icon}
              </span>
              <span className={`mt-1 max-w-full truncate px-0.5 text-[9px] sm:text-[10px] ${active ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
