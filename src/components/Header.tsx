import React from 'react';
import { ShieldCheck, Activity, Bell, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isDark, onToggleTheme }) => {
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

        {/* Status / Shift indicator & Dark/Light Toggle */}
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

          <button
            type="button"
            className="p-1.5 rounded-lg hover:bg-[var(--bg-card-muted)] text-[var(--text-muted)] transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
