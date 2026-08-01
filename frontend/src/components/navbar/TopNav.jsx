import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut } from 'lucide-react';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face';
import Button from '../ui/Button';
import ScrollPlaneProgress from '../common/ScrollPlaneProgress';

const items = [
  { to: '/', label: 'Home' },
  { to: '/universities', label: 'University' },
  { to: '/profile', label: 'Profile' },
  { to: '/scholarships', label: 'Scholarship' },
  { to: '/quiz', label: 'Quiz' },
];

const TopNav = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem('token')));
  const [avatar, setAvatar] = useState(localStorage.getItem('userAvatar') || DEFAULT_AVATAR);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userProfile');
    window.dispatchEvent(new Event('authchange'));
    navigate('/');
  };

  useEffect(() => {
    const syncAuth = () => setIsLoggedIn(Boolean(localStorage.getItem('token')));
    const syncAvatar = () => setAvatar(localStorage.getItem('userAvatar') || DEFAULT_AVATAR);
    const handleStorage = () => {
      syncAuth();
      syncAvatar();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('authchange', syncAuth);
    window.addEventListener('profileupdate', syncAvatar);
    syncAuth();
    syncAvatar();

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('authchange', syncAuth);
      window.removeEventListener('profileupdate', syncAvatar);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header
      className={`glass-nav fixed inset-x-0 top-0 z-50 flex w-full items-center transition-all duration-300 ${
        scrolled ? 'h-16 shadow-sm' : 'h-20'
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-8">
        {/* Logo */}
        <div className="flex flex-1 items-center">
          <Link to="/" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-primary">
            <GraduationCap className="h-8 w-8 text-primary" strokeWidth={2.25} />
            StudyBridge
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden flex-1 items-center justify-center gap-10 md:flex">
          {items.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`text-sm font-medium transition-colors ${
                  active
                    ? 'font-semibold text-primary'
                    : 'text-text-muted hover:text-primary'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right */}
        <div className="flex flex-1 items-center justify-end gap-3">
          {!isLoggedIn ? (
            <Button
              to="/login"
              variant="primary"
              className="inline-flex rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-opacity-90 sm:px-6"
            >
              Get Started
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              {isActive('/profile') ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-red-300 bg-red-50 text-red-500 shadow-sm transition hover:bg-red-100"
                  aria-label="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              ) : (
                <Link
                  to="/profile"
                  className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-outline bg-white shadow-sm transition hover:border-primary"
                  aria-label="Open profile"
                >
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
                </Link>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Plane scroll indicator — KEPT from original */}
      <ScrollPlaneProgress />
    </header>
  );
};

export default TopNav;
