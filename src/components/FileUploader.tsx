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
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-card)] p-6 shadow-sm transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
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
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0] && !disabled) {
              onFileSelected(e.dataTransfer.files[0]);
            }
          }}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-colors text-center ${
            disabled
              ? 'opacity-50 cursor-not-allowed border-[var(--border-main)] bg-[var(--bg-card-muted)]'
              : 'border-[var(--border-main)] hover:border-[#00798c] dark:hover:border-[#38bdf8] hover:bg-[#00798c]/5 cursor-pointer bg-[var(--bg-input)]'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-[#00798c]/10 text-[#00798c] dark:text-[#38bdf8] flex items-center justify-center">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Drag & drop audio note, or <span className="text-[#00798c] dark:text-[#38bdf8] font-semibold underline">browse</span>
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Supports dictation logs up to 50MB</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-[#00798c]/10 border border-[#00798c]/30 rounded-xl">
          <div className="flex items-center gap-3 truncate">
            <div className="w-10 h-10 rounded-lg bg-[#00798c] text-white flex items-center justify-center shrink-0">
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
            className="p-1.5 text-[var(--text-muted)] hover:text-[#d1495b] hover:bg-[#d1495b]/10 rounded-lg transition-colors cursor-pointer ml-2 shrink-0"
            title="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
