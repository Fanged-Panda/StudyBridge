import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Bell, ShieldAlert } from 'lucide-react';
import { beginLogout } from '../../App';
import api from '../../services/api';
import NotificationDropdown from './NotificationDropdown';
import Button from '../ui/Button';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face';

const HACKER_AVATAR =
  'https://api.dicebear.com/9.x/bottts/svg?seed=CyberHacker&backgroundColor=041d1a';

const getStoredRole = () => {
  try {
    const user = JSON.parse(localStorage.getItem('userProfile') || '{}');
    return user.role || 'student';
  } catch {
    return 'student';
  }
};

const TopNav = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem('token')));
  const [userRole, setUserRole] = useState(getStoredRole());
  const [avatar, setAvatar] = useState(localStorage.getItem('userAvatar') || DEFAULT_AVATAR);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    beginLogout();
    localStorage.removeItem('token');
    localStorage.removeItem('userProfile');
    window.dispatchEvent(new Event('authchange'));
    navigate('/', { replace: true });
  };

  const loadNotifications = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setNotifLoading(true);
      const res = await api.get('/notifications?limit=20');
      if (res.data?.success) {
        setNotifications(res.data.data || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err?.message);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  const loadUnreadCountOnly = useCallback(async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const res = await api.get('/notifications/unread-count');
      if (res.data?.success) {
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      window.dispatchEvent(new Event('notificationchange'));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      window.dispatchEvent(new Event('notificationchange'));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  useEffect(() => {
    const syncAuth = () => {
      const logged = Boolean(localStorage.getItem('token'));
      setIsLoggedIn(logged);
      setUserRole(getStoredRole());
      if (logged) {
        loadNotifications();
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    };
    const syncAvatar = () => setAvatar(localStorage.getItem('userAvatar') || DEFAULT_AVATAR);
    const handleStorage = () => {
      syncAuth();
      syncAvatar();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('authchange', syncAuth);
    window.addEventListener('profileupdate', syncAvatar);
    window.addEventListener('notificationchange', loadNotifications);
    syncAuth();
    syncAvatar();

    // Periodic lightweight polling every 45s while user is logged in
    const interval = setInterval(() => {
      if (localStorage.getItem('token')) {
        loadUnreadCountOnly();
      }
    }, 45000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('authchange', syncAuth);
      window.removeEventListener('profileupdate', syncAvatar);
      window.removeEventListener('notificationchange', loadNotifications);
      clearInterval(interval);
    };
  }, [loadNotifications, loadUnreadCountOnly]);

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

  const effectiveAvatar = userRole === 'admin' ? HACKER_AVATAR : avatar;

  const EXPLORE_PATHS = ['/universities', '/scholarships', '/professors'];

  const navItems =
    userRole === 'admin'
      ? [
          { to: '/', label: 'Home' },
          { to: '/universities', label: 'Explore', matches: EXPLORE_PATHS },
          { to: '/admin', label: 'Admin', isAdminPill: true },
          { to: '/wordlab', label: 'WordLab' },
          { to: '/community', label: 'Community' },
          { to: '/chatbot', label: 'Chatbot' },
        ]
      : [
          { to: '/', label: 'Home' },
          { to: '/universities', label: 'Explore', matches: EXPLORE_PATHS },
          ...(isLoggedIn ? [{ to: '/wordlab', label: 'WordLab' }] : []),
          { to: '/community', label: 'Community' },
          { to: '/chatbot', label: 'Chatbot' },
        ];

  return (
    <header
      className={`glass-nav fixed inset-x-0 top-0 z-50 flex w-full items-center transition-all duration-300 ${
        scrolled ? 'h-16 shadow-sm' : 'h-20'
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-8">
        {/* Logo */}
        <div className="flex flex-1 items-center">
          <Link to="/" className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-primary">
            <img src="/logo-192.png" alt="StudyBridge" className="h-8 w-8 rounded-lg object-contain shadow-xs" />
            <span>StudyBridge</span>
          </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden flex-1 items-center justify-center gap-3 md:flex lg:gap-6">
          {navItems.map((item) => {
            const active = item.matches ? item.matches.some((path) => location.pathname.startsWith(path)) : isActive(item.to);
            if (item.isAdminPill) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-sm font-bold transition shadow-2xs ${
                    active
                      ? 'bg-primary text-white ring-2 ring-primary/20 shadow-xs'
                      : 'border border-slate-300 bg-slate-100/90 text-slate-800 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800'
                  }`}
                >
                  <ShieldAlert className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Admin</span>
                </Link>
              );
            }
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`text-sm font-medium transition-colors ${item.wideOnly ? 'hidden lg:inline-block' : ''} ${
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
        <div className="flex flex-1 items-center justify-end gap-3 sm:gap-4">
          {!isLoggedIn ? (
            <Button
              to="/login"
              variant="primary"
              className="inline-flex rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-opacity-90 sm:px-6 sm:py-2.5 sm:text-sm"
            >
              Get Started
            </Button>
          ) : (
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (!isNotifOpen) {
                      loadNotifications();
                    }
                    setIsNotifOpen(!isNotifOpen);
                  }}
                  className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
                    isNotifOpen
                      ? 'border-accent bg-accent/10 text-accent shadow-xs'
                      : 'border-outline bg-white text-slate-700 shadow-sm hover:border-primary hover:text-primary'
                  }`}
                  aria-label="Notifications"
                  title="Admission updates & notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-black text-white shadow-sm ring-2 ring-white animate-pulse">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <NotificationDropdown
                    notifications={notifications}
                    unreadCount={unreadCount}
                    loading={notifLoading}
                    onClose={() => setIsNotifOpen(false)}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAllAsRead={handleMarkAllAsRead}
                  />
                )}
              </div>

              {userRole === 'admin' ? (
                isActive('/admin') ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-red-300 bg-red-50 text-red-500 shadow-sm transition hover:bg-red-100"
                    aria-label="Sign out"
                    title="Sign out Admin"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                ) : (
                  <Link
                    to="/admin"
                    className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-outline bg-white shadow-sm transition hover:border-primary"
                    aria-label="Admin Portal"
                    title="Admin Portal"
                  >
                    <img src={effectiveAvatar} alt="Admin" className="h-full w-full object-cover" />
                  </Link>
                )
              ) : isActive('/profile') ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-red-300 bg-red-50 text-red-500 shadow-sm transition hover:bg-red-100"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              ) : (
                <Link
                  to="/profile"
                  className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-outline bg-white shadow-sm transition hover:border-primary"
                  aria-label="Open profile"
                  title="View Profile"
                >
                  <img src={effectiveAvatar} alt="" className="h-full w-full object-cover" />
                </Link>
              )}
            </div>
          )}

        </div>
      </div>
    </header>
  );
};

export default TopNav;
