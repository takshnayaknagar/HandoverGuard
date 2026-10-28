import React, { useState } from 'react';

interface LoginScreenProps {
  rememberedStaffId?: string;
  onLogin: (staffId: string, password: string, department: string) => Promise<void>;
  authMessage?: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  rememberedStaffId = '',
  onLogin,
  authMessage: externalAuthMessage = null,
}) => {
  const [staffId, setStaffId] = useState(rememberedStaffId || 'NUR-84920');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('icu');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberStaffId, setRememberStaffId] = useState(Boolean(rememberedStaffId));
  const [isLoading, setIsLoading] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!staffId.trim() || !password) {
      setAuthFeedback('Enter your Hospital / Staff ID and password to continue.');
      return;
    }
    setIsLoading(true);
    setAuthFeedback(null);
    try {
      await onLogin(staffId.trim(), password, department);
      if (rememberStaffId) localStorage.setItem('handoverguard-staff-id', staffId.trim());
      else localStorage.removeItem('handoverguard-staff-id');
    } catch (error) {
      setAuthFeedback(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col pb-12">
      {/* Brand Hero from mobile/frontend branch */}
      <div className="flex flex-col items-center pb-6 pt-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#131b2e] text-[#dae2fd] shadow-[0px_4px_16px_rgba(19,27,46,0.18)] transition-transform hover:scale-105">
          <span className="material-symbols-outlined material-symbols-fill text-[36px]">
            security
          </span>
        </div>
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          HandoverGuard
        </h1>
        <p className="max-w-[280px] text-sm text-[var(--text-secondary)]">
          AI Shift Handover Assistant for clinical excellence
        </p>
      </div>

      {/* Main Login Card (Frosty White) */}
      <div className="mb-6 flex flex-col gap-5 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-frosty-white)] p-6 shadow-[0px_4px_20px_rgba(30,51,71,0.06)]">
        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
          {/* Hospital / Staff ID with badge icon */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wide text-[var(--text-primary)]">
              Hospital / Staff ID
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined pointer-events-none absolute left-4 text-[20px] text-[var(--text-muted)]">
                badge
              </span>
              <input
                type="text"
                value={staffId}
                onChange={(event) => setStaffId(event.target.value)}
                placeholder="e.g. NUR-84920"
                className="h-12 w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] pl-12 pr-4 text-sm font-normal text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all focus:border-[var(--btn-ice-mint)] focus:bg-[var(--bg-frosty-white)] focus:ring-2 focus:ring-[var(--btn-ice-mint)]"
                required
              />
            </div>
          </div>

          {/* Password with lock and visibility icon toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wide text-[var(--text-primary)]">
              Password
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined pointer-events-none absolute left-4 text-[20px] text-[var(--text-muted)]">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••••••"
                className="h-12 w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] pl-12 pr-12 font-mono text-sm font-normal text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all focus:border-[var(--btn-ice-mint)] focus:bg-[var(--bg-frosty-white)] focus:ring-2 focus:ring-[var(--btn-ice-mint)]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-3 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--btn-ice-mint)]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Department Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wide text-[var(--text-primary)]">
              Department{' '}
              <span className="text-[10px] font-normal text-[var(--text-muted)]">
                Used for display only
              </span>
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined pointer-events-none absolute left-4 text-[20px] text-[var(--text-muted)]">
                local_hospital
              </span>
              <select
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                className="h-12 w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] pl-12 pr-4 text-sm font-normal text-[var(--text-primary)] outline-none transition-all focus:border-[var(--btn-ice-mint)] focus:bg-[var(--bg-frosty-white)] focus:ring-2 focus:ring-[var(--btn-ice-mint)]"
              >
                <option value="icu">Intensive Care Unit (ICU)</option>
                <option value="general">General Ward</option>
                <option value="er">Emergency Room (ER)</option>
                <option value="postop">Post-Op Recovery Surgical</option>
                <option value="cardio">Cardiology Telemetry</option>
              </select>
            </div>
          </div>

          {/* Remember ID & Forgot ID options */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={rememberStaffId}
                onChange={(event) => setRememberStaffId(event.target.checked)}
                className="h-4 w-4 rounded accent-[#4ea899]"
              />
              Remember credentials
            </label>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-xs font-semibold text-[#4ea899] hover:underline"
            >
              Forgot ID?
            </button>
          </div>

          {/* Feedback banner (Frosty White / Soft Ice) */}
          {(externalAuthMessage || authFeedback) && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-3 py-2 text-xs text-[var(--text-primary)]"
            >
              <span className="material-symbols-outlined text-[16px] text-[#4ea899]">
                info
              </span>
              <span>{externalAuthMessage || authFeedback}</span>
            </div>
          )}

          {/* Primary Submit Button in Muted Ice Mint */}
          <button
            type="submit"
            disabled={isLoading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--btn-ice-mint)] text-sm font-bold text-[#102a24] shadow-[0px_4px_14px_rgba(158,216,203,0.45)] transition-all hover:bg-[var(--btn-ice-mint-hover)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[var(--btn-ice-mint)] dark:text-[#0a1b17] dark:hover:bg-[var(--btn-ice-mint-hover)]"
          >
            {isLoading ? (
              <span className="material-symbols-outlined animate-spin text-[18px]">
                progress_activity
              </span>
            ) : (
              <>
                <span>Log In</span>
                <span className="material-symbols-outlined text-[18px]">
                  arrow_forward
                </span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer Legal & Security Note */}
      <p className="mx-auto max-w-[300px] text-center text-xs leading-relaxed text-[var(--text-muted)]">
        For healthcare internal shift communication only. HIPAA compliant encrypted environment.
      </p>

      {/* Forgot ID Modal from mobile/frontend */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-[#006a61]">
                  badge
                </span>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Staff Directory Lookup
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-card-muted)]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="space-y-3 py-4 text-xs text-[var(--text-secondary)]">
              <p>For instant demo access, use this verified clinical credential:</p>
              <div className="flex flex-col gap-1 rounded-xl bg-[var(--bg-card-muted)] p-3 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Staff ID:</span>
                  <span className="font-bold text-[var(--text-primary)]">demo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Password:</span>
                  <span className="text-[var(--text-primary)]">a sufficiently long password</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Department:</span>
                  <span className="text-[#006a61]">ICU West Wing</span>
                </div>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                If your hospital badge is lost or revoked, contact the Clinical Informatics Helpdesk at ext. 4402.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setStaffId('demo');
                setPassword('a sufficiently long password');
                setDepartment('icu');
                setShowForgotModal(false);
              }}
              className="h-10 w-full rounded-xl bg-[#000000] text-xs font-semibold text-white transition-colors hover:bg-neutral-800 dark:bg-[#dae2fd] dark:text-[#131b2e]"
            >
              Autofill Test Credentials
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
