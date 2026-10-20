import React, { useState } from 'react';
import { ShiftInfo } from '../../types/clinical';

interface LoginScreenProps {
  shiftInfo: ShiftInfo;
  onLoginSuccess: (nurseId: string, department: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ shiftInfo, onLoginSuccess }) => {
  const [staffId, setStaffId] = useState(shiftInfo.nurseId || 'NUR-84920');
  const [password, setPassword] = useState('clinicalPass2026!');
  const [department, setDepartment] = useState('icu');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId.trim()) {
      setAuthFeedback('Please enter your Hospital / Staff ID');
      return;
    }
    setIsLoading(true);
    setAuthFeedback('Verifying credentials against hospital directory...');

    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(staffId, department);
    }, 700);
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto pb-12">
      {/* Brand Hero */}
      <div className="flex flex-col items-center text-center pt-8 pb-6">
        <div className="w-16 h-16 rounded-2xl bg-[#131b2e] flex items-center justify-center shadow-[0px_4px_16px_rgba(19,27,46,0.18)] mb-4 text-[#dae2fd] transition-transform hover:scale-105">
          <span className="material-symbols-outlined text-[36px] material-symbols-fill">
            security
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[#191c1e] tracking-tight mb-1">
          HandoverGuard
        </h1>
        <p className="text-sm text-[#45464d] max-w-[280px]">
          AI Shift Handover Assistant for clinical excellence
        </p>
      </div>

      {/* Main Login Card */}
      <div className="bg-white rounded-2xl p-6 shadow-[0px_2px_12px_rgba(15,23,42,0.06)] border border-[#eceef0]/60 flex flex-col gap-5 mb-6">
        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
          {/* Hospital / Staff ID */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#191c1e]">
              Hospital / Staff ID
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-4 text-[#76777d] text-[20px] pointer-events-none">
                badge
              </span>
              <input
                type="text"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="e.g. NUR-84920"
                className="w-full h-12 pl-12 pr-4 bg-[#f2f4f6] rounded-xl text-sm text-[#191c1e] placeholder:text-[#76777d] focus:outline-none focus:ring-2 focus:ring-[#000000] focus:bg-white transition-all border border-transparent focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#191c1e]">
              Password
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-4 text-[#76777d] text-[20px] pointer-events-none">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-12 pl-12 pr-12 bg-[#f2f4f6] rounded-xl text-sm text-[#191c1e] placeholder:text-[#76777d] focus:outline-none focus:ring-2 focus:ring-[#000000] focus:bg-white transition-all border border-transparent focus:border-transparent font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-[#76777d] hover:text-[#191c1e] flex items-center justify-center w-8 h-8 rounded transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Department Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#191c1e]">
              Department
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-4 text-[#76777d] text-[20px] pointer-events-none">
                local_hospital
              </span>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-12 pl-12 pr-10 bg-[#f2f4f6] rounded-xl text-sm text-[#191c1e] appearance-none focus:outline-none focus:ring-2 focus:ring-[#000000] focus:bg-white transition-all cursor-pointer border border-transparent"
              >
                <option value="icu">Intensive Care Unit (ICU)</option>
                <option value="general">General Ward</option>
                <option value="er">Emergency Room (ER)</option>
                <option value="postop">Post-Op Recovery Surgical</option>
                <option value="cardio">Cardiology Telemetry</option>
              </select>
              <span className="material-symbols-outlined absolute right-4 text-[#76777d] text-[20px] pointer-events-none">
                expand_more
              </span>
            </div>
          </div>

          {/* Remember credentials and Forgot ID */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-black focus:ring-black border-[#c6c6cd] cursor-pointer accent-[#000000]"
              />
              <span className="text-sm text-[#45464d]">
                Remember credentials
              </span>
            </label>
            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-xs font-semibold text-[#006a61] hover:underline"
            >
              Forgot ID?
            </button>
          </div>

          {/* Feedback message banner */}
          {authFeedback && (
            <div className="px-3 py-2 rounded-lg bg-[#dae2fd]/60 text-[#131b2e] text-xs flex items-center gap-2 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-[16px] animate-spin">
                sync
              </span>
              <span>{authFeedback}</span>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-[#000000] text-white font-medium text-sm rounded-xl flex items-center justify-center gap-2 shadow-[0px_4px_12px_rgba(0,0,0,0.15)] hover:bg-neutral-800 active:scale-[0.99] transition-all cursor-pointer mt-1 disabled:opacity-50"
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
      <div className="mt-auto pt-4 text-center">
        <p className="text-xs text-[#76777d] max-w-[280px] mx-auto leading-relaxed">
          For healthcare internal shift communication only. HIPAA compliant encrypted environment.
        </p>
      </div>

      {/* Forgot ID Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#eceef0]">
            <div className="flex items-center justify-between pb-3 border-b border-[#eceef0]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006a61] text-[22px]">badge</span>
                <h3 className="text-base font-bold text-[#191c1e]">Staff Directory Lookup</h3>
              </div>
              <button 
                onClick={() => setShowForgotModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#76777d] hover:bg-[#eceef0]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="py-4 text-xs text-[#45464d] space-y-3">
              <p>For instant demo access, use this verified clinical badge credential:</p>
              <div className="p-3 bg-[#f2f4f6] rounded-xl flex flex-col gap-1 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-[#76777d]">Staff ID:</span>
                  <span className="font-bold text-[#191c1e]">NUR-84920</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#76777d]">Name:</span>
                  <span className="text-[#191c1e]">Sarah Jenkins, RN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#76777d]">Department:</span>
                  <span className="text-[#006a61]">ICU West Wing</span>
                </div>
              </div>
              <p className="text-[11px] text-[#76777d]">
                If your hospital badge is lost or revoked, contact the Clinical Informatics Helpdesk at ext. 4402.
              </p>
            </div>
            <button
              onClick={() => {
                setStaffId('NUR-84920');
                setDepartment('icu');
                setShowForgotModal(false);
              }}
              className="w-full h-10 bg-[#000000] text-white rounded-xl text-xs font-semibold hover:bg-neutral-800 transition-colors"
            >
              Autofill Demo Credentials
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
