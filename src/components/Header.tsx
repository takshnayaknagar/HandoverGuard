import React, { useState } from 'react';
import { ShiftInfo } from '../types/clinical';

interface HeaderProps {
  title: string;
  shiftInfo: ShiftInfo;
  onLogout?: () => void;
  onNavigate?: (screen: string) => void;
  onSwitchView?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, shiftInfo, onLogout, onNavigate, onSwitchView }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <>
      <header className="sticky top-0 inset-x-0 z-40 bg-[#f7f9fb]/90 backdrop-blur-xl pt-safe border-b border-[#eceef0]/80 transition-all">
        <div className="h-16 px-4 flex items-center justify-between max-w-5xl mx-auto">
          {/* Logo & Screen Title */}
          <div 
            onClick={() => onNavigate && onNavigate('dashboard')}
            className="flex items-center gap-2 cursor-pointer select-none group"
            title="HandoverGuard - Go to Dashboard"
          >
            <div className="h-8 w-8 flex items-center justify-center shrink-0">
              <img
                alt="HandoverGuard Shield Logo"
                className="h-8 w-auto object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAoR5Tj7CYgvty1JF1sUSpgO1e2WAu7kF3kKvxTXHVXUDjMnLlxYRNg9EKXMBvQWVOAax7EWcYTLPV2Vc749amkX9XFpkG2ZIJKiw_Hfxkchj58fl89_ErfZtvkxWqYRVErVqEWYadrnOFM7zfbA5JTdGLSAqUQS53DgPkdznS6nBEnxez9hx4guX81vw7bgdwDF1q56U6ICmth-D1moHNvOfNNBGidaeBBeKGl0fwqRfU25vKaEBcKyw"
                onError={(e) => {
                  // Fallback if network blocked
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent && !parent.querySelector('svg')) {
                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('viewBox', '0 0 24 24');
                    svg.setAttribute('class', 'w-7 h-7 text-[#006a61] fill-current');
                    svg.innerHTML = '<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 6h2v2h-2V7zm0 4h2v6h-2v-6z"/>';
                    parent.appendChild(svg);
                  }
                }}
              />
            </div>
            <span className="font-semibold text-lg tracking-tight text-[#191c1e]">
              {title}
            </span>
          </div>

          {/* User Profile Avatar with Interactive Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-8 h-8 rounded-full bg-[#000000] text-white flex items-center justify-center hover:opacity-90 active:scale-95 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#000000]/20"
              title="Nurse Profile & Shift Context"
              aria-label="User Profile"
            >
              <span className="material-symbols-outlined text-white text-[18px]">person</span>
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div 
                className="absolute right-0 top-10 w-64 bg-white rounded-xl shadow-xl border border-[#eceef0] p-3 z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 pb-3 border-b border-[#eceef0]">
                  <div className="w-10 h-10 rounded-full bg-[#dae2fd] text-[#131b2e] flex items-center justify-center font-bold text-sm">
                    SJ
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#191c1e] truncate">{shiftInfo.activeNurse}</p>
                    <p className="text-xs text-[#45464d]">{shiftInfo.nurseRole} • {shiftInfo.nurseId}</p>
                  </div>
                </div>

                <div className="py-2.5 text-xs text-[#45464d] flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[#76777d]">Shift</span>
                    <span className="font-semibold text-[#191c1e]">{shiftInfo.shiftNumber} ({shiftInfo.timeWindow})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#76777d]">Ward</span>
                    <span className="font-medium text-[#191c1e]">{shiftInfo.ward}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#76777d]">HIPAA Status</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#86f2e4] text-[#006f66] font-semibold">Encrypted</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#eceef0] flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (onNavigate) onNavigate('dashboard');
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-[#191c1e] hover:bg-[#f2f4f6] rounded-lg transition-colors flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#76777d]">dashboard</span>
                    Handover Dashboard
                  </button>
                  {onSwitchView && (
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onSwitchView();
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs text-[#191c1e] hover:bg-[#f2f4f6] rounded-lg transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#76777d]">devices</span>
                      Switch View
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-[#ba1a1a] hover:bg-[#ffdad6]/40 rounded-lg transition-colors flex items-center gap-2 font-medium"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#ba1a1a]">logout</span>
                    Sign Out / Switch Shift
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Backdrop for profile menu dismiss */}
      {showProfileMenu && (
        <div 
          className="fixed inset-0 z-30 bg-transparent" 
          onClick={() => setShowProfileMenu(false)}
        />
      )}
    </>
  );
};
