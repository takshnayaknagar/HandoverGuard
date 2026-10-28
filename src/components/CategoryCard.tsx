import React from 'react';
import { 
  Clock, 
  ArrowRightCircle, 
  CheckCircle2, 
  MessageSquare, 
  AlertTriangle,
  User,
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
  accentStyle: string;
  iconBgStyle: string;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category: _category,
  title,
  items,
  icon,
  badgeStyle,
  cardBorderStyle: _cardBorderStyle,
  headerBgStyle: _headerBgStyle,
  accentStyle,
  iconBgStyle
}) => {
  const getUrgencyBadge = (urgency?: HandoverItem['urgency']) => {
    switch (urgency) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#b54747]/15 text-[#b54747] border border-[#b54747]/30">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#315f9f]/10 text-[#315f9f] dark:text-[#8AB4FF] border border-[#315f9f]/25">Medium</span>;
      default:
        return null;
    }
  };

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-sm transition-colors duration-200">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 z-10 w-1 rounded-l-2xl ${accentStyle}`} />
      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-main)] bg-[var(--bg-card)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className={`rounded-lg p-2 [&>svg]:!text-[#191c1e] ${iconBgStyle}`}>
            {icon}
          </div>
          <h3 className="truncate font-bold text-[var(--text-primary)] text-sm sm:text-base">{title}</h3>
        </div>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeStyle}`}>
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Card Body / Items */}
      <div className="flex flex-1 flex-col gap-3 p-3.5 sm:p-4">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-main)] bg-[var(--bg-card-muted)]/50 px-3 py-5 text-center text-xs leading-relaxed text-[var(--text-muted)]">
            No {title.toLowerCase()} information was documented in the provided handover. This does not confirm that no action is outstanding.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="group rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)]/45 p-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="break-words text-sm font-semibold leading-snug text-[var(--text-primary)] transition-colors group-hover:text-[#315f9f] dark:group-hover:text-[#8AB4FF]">
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
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:gap-4">
      {/* Pending: explicit work not yet documented as completed. */}
      <CategoryCard
        category="pending"
        title="Pending"
        items={items.pending}
        icon={<Clock className="w-5 h-5 text-amber-600 dark:text-amber-300" />}
        badgeStyle="bg-amber-500/10 text-amber-700 dark:text-amber-300"
        cardBorderStyle="border-amber-500/25"
        headerBgStyle="bg-amber-500/5 border-amber-500/15"
        accentStyle="bg-amber-500"
        iconBgStyle="bg-amber-300"
      />

      {/* Follow-up */}
      <CategoryCard
        category="followup"
        title="Follow-up"
        items={items.followup}
        icon={<ArrowRightCircle className="w-5 h-5 text-[#315f9f] dark:text-[#8AB4FF]" />}
        badgeStyle="bg-[#315f9f]/10 text-[#315f9f] dark:text-[#8AB4FF]"
        cardBorderStyle="border-[#315f9f]/25"
        headerBgStyle="bg-[#315f9f]/5 border-[#315f9f]/15"
        accentStyle="bg-[#315f9f]"
        iconBgStyle="bg-[#8AB4FF]"
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
        accentStyle="bg-emerald-700"
        iconBgStyle="bg-emerald-300"
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
        accentStyle="bg-slate-700"
        iconBgStyle="bg-slate-300"
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
        accentStyle="bg-[#b54747]"
        iconBgStyle="bg-[#f08a8a]"
      />

    </div>
  );
};
