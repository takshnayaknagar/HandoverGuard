import React, { useRef } from 'react';
import { Upload, FileAudio, X } from 'lucide-react';

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
  disabled?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelected,
  selectedFile,
  onClearFile,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onFileSelected(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="rounded-2xl border border-[var(--border-card)] bg-[var(--bg-card)] p-4 transition-colors duration-200 sm:p-5">
      <div className="flex flex-col items-start gap-1 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-semibold text-[var(--text-primary)] text-base">Upload Prerecorded Audio</h3>
        <span className="text-xs text-[var(--text-muted)]">MP3, WAV, M4A, WEBM, OGG</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />

      {!selectedFile ? (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0] && !disabled) {
              onFileSelected(e.dataTransfer.files[0]);
            }
          }}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Choose an audio file to upload"
          aria-disabled={disabled}
          className={`min-h-40 border border-dashed rounded-xl p-5 sm:p-6 flex flex-col items-center justify-center gap-3 transition-colors text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86d2c1] ${
            disabled
              ? 'opacity-50 cursor-not-allowed border-[var(--border-main)] bg-[var(--bg-card-muted)]'
              : 'border-[var(--border-main)] hover:border-[#4ea899] dark:hover:border-[#86d2c1] hover:bg-[var(--bg-card-muted)] cursor-pointer bg-[var(--bg-input)]'
          }`}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] text-[#4ea899] dark:text-[#86d2c1]">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium leading-relaxed text-[var(--text-primary)]">
              Drag & drop audio note, or <span className="font-semibold text-[#4ea899] underline dark:text-[#86d2c1]">browse</span>
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Supports audio files up to 25MB</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] p-4">
          <div className="flex items-center gap-3 truncate">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#4ea899] text-white dark:bg-[#86d2c1] dark:text-[#050505]">
              <FileAudio className="w-5 h-5" />
            </div>
            <div className="truncate">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{selectedFile.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearFile}
            aria-label="Remove selected audio file"
            className="min-h-10 min-w-10 flex items-center justify-center p-1.5 text-[var(--text-muted)] hover:text-[#d1495b] hover:bg-[#d1495b]/10 rounded-lg transition-colors cursor-pointer ml-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d1495b]"
            title="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
