import React from 'react';
import { 
  Clock, 
  ArrowRightCircle, 
  CheckCircle2, 
  MessageSquare, 
  AlertTriangle,
  User,
  AlertCircle
} from 'lucide-react';
import type { HandoverItem } from '../types/handover';

interface CategoryCardProps {
  category: 'pending' | 'followup' | 'completed' | 'communication' | 'verification';
  title: string;
  items: HandoverItem[];
  icon: React.ReactNode;
  badgeStyle: string;
  cardBorderStyle: string;
  headerBgStyle: string;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category: _category,
  title,
  items,
  icon,
  badgeStyle,
  cardBorderStyle,
  headerBgStyle
}) => {
  const getUrgencyBadge = (urgency?: HandoverItem['urgency']) => {
    switch (urgency) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#d1495b]/15 text-[#d1495b] border border-[#d1495b]/30">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#edae49]/20 text-[#c4871e] dark:text-[#f3c26a] border border-[#edae49]/40">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#30638e]/15 text-[#30638e] dark:text-[#6ba1ce] border border-[#30638e]/30">Medium</span>;
      default:
        return null;
    }
  };

  return (
    <div className={`bg-[var(--bg-card)] rounded-2xl border ${cardBorderStyle} shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md duration-200`}>
      {/* Card Header */}
      <div className={`px-5 py-4 border-b ${headerBgStyle} flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-[var(--bg-card)] shadow-xs">
            {icon}
          </div>
          <h3 className="font-bold text-[var(--text-primary)] text-base">{title}</h3>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeStyle}`}>
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Card Body / Items */}
      <div className="p-4 flex-1 flex flex-col gap-3 divide-y divide-[var(--border-main)]">
        {items.length === 0 ? (
          <div className="py-8 text-center text-[var(--text-muted)] text-xs italic">
            No entries recorded for this section.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="pt-3 first:pt-0 group">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[#00798c] dark:group-hover:text-[#38bdf8] transition-colors">
                  {item.title}
                </h4>
                {getUrgencyBadge(item.urgency)}
              </div>

              {item.description && (
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  {item.description}
                </p>
              )}

              {item.patient && (
                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--bg-card-muted)] px-2.5 py-1 rounded-md border border-[var(--border-main)] w-fit">
                  <User className="w-3 h-3 text-[var(--text-muted)]" />
                  <span>{item.patient}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const HandoverDashboardCards: React.FC<{ items: {
  pending: HandoverItem[];
  followup: HandoverItem[];
  completed: HandoverItem[];
  communication: HandoverItem[];
  verification: HandoverItem[];
} }> = ({ items }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* 1. Pending - Gold #edae49 */}
      <CategoryCard
        category="pending"
        title="Pending"
        items={items.pending}
        icon={<Clock className="w-5 h-5 text-[#edae49]" />}
        badgeStyle="bg-[#edae49]/20 text-[#a26a09] dark:text-[#fcd34d]"
        cardBorderStyle="border-[#edae49]/30"
        headerBgStyle="bg-[#edae49]/10 border-[#edae49]/20"
      />

      {/* 2. Follow-up - Blue #30638e */}
      <CategoryCard
        category="followup"
        title="Follow-up"
        items={items.followup}
        icon={<ArrowRightCircle className="w-5 h-5 text-[#30638e] dark:text-[#6ba1ce]" />}
        badgeStyle="bg-[#30638e]/15 text-[#30638e] dark:text-[#93c5fd]"
        cardBorderStyle="border-[#30638e]/30"
        headerBgStyle="bg-[#30638e]/10 border-[#30638e]/20"
      />

      {/* 3. Completed - Teal #00798c */}
      <CategoryCard
        category="completed"
        title="Completed"
        items={items.completed}
        icon={<CheckCircle2 className="w-5 h-5 text-[#00798c] dark:text-[#38bdf8]" />}
        badgeStyle="bg-[#00798c]/15 text-[#00798c] dark:text-[#38bdf8]"
        cardBorderStyle="border-[#00798c]/30"
        headerBgStyle="bg-[#00798c]/10 border-[#00798c]/20"
      />

      {/* 4. Communication - Deep Blue/Navy #003d5b / #30638e */}
      <CategoryCard
        category="communication"
        title="Communication"
        items={items.communication}
        icon={<MessageSquare className="w-5 h-5 text-[#003d5b] dark:text-[#7dd3fc]" />}
        badgeStyle="bg-[#003d5b]/15 text-[#003d5b] dark:text-[#bae6fd]"
        cardBorderStyle="border-[#003d5b]/30 dark:border-[#004d73]"
        headerBgStyle="bg-[#003d5b]/10 dark:bg-[#003852] border-[#003d5b]/20 dark:border-[#004d73]"
      />

      {/* 5. Needs Verification - Coral #d1495b */}
      <CategoryCard
        category="verification"
        title="Needs Verification"
        items={items.verification}
        icon={<AlertTriangle className="w-5 h-5 text-[#d1495b]" />}
        badgeStyle="bg-[#d1495b]/15 text-[#d1495b] dark:text-[#fda4af]"
        cardBorderStyle="border-[#d1495b]/30"
        headerBgStyle="bg-[#d1495b]/10 border-[#d1495b]/20"
      />

      {/* Guardrail Safety Summary Card */}
      <div className="bg-gradient-to-br from-[#003d5b] to-[#022132] text-white rounded-2xl p-6 shadow-sm border border-[#004d73] flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-[#00798c]/30 text-[#38bdf8] border border-[#00798c]/40">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-white">Clinical Guardrails</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            All AI outputs are classified strictly against clinical handover standards (SBAR/ISBAR). 
            Items in <strong className="text-[#d1495b] dark:text-[#fda4af] font-semibold">Needs Verification</strong> must be acknowledged before closing the shift handover.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
          <span>Protocol: ISBAR v2.4</span>
          <span className="text-emerald-400 flex items-center gap-1">● Guard active</span>
        </div>
      </div>
    </div>
  );
};
