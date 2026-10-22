import React from 'react';
import { Database, X, Clock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import type { SavedHandoverSummary } from '../services/handoverApi';

interface SavedHandoversModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedHandovers: SavedHandoverSummary[];
  isLoading: boolean;
  errorMessage: string | null;
  onSelectCase: (caseId: string) => void;
}

export const SavedHandoversModal: React.FC<SavedHandoversModalProps> = ({
  isOpen,
  onClose,
  savedHandovers,
  isLoading,
  errorMessage,
  onSelectCase
}) => {
  if (!isOpen) return null;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        hour12: false
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-card-muted)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#00798c]/15 text-[#00798c] dark:text-[#38bdf8]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text-primary)]">
                Saved Handover Cases
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Retrieved from SQLite database (<code className="font-mono text-[11px]">data/handovers.db</code>)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
              <Loader2 className="w-7 h-7 text-[#00798c] dark:text-[#38bdf8] animate-spin" />
              <span className="text-sm">Fetching saved handovers from SQLite...</span>
            </div>
          ) : errorMessage ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold mb-1">Failed to load saved handovers</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          ) : savedHandovers.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-muted)] text-sm italic">
              No saved handovers found in the database. Process a handover to save it automatically.
            </div>
          ) : (
            savedHandovers.map((item) => (
              <div
                key={item.case_id}
                className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] hover:border-[#00798c]/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-[var(--text-primary)] bg-[var(--bg-card-muted)] px-2 py-0.5 rounded border border-[var(--border-main)]">
                      {item.case_id}
                    </span>
                    {item.patient_reference ? (
                      <span className="text-xs font-medium text-[#00798c] dark:text-[#38bdf8] bg-[#00798c]/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-[#00798c]/20">
                        <User className="w-3 h-3" />
                        {item.patient_reference}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[var(--text-muted)] italic">
                        No patient ref
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectCase(item.case_id)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#00798c] hover:bg-[#006575] rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <span>Load Case</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-main)] bg-[var(--bg-card-muted)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>{savedHandovers.length} saved case(s)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-colors cursor-pointer border border-[var(--border-main)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
