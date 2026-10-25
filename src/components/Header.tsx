import React from 'react';
import { ShieldCheck, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ isDark, onToggleTheme, title = 'Input' }) => {
  return (
    <header className="sticky top-0 z-40 bg-[var(--nav-bg)]/95 backdrop-blur-xl pt-safe border-b border-[var(--border-main)] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 py-2 sm:px-6 lg:px-8 min-h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="min-w-0">
              <span className="font-bold text-lg sm:text-xl tracking-tight text-[var(--text-primary)]">
                Handover<span className="text-[#315f9f] dark:text-[#8AB4FF]">Guard</span>
              </span>
              <span className="ml-2 text-xs font-semibold text-[var(--text-muted)]">{title}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] hidden sm:block">
              AI-assisted handover notes with audio transcription and structured review
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label="Toggle dark and light mode"
          className="min-h-10 flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-muted)] text-[var(--text-secondary)] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-[#8AB4FF]" />
              <span className="text-xs font-medium hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-[#315f9f] dark:text-[#8AB4FF]" />
              <span className="text-xs font-medium hidden sm:inline">Dark</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
