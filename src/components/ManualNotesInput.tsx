import React from 'react';
import { Edit3, Sparkles, Database } from 'lucide-react';

interface ManualNotesInputProps {
  value: string;
  onChange: (val: string) => void;
  onLoadSample: () => void;
  onViewSaved?: () => void;
  isVisible: boolean;
  patientBed: string;
  onPatientBedChange: (value: string) => void;
  disabled?: boolean;
}

export const ManualNotesInput: React.FC<ManualNotesInputProps> = ({
  value,
  onChange,
  onLoadSample,
  onViewSaved,
  isVisible,
  patientBed,
  onPatientBedChange,
  disabled = false
}) => {
  return (
    <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-colors duration-200 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Edit3 className="h-4 w-4 shrink-0 text-[var(--text-primary)]" />
          <div>
            <h3 className="text-sm font-bold leading-snug text-[var(--text-primary)]">Live Transcript Preview</h3>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{isVisible ? 'Review the source text before generating.' : 'Transcribe audio or enter notes to begin review.'}</p>
          </div>
        </div>
        {isVisible && <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">
          <Edit3 className="h-3 w-3" aria-hidden="true" /> Editable
        </span>}
      </div>

      {isVisible && <div className="mb-3 flex items-start gap-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-3 py-2.5 text-xs leading-relaxed text-[var(--text-secondary)]">
        <Edit3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#315f9f] dark:text-[#8AB4FF]" aria-hidden="true" />
        <p>Review and edit the transcript before generating a handover. Nothing is autosaved here.</p>
      </div>}

      {isVisible && <>
        <label className="mb-3 flex flex-col gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
          Patient bed <span className="font-normal text-[10px] text-[var(--text-muted)]">Optional — record only if explicitly known</span>
          <input value={patientBed} onChange={(event) => onPatientBedChange(event.target.value)} disabled={disabled} placeholder="e.g. Bed 12" className="h-10 rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] px-3 text-sm font-normal text-[var(--text-primary)] outline-none focus:border-[#8AB4FF] focus:ring-2 focus:ring-[#8AB4FF]/20" />
        </label>
        <label htmlFor="manual-handover-notes" className="sr-only">Handover notes or reviewed transcript</label>
        <div className="relative">
        <textarea
        id="manual-handover-notes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Your transcript will appear here, or paste handover notes to review..."
        rows={5}
        className="min-h-40 w-full resize-y rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] p-3.5 pb-9 text-sm leading-relaxed text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[#8AB4FF] focus:bg-[var(--bg-card)] focus:ring-2 focus:ring-[#8AB4FF]/20"
        />
        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md border border-[var(--border-main)] bg-[var(--bg-card)] px-2 py-1 text-[10px] text-[var(--text-muted)] shadow-sm">
          <Edit3 className="h-3 w-3" aria-hidden="true" /> Edit text
        </span>
        </div>

        <div className="mt-2 flex flex-col items-start gap-1 text-xs text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <span>Character count: {value.length}</span>
        <span>Manual edits are used for processing</span>
        </div>
      </>}

      <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border-main)] pt-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Manual notes / transcript backup</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onLoadSample}
            disabled={disabled}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-input)] disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Sample Note
          </button>
          {onViewSaved && (
            <button
              type="button"
              onClick={onViewSaved}
              disabled={disabled}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-input)] disabled:opacity-50"
            >
              <Database className="h-3.5 w-3.5" aria-hidden="true" /> Saved Handovers
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
