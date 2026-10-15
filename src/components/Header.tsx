import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Activity, Bell, Sun, Moon, CheckCheck, Info, AlertTriangle, X } from 'lucide-react';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Ward 4B Handover Due',
    message: 'Evening shift handover begins in 15 mins. Please ensure all audio dictations are submitted.',
    time: '5m ago',
    type: 'warning',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'Troponin Lab Available',
    message: 'Pathology has uploaded cardiac enzyme panel for Bed 12 (John Doe).',
    time: '20m ago',
    type: 'info',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'AI Verification System Ready',
    message: 'ISBAR v2.4 clinical guardrail protocols synced successfully with hospital registry.',
    time: '1h ago',
    type: 'success',
    read: true,
  },
];

export const Header: React.FC<HeaderProps> = ({ isDark, onToggleTheme }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const removeNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[#edae49] shrink-0" />;
      case 'success':
        return <CheckCheck className="w-4 h-4 text-emerald-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-[#00798c] dark:text-[#38bdf8] shrink-0" />;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--nav-bg)] backdrop-blur-md border-b border-[var(--border-main)] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#00798c] flex items-center justify-center text-white shadow-md shadow-[#00798c]/25">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight text-[var(--text-primary)]">
                Handover<span className="text-[#00798c] dark:text-[#38bdf8]">Guard</span>
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#00798c]/10 text-[#00798c] dark:bg-[#00798c]/20 dark:text-[#38bdf8] border border-[#00798c]/25">
                Clinical AI Handover
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] hidden sm:block">
              Zero-loss clinical handover notes with audio transcription & safety guardrails
            </p>
          </div>
        </div>

        {/* Status / Shift indicator, Dark/Light Toggle & Functional Notifications */}
        <div className="flex items-center gap-3 sm:gap-4 text-sm">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-card-muted)] text-[var(--text-secondary)] border border-[var(--border-main)]">
            <Activity className="w-4 h-4 text-[#00798c] dark:text-[#38bdf8] animate-pulse" />
            <span className="font-medium text-xs">Ward 4B • Acute Medical</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-medium">System Ready</span>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle Dark and Light Mode"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-muted)] text-[var(--text-secondary)] shadow-xs transition-all cursor-pointer"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-[#edae49]" />
                <span className="text-xs font-medium hidden sm:inline text-[#edae49]">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-[#30638e]" />
                <span className="text-xs font-medium hidden sm:inline text-[#30638e]">Dark</span>
              </>
            )}
          </button>

          {/* Notification Dropdown Container */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-label="Clinical Notifications"
              className={`relative p-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-muted)] text-[var(--text-secondary)] transition-all cursor-pointer ${
                isOpen ? 'ring-2 ring-[#00798c]/30 border-[#00798c]' : ''
              }`}
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-[#d1495b] text-[10px] font-bold text-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover Panel */}
            {isOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-3 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-card-muted)]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[var(--text-primary)]">Clinical Alerts</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#d1495b]/15 text-[#d1495b]">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-[11px] font-medium text-[#00798c] dark:text-[#38bdf8] hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border-main)]">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[var(--text-muted)] italic">
                      No notifications right now
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => markAsRead(item.id)}
                        className={`p-3.5 flex items-start gap-3 hover:bg-[var(--bg-card-muted)]/60 cursor-pointer transition-colors ${
                          !item.read ? 'bg-[#00798c]/5' : ''
                        }`}
                      >
                        <div className="mt-0.5">{getIcon(item.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <p className={`text-xs font-semibold truncate ${item.read ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                              {item.title}
                            </p>
                            <span className="text-[10px] text-[var(--text-muted)] shrink-0 font-mono">
                              {item.time}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                            {item.message}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => removeNotification(item.id, e)}
                          className="text-[var(--text-muted)] hover:text-[#d1495b] p-0.5 rounded transition-colors"
                          title="Dismiss"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 py-2 bg-[var(--bg-card-muted)]/50 border-t border-[var(--border-main)] text-center text-[11px] text-[var(--text-muted)]">
                  Real-time Ward 4B Broadcast Feed
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
