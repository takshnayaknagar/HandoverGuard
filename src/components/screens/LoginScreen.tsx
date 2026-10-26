import React, { useState } from 'react';

interface LoginScreenProps {
  rememberedStaffId?: string;
  onLogin: (staffId: string, password: string, department: string) => Promise<void>;
  authMessage?: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ rememberedStaffId = '', onLogin,authMessage: externalAuthMessage = null,
 }) => {
  const [staffId, setStaffId] = useState(rememberedStaffId);
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('icu');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberStaffId, setRememberStaffId] = useState(Boolean(rememberedStaffId));
  const [isLoading, setIsLoading] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!staffId.trim() || !password) {
      setAuthFeedback('Enter your Staff ID and password to continue.');
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
      <div className="flex flex-col items-center pb-6 pt-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] text-[var(--text-primary)]"><span className="material-symbols-outlined text-[36px]">security</span></div>
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-[var(--text-primary)]">HandoverGuard</h1>
        <p className="max-w-[280px] text-sm text-[var(--text-secondary)]">AI-assisted shift handover review</p>
      </div>
      <div className="mb-6 flex flex-col gap-5 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-6 shadow-sm">
        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-[var(--text-primary)]">Hospital / Staff ID<input value={staffId} onChange={(event) => setStaffId(event.target.value)} placeholder="Enter your Staff ID" className="h-12 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-4 text-sm font-normal text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[#8AB4FF]" required /></label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-[var(--text-primary)]">Password<span className="relative"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="h-12 w-full rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-4 pr-12 text-sm font-normal text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[#8AB4FF]" required /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]" aria-label={showPassword ? 'Hide password' : 'Show password'}><span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span></button></span></label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-[var(--text-primary)]">Department <span className="text-[10px] font-normal text-[var(--text-muted)]">Used for display only</span><select value={department} onChange={(event) => setDepartment(event.target.value)} className="h-12 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-4 text-sm font-normal text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[#8AB4FF]"><option value="icu">Intensive Care Unit (ICU)</option><option value="general">General Ward</option><option value="er">Emergency Room (ER)</option><option value="postop">Post-Op Recovery Surgical</option><option value="cardio">Cardiology Telemetry</option></select></label>
          <div className="flex items-center justify-between gap-3 pt-1"><label className="flex cursor-pointer select-none items-center gap-2 text-sm text-[var(--text-secondary)]"><input type="checkbox" checked={rememberStaffId} onChange={(event) => setRememberStaffId(event.target.checked)} className="h-4 w-4 accent-[#8AB4FF]" />Remember Staff ID</label><span className="text-right text-xs text-[var(--text-muted)]">Forgot ID? Contact your system administrator.</span></div>
          {(externalAuthMessage || authFeedback) && (
          <div
            role="alert"
            className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-3 py-2 text-xs text-[var(--text-primary)]"
            >
          {externalAuthMessage || authFeedback}
          </div>
          )}
          <button type="submit" disabled={isLoading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#8AB4FF] text-sm font-semibold text-[#050505] transition-colors hover:bg-[#a9c8ff] disabled:cursor-not-allowed disabled:opacity-50">{isLoading ? 'Signing in...' : 'Log In'}</button>
        </form>
      </div>
      <p className="mx-auto max-w-[300px] text-center text-xs leading-relaxed text-[var(--text-muted)]">For authorised staff use. Review all generated handover information before use.</p>
    </div>
  );
};
