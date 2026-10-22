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
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-card)] p-6 shadow-sm transition-colors duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-[#30638e] dark:text-[#38bdf8]" />
          <h3 className="font-semibold text-[var(--text-primary)] text-base">Manual Notes / Transcript Backup</h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onLoadSample}
            disabled={disabled}
            className="text-xs font-semibold text-[#00798c] dark:text-[#38bdf8] bg-[#00798c]/10 hover:bg-[#00798c]/20 border border-[#00798c]/30 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#edae49]" />
            Load Hospital Sample Note
          </button>
          {onViewSaved && (
            <button
              type="button"
              onClick={onViewSaved}
              disabled={disabled}
              className="text-xs font-semibold text-[#30638e] dark:text-[#6ba1ce] bg-[#30638e]/10 hover:bg-[#30638e]/20 border border-[#30638e]/30 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5 text-[#30638e] dark:text-[#6ba1ce]" />
              Saved Cases (SQLite)
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)] mb-3">
        Enter handover notes manually if microphone access is unavailable or to review/edit the transcription draft before AI parsing.
      </p>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Type or paste doctor/nurse handover notes here (e.g., Bed 12 John Doe BP checked, cardiac enzymes awaited, verify ECG status)..."
        rows={4}
        className="w-full text-sm p-3.5 rounded-xl border border-[var(--border-main)] focus:border-[#00798c] dark:focus:border-[#38bdf8] focus:ring-2 focus:ring-[#00798c]/20 outline-none transition-all placeholder:text-[var(--text-muted)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:bg-[var(--bg-card)] resize-y"
      />

      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mt-2">
        <span>Character count: {value.length}</span>
        <span>Supports Markdown & clinical abbreviations</span>
      </div>
    </div>
  );
};
