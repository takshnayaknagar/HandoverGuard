import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface LoadingStateProps {
  stage?: string;
  progressPercent?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  stage = 'Transcribing voice note & extracting clinical handover items...',
  progressPercent
}) => {
  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[#00798c]/30 p-8 shadow-sm flex flex-col items-center justify-center text-center transition-colors duration-200">
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-2xl bg-[#00798c]/10 border border-[#00798c]/25 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#00798c] dark:text-[#38bdf8] animate-spin" />
        </div>
      </div>

      <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">
        AI Processing In Progress
      </h3>
      <p className="text-xs text-[var(--text-muted)] max-w-md mb-4">
        {stage}
      </p>

      {progressPercent !== undefined && (
        <div className="w-full max-w-xs bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-2">
          <div
            className="bg-[#00798c] dark:bg-[#38bdf8] h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] font-medium">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00798c] dark:bg-[#38bdf8] animate-ping" />
        Filtering medical terms & running safety validation
      </div>
    </div>
  );
};

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="bg-[#d1495b]/10 rounded-2xl border border-[#d1495b]/30 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors duration-200">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-[#d1495b]/15 text-[#d1495b] rounded-xl shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-[#d1495b]">Transcription & Processing Failed</h4>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{message}</p>
        </div>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#d1495b] hover:bg-[#b83b4b] text-white rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
};
