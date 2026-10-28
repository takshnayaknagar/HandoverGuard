import React from 'react';
import { Database, X, Clock, User, ArrowRight, Loader2, AlertCircle, Trash2, FileDown } from 'lucide-react';
import type { SavedHandoverSummary } from '../services/handoverApi';

interface SavedHandoversModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedHandovers: SavedHandoverSummary[];
  isLoading: boolean;
  errorMessage: string | null;
  onSelectCase: (caseId: string) => void;
  onDeleteCase: (caseId: string) => void;
  onExportCase: (caseId: string) => Promise<void>;
  exportingCaseId: string | null;
  exportError: string | null;
  presentation?: 'modal' | 'screen';
}

export const SavedHandoversModal: React.FC<SavedHandoversModalProps> = ({
  isOpen,
  onClose,
  savedHandovers,
  isLoading,
  errorMessage,
  onSelectCase,
  onDeleteCase,
  onExportCase,
  exportingCaseId,
  exportError,
  presentation = 'modal'
}) => {
  if (!isOpen && presentation === 'modal') return null;

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
    <div className={presentation === 'screen' ? 'w-full' : 'fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-xs animate-fade-in sm:items-center sm:p-4'} role={presentation === 'modal' ? 'dialog' : undefined} aria-modal={presentation === 'modal' ? true : undefined} aria-labelledby="saved-handovers-title">
      <div className={presentation === 'screen' ? 'mx-auto flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)]' : 'flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-2xl sm:max-h-[85vh] sm:rounded-2xl'}>
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-main)] px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] p-2 text-[#4ea899] dark:text-[#86d2c1]">
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="saved-handovers-title" className="font-bold text-base text-[var(--text-primary)]">
                Saved Handover Cases
              </h3>
              <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                Retrieved from the SQLite database
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={presentation === 'screen' ? 'Return to input' : 'Close saved handovers'}
            className="min-h-10 min-w-10 flex shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-card-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86d2c1]"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
          {exportError && (
            <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold mb-1">PDF export failed</p>
                <p>{exportError}</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border-main)] bg-[var(--bg-card-muted)] py-12 text-center text-[var(--text-muted)]">
              <Loader2 className="w-7 h-7 text-[#4ea899] dark:text-[#86d2c1] animate-spin" />
              <span className="text-sm">Fetching saved handovers from SQLite...</span>
            </div>
          ) : errorMessage ? (
            <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-700 dark:text-rose-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold mb-1">Failed to load saved handovers</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          ) : savedHandovers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-main)] bg-[var(--bg-card-muted)] px-5 py-12 text-center text-sm italic text-[var(--text-muted)]">
              No saved handovers found. Process a handover to save it automatically.
            </div>
          ) : (
            savedHandovers.map((item) => (
              <div
                key={item.case_id}
                className="group flex flex-col gap-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 transition-colors hover:border-[#4ea899]/50 sm:p-5"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="max-w-full break-all rounded border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-2 py-1 text-xs font-mono font-bold text-[var(--text-primary)]">
                      {item.case_id}
                    </span>
                    {item.patient_reference ? (
                      <span className="flex items-center gap-1 rounded-full border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="break-words">{item.patient_reference}</span>
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

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => onSelectCase(item.case_id)}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-[#4ea899] px-3 py-2 text-xs font-semibold text-white transition-colors cursor-pointer hover:bg-[#3d8a7c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86d2c1]"
                  >
                    <span>Load Case</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onExportCase(item.case_id)}
                    disabled={exportingCaseId === item.case_id}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer hover:bg-[var(--bg-input)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86d2c1] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    <span>{exportingCaseId === item.case_id ? 'Exporting...' : 'Export PDF'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCase(item.case_id)}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors cursor-pointer hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--border-main)] px-4 py-3 text-xs text-[var(--text-muted)] sm:px-6">
          <span>{savedHandovers.length} saved case(s)</span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-lg border border-[var(--border-main)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86d2c1]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
