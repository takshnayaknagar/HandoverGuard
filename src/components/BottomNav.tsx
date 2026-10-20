import React from 'react';

export type ScreenTab = 'login' | 'voice-note' | 'dashboard' | 'export';

interface BottomNavProps {
  currentTab: ScreenTab;
  onTabChange: (tab: ScreenTab) => void;
  pendingFlagsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, pendingFlagsCount = 0 }) => {
  const tabs = [
    { id: 'login' as ScreenTab, label: 'Login', icon: 'login' },
    { id: 'voice-note' as ScreenTab, label: 'Voice Note', icon: 'mic' },
    { id: 'dashboard' as ScreenTab, label: 'Dashboard', icon: 'dashboard', badge: pendingFlagsCount > 0 ? pendingFlagsCount : undefined },
    { id: 'export' as ScreenTab, label: 'Export', icon: 'export_notes' },
  ];

  return (
    <nav 
      aria-label="Main Navigation"
      className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-[#f7f9fb]/95 backdrop-blur-xl border-t border-[#eceef0] shadow-[0_-1px_12px_rgba(15,23,42,0.04)] transition-all"
    >
      <div className="flex justify-around items-center h-20 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-1 w-16 h-16 transition-all duration-150 rounded-xl focus:outline-none ${
                isActive
                  ? 'text-[#000000] font-semibold scale-105'
                  : 'text-[#45464d] hover:text-[#191c1e] hover:bg-[#eceef0]/50'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative flex items-center justify-center">
                <span 
                  className={`material-symbols-outlined text-[24px] ${isActive ? 'material-symbols-fill' : ''}`}
                >
                  {tab.icon}
                </span>

                {tab.badge && (
                  <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-[#ba1a1a] text-white text-[10px] font-bold flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
