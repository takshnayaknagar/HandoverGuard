import React from 'react';
import { ShieldCheck, Sun, Moon, Settings, LogOut } from 'lucide-react';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onRequestSignOut?: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({ isDark, onToggleTheme, onRequestSignOut, title = 'Input' }) => {
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[var(--nav-bg)]/95 backdrop-blur-xl pt-safe border-b border-[var(--border-main)] transition-colors duration-200">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#131b2e] text-[#dae2fd] shadow-sm sm:h-10 sm:w-10 dark:bg-[var(--bg-card-muted)] dark:text-[var(--text-primary)]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="min-w-0">
              <span className="text-lg font-bold tracking-tight text-[var(--text-primary)] sm:text-xl">
                Handover<span className="text-[#315f9f] dark:text-[#8AB4FF]">Guard</span>
              </span>
              <span className="ml-2 text-xs font-semibold text-[var(--text-muted)]">{title}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] hidden sm:block">
              AI-assisted handover notes with audio transcription and structured review
            </p>
          </div>
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsSettingsOpen((open) => !open)}
            aria-label="Open settings"
            aria-expanded={isSettingsOpen}
            aria-haspopup="menu"
            className="flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] px-2.5 py-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-card-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </button>

          {isSettingsOpen && (
            <>
              <button
                type="button"
                aria-label="Close settings"
                className="fixed inset-0 z-40 cursor-default bg-transparent"
                onClick={() => setIsSettingsOpen(false)}
              />
              <div className="absolute right-0 top-12 z-50 w-52 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-2 shadow-xl" role="menu" aria-label="Settings menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onToggleTheme();
                    setIsSettingsOpen(false);
                  }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-card-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]"
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <span>{isDark ? 'Use light mode' : 'Use dark mode'}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    onRequestSignOut?.();
                  }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-card-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
