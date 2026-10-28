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
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#b54747]/15 text-[#b54747] border border-[#b54747]/30">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#4ea899]/10 text-[#4ea899] dark:text-[#86d2c1] border border-[#4ea899]/25">Medium</span>;
      default:
        return null;
    }
  };

  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl border ${cardBorderStyle} bg-[var(--bg-card)] transition-colors duration-200`}>
      {/* Card Header */}
      <div className={`px-4 py-3.5 sm:px-5 sm:py-4 border-b ${headerBgStyle} flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-card-muted)] p-1.5">
            {icon}
          </div>
          <h3 className="font-bold text-[var(--text-primary)] text-sm sm:text-base">{title}</h3>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeStyle}`}>
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Card Body / Items */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col gap-3 divide-y divide-[var(--border-main)]">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-main)] bg-[var(--bg-card-muted)]/50 px-3 py-6 text-center text-[var(--text-muted)] text-xs italic">
            No {title.toLowerCase()} information was documented in the provided handover. This does not confirm that no action is outstanding.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="pt-3 first:pt-0 group">
              <div className="flex items-start justify-between gap-2">
                <h4 className="break-words text-sm font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[#4ea899] dark:group-hover:text-[#86d2c1]">
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
                <div className="mt-2.5 flex w-fit max-w-full items-center gap-1.5 rounded-md border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] break-words">
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:gap-5">
      {/* Pending: explicit work not yet documented as completed. */}
      <CategoryCard
        category="pending"
        title="Pending"
        items={items.pending}
        icon={<Clock className="w-5 h-5 text-amber-600 dark:text-amber-300" />}
        badgeStyle="bg-amber-500/10 text-amber-700 dark:text-amber-300"
        cardBorderStyle="border-amber-500/25"
        headerBgStyle="bg-amber-500/5 border-amber-500/15"
      />

      {/* Follow-up */}
      <CategoryCard
        category="followup"
        title="Follow-up"
        items={items.followup}
        icon={<ArrowRightCircle className="w-5 h-5 text-[#4ea899] dark:text-[#86d2c1]" />}
        badgeStyle="bg-[#4ea899]/10 text-[#4ea899] dark:text-[#86d2c1]"
        cardBorderStyle="border-[#4ea899]/25"
        headerBgStyle="bg-[#4ea899]/5 border-[#4ea899]/15"
      />

      {/* Completed */}
      <CategoryCard
        category="completed"
        title="Completed"
        items={items.completed}
        icon={<CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />}
        badgeStyle="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        cardBorderStyle="border-emerald-500/25"
        headerBgStyle="bg-emerald-500/5 border-emerald-500/15"
      />

      {/* Communication */}
      <CategoryCard
        category="communication"
        title="Communication"
        items={items.communication}
        icon={<MessageSquare className="w-5 h-5 text-slate-600 dark:text-slate-300" />}
        badgeStyle="bg-slate-500/10 text-slate-700 dark:text-slate-300"
        cardBorderStyle="border-slate-500/25"
        headerBgStyle="bg-slate-500/5 border-slate-500/15"
      />

      {/* Unclear or undocumented */}
      <CategoryCard
        category="verification"
        title="Unclear / Undocumented"
        items={items.verification}
        icon={<AlertTriangle className="w-5 h-5 text-[#b54747] dark:text-[#f08a8a]" />}
        badgeStyle="bg-[#b54747]/10 text-[#b54747] dark:text-[#f08a8a]"
        cardBorderStyle="border-[#b54747]/25"
        headerBgStyle="bg-[#b54747]/5 border-[#b54747]/15"
      />

      {/* AI output review reminder */}
      <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card-muted)] p-5 text-[var(--text-primary)] md:col-span-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] p-2 text-[#4ea899] dark:text-[#86d2c1]">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-base text-[var(--text-primary)]">Review AI-Generated Items</h3>
        </div>
        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
          AI organizes information from the provided notes into handover categories. Review the transcript and generated items for accuracy. Items marked <strong className="font-semibold text-[#b54747] dark:text-[#f08a8a]">Unclear / Undocumented</strong> may require clinician review.
        </p>
      </div>
    </div>
  );
};
