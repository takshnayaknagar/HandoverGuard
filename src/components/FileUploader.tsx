import React, { useRef } from 'react';
import { FileAudio, X } from 'lucide-react';

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelected,
  selectedFile,
  onClearFile,
  disabled = false,
  inputRef
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
    <div
      className="w-full"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (event.dataTransfer.files?.[0] && !disabled) onFileSelected(event.dataTransfer.files[0]);
      }}
    >

      <input
        ref={inputRef ?? fileInputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />

      {!selectedFile ? (
        <div className="hidden" aria-hidden="true" />
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] p-4">
          <div className="flex items-center gap-3 truncate">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#315f9f] text-white dark:bg-[#8AB4FF] dark:text-[#050505]">
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
