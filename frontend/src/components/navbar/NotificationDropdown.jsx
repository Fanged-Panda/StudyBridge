import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Building2,
  Calendar,
  Bot,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'APPLICATION_DEADLINE':
      return <Calendar className="h-4 w-4 text-amber-600" />;
    case 'RESULT_UPDATE':
      return <Bot className="h-4 w-4 text-emerald-600" />;
    case 'REQUIREMENT_UPDATE':
      return <AlertCircle className="h-4 w-4 text-blue-600" />;
    case 'GENERAL_UNIVERSITY_UPDATE':
    case 'ADMISSION_UPDATE':
    default:
      return <GraduationCap className="h-4 w-4 text-accent" />;
  }
};

const NotificationDropdown = ({
  notifications = [],
  unreadCount = 0,
  loading = false,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose?.();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await onMarkAsRead?.(notif.id);
    }
    onClose?.();

    if (notif.university?.name) {
      navigate(`/universities?search=${encodeURIComponent(notif.university.name)}`);
    } else if (notif.metadata?.actionUrl) {
      navigate(notif.metadata.actionUrl);
    } else {
      navigate('/universities');
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-3 w-80 sm:w-96 rounded-3xl border border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50 animate-fade-in divide-y divide-slate-100"
      style={{ filter: 'drop-shadow(0 20px 30px rgba(26, 43, 72, 0.15))' }}
    >
      {/* Dropdown Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold tracking-tight text-primary">Notifications</h4>
            <p className="text-[11px] font-medium text-slate-500">
              {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:text-accent-teal transition px-2.5 py-1 rounded-full bg-accent/10 hover:bg-accent/15"
            title="Mark all as read"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-[380px] overflow-y-auto no-scrollbar divide-y divide-slate-100">
        {loading && notifications.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-accent mb-2" />
            <p>Loading your updates...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <Building2 className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">No notifications yet</p>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Follow universities on the Universities page to receive admission deadline updates and alerts.
            </p>
          </div>
        ) : (
          notifications.map((notif) => {
            const isUnread = !notif.isRead;
            const uniName = notif.university?.name || notif.metadata?.universityName;

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`group relative flex items-start gap-3.5 p-4 transition cursor-pointer ${
                  isUnread
                    ? 'bg-blue-50/50 hover:bg-blue-50/80'
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                {/* Icon indicator */}
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border ${
                    isUnread
                      ? 'bg-white border-blue-200 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  {getNotificationIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    {uniName && (
                      <span className="text-[11px] font-bold text-accent uppercase tracking-wider truncate">
                        {uniName}
                      </span>
                    )}
                    <span className="text-[10px] font-medium text-slate-400 shrink-0">
                      {formatTimeAgo(notif.createdAt)}
                    </span>
                  </div>

                  <h5
                    className={`mt-0.5 text-xs text-primary line-clamp-1 ${
                      isUnread ? 'font-black' : 'font-semibold'
                    }`}
                  >
                    {notif.title}
                  </h5>

                  <p className="mt-1 text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                </div>

                {/* Unread indicator dot */}
                {isUnread && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Dropdown Footer */}
      <div className="p-3 bg-slate-50/80 text-center">
        <button
          type="button"
          onClick={() => {
            onClose?.();
            navigate('/universities');
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-brand transition"
        >
          Explore Universities
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;
