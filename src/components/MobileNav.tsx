import React from 'react';
import { Download, LayoutDashboard, LogIn, Mic } from 'lucide-react';

interface MobileNavProps {
  activeScreen: 'login' | 'input' | 'dashboard' | 'export' | 'saved';
  isAuthenticated: boolean;
  onLogin: () => void;
  onInput: () => void;
  onResult: () => void;
  onExport: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeScreen,
  isAuthenticated,
  onLogin,
  onInput,
  onResult,
  onExport
}) => {
  return (
    <nav
      aria-label="Mobile application navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-main)] bg-[var(--nav-bg)] pb-safe shadow-[0_-1px_12px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:hidden"
    >
      <div className="mx-auto flex h-20 max-w-lg items-center justify-around px-1">
        {!isAuthenticated && (
          <button
            type="button"
            onClick={onLogin}
            aria-current={activeScreen === 'login' ? 'page' : undefined}
            aria-label="Open login placeholder"
            className={`relative flex h-16 min-w-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition-all duration-150 hover:bg-[var(--bg-card-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86d2c1] ${activeScreen === 'login' ? 'scale-105 font-semibold text-[#4ea899] dark:text-[#86d2c1]' : 'text-[var(--text-secondary)]'}`}
          >
            <LogIn className="h-5 w-5" aria-hidden="true" />
            <span className="text-[10px] font-medium leading-none">Login</span>
          </button>
        )}
        <button
          type="button"
          onClick={onInput}
          aria-current={activeScreen === 'input' ? 'page' : undefined}
          className={`relative flex h-16 min-w-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition-all duration-150 hover:bg-[var(--bg-card-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86d2c1] ${activeScreen === 'input' ? 'scale-105 font-semibold text-[#4ea899] dark:text-[#86d2c1]' : 'text-[var(--text-secondary)]'}`}
        >
          <Mic className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] font-medium leading-none">Voice Note</span>
        </button>

        <button
          type="button"
          onClick={onResult}
          aria-label="View dashboard"
          aria-current={activeScreen === 'dashboard' ? 'page' : undefined}
          className={`relative flex h-16 min-w-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition-all duration-150 hover:bg-[var(--bg-card-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86d2c1] ${activeScreen === 'dashboard' ? 'scale-105 font-semibold text-[#4ea899] dark:text-[#86d2c1]' : 'text-[var(--text-secondary)]'}`}
        >
          <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] font-medium leading-none">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={onExport}
          aria-current={activeScreen === 'export' ? 'page' : undefined}
          aria-label="Open exports"
          className={`relative flex h-16 min-w-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 transition-all duration-150 hover:bg-[var(--bg-card-muted)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86d2c1] ${activeScreen === 'export' ? 'scale-105 font-semibold text-[#4ea899] dark:text-[#86d2c1]' : 'text-[var(--text-secondary)]'}`}
        >
          <Download className="h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] font-medium leading-none">Export</span>
        </button>
      </div>
    </nav>
  );
};
