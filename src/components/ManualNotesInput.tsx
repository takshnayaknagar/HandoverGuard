import React from 'react';
import { Edit3, Sparkles, Database } from 'lucide-react';

interface ManualNotesInputProps {
  value: string;
  onChange: (val: string) => void;
  onLoadSample: () => void;
  onViewSaved?: () => void;
  disabled?: boolean;
}

export const ManualNotesInput: React.FC<ManualNotesInputProps> = ({
  value,
  onChange,
  onLoadSample,
  onViewSaved,
  disabled = false
}) => {
  return (
    <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-4 transition-colors duration-200 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Edit3 className="w-4 h-4 text-[#4ea899] dark:text-[#86d2c1]" />
          <h3 className="font-semibold text-[var(--text-primary)] text-base leading-snug">Manual Notes / Transcript Backup</h3>
        </div>
        <div className="flex w-full items-center gap-2 flex-wrap sm:w-auto">
          <button
            type="button"
            onClick={onLoadSample}
            disabled={disabled}
            className="flex-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-2.5 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-input)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 sm:flex-none sm:py-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#edae49]" />
            Load Hospital Sample Note
          </button>
          {onViewSaved && (
            <button
              type="button"
              onClick={onViewSaved}
              disabled={disabled}
            className="flex-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-2.5 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-input)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 sm:flex-none sm:py-1"
            >
              <Database className="w-3.5 h-3.5 text-[#30638e] dark:text-[#6ba1ce]" />
              Saved Cases (SQLite)
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 flex items-start gap-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-3 py-2.5 text-xs leading-relaxed text-[var(--text-secondary)]">
        <Edit3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4ea899] dark:text-[#86d2c1]" aria-hidden="true" />
        <p>Enter handover notes manually if microphone access is unavailable or to review/edit the transcription draft before AI parsing.</p>
      </div>

      <label htmlFor="manual-handover-notes" className="sr-only">Handover notes or reviewed transcript</label>
      <textarea
        id="manual-handover-notes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Type or paste doctor/nurse handover notes here (e.g., Bed 12 John Doe BP checked, cardiac enzymes awaited, verify ECG status)..."
        rows={5}
        className="min-h-40 w-full resize-y rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] p-3.5 text-sm leading-relaxed text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[#86d2c1] focus:bg-[var(--bg-card)] focus:ring-2 focus:ring-[#86d2c1]/20"
      />

      <div className="flex flex-col items-start gap-1 text-xs text-[var(--text-muted)] mt-2 sm:flex-row sm:items-center sm:justify-between">
        <span>Character count: {value.length}</span>
        <span>Supports Markdown & clinical abbreviations</span>
      </div>
    </div>
  );
};
