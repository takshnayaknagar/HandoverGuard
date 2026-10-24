import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { VoiceRecorder } from './components/VoiceRecorder';
import { FileUploader } from './components/FileUploader';
import { ManualNotesInput } from './components/ManualNotesInput';
import { HandoverDashboardCards } from './components/CategoryCard';
import { LoadingState, ErrorState } from './components/StatusStates';
import { SavedHandoversModal } from './components/SavedHandoversModal';
import type { HandoverOutput } from './types/handover';
import { SAMPLE_HANDOVER_OUTPUT } from './data/sampleData';
import {
  generateHandover,
  transcribeAudio,
  fetchSavedHandovers,
  fetchSavedHandoverById,
  deleteSavedHandover,
  type SavedHandoverSummary
} from './services/handoverApi';
import { exportHandoverToPdf } from './services/pdfExport';
import { 
  Sparkles, 
  FileText, 
  CheckCircle, 
  Copy, 
  Download, 
  FileDown,
  RotateCcw,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';

export const App: React.FC = () => {
  // Theme state: default to dark if preferred or stored in localStorage
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('handoverguard-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('handoverguard-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('handoverguard-theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  // Input states
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [_recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [manualNotes, setManualNotes] = useState<string>('');

  // Processing & Output states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [handoverResult, setHandoverResult] = useState<HandoverOutput | null>(null);
  const [copied, setCopied] = useState(false);

  // PDF Export states
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [pdfExported, setPdfExported] = useState(false);

  // Saved Handovers states
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [savedList, setSavedList] = useState<SavedHandoverSummary[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [savedListError, setSavedListError] = useState<string | null>(null);

  // Audio recorder handlers
  const handleAudioReady = (blob: Blob, url: string) => {
    setRecordedBlob(blob);
    setRecordedUrl(url);
    setUploadedFile(null);
  };

  const handleClearAudio = () => {
    setRecordedBlob(null);
    setRecordedUrl(null);
  };

  // Upload handler
  const handleFileSelected = (file: File) => {
    setUploadedFile(file);
    setRecordedBlob(null);
    setRecordedUrl(null);
  };

  const handleClearFile = () => {
    setUploadedFile(null);
  };

  // Sample quick-loader
  const handleLoadSampleNotes = () => {
    setManualNotes(SAMPLE_HANDOVER_OUTPUT.rawTranscript);
  };

  // Saved handovers handlers
  const handleOpenSavedModal = async () => {
    setIsSavedModalOpen(true);
    setIsLoadingSaved(true);
    setSavedListError(null);

    try {
      const list = await fetchSavedHandovers();
      setSavedList(list);
    } catch (err: unknown) {
      setSavedListError(
        err instanceof Error ? err.message : 'Could not fetch saved handovers from the database.'
      );
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const handleDeleteSavedCase = async (caseId: string) => {
  const confirmed = window.confirm(
    `Delete saved handover "${caseId}"? This action cannot be undone.`
  );

  if (!confirmed) return;

  setSavedListError(null);

  try {
    await deleteSavedHandover(caseId);
    const list = await fetchSavedHandovers();
    setSavedList(list);
  } catch (err: unknown) {
    setSavedListError(
      err instanceof Error
        ? err.message
        : 'Failed to delete the saved handover.'
    );
  }
};

  const handleLoadSavedCase = async (caseId: string) => {
    setIsProcessing(true);
    setIsSavedModalOpen(false);
    setErrorMessage(null);

    try {
      const loaded = await fetchSavedHandoverById(caseId);
      setHandoverResult(loaded);
      setManualNotes(loaded.rawTranscript || '');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : `Failed to load saved handover "${caseId}".`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Explicitly transcribe selected audio; the clinician reviews the result before generation.
  const handleTranscribeAudio = async () => {
    const audio = uploadedFile ?? recordedBlob;

    if (!audio) {
      setErrorMessage('Record audio or select an audio file before transcribing.');
      return;
    }

    setErrorMessage(null);
    setIsTranscribing(true);

    try {
      const transcript = await transcribeAudio(audio);
      setManualNotes(transcript);
      setHandoverResult(null);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred during transcription.'
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  // Generate only from notes explicitly entered or reviewed by the clinician.
  const handleGenerateHandover = async (forceSimulateFailure = false) => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      if (forceSimulateFailure) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        throw new Error('Simulation test: Transcription service connection timed out or audio quality is too low.');
      }

      const reviewedNotes = manualNotes.trim();
      if (!reviewedNotes) {
        throw new Error(
          'Enter handover notes or transcribe audio first. Review the notes before generating a handover.'
        );
      }

      const result = await generateHandover({ rawText: reviewedNotes });
      setHandoverResult(result);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred while parsing handover.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopySummary = () => {
    if (!handoverResult) return;
    const textToCopy = `Shift Handover: ${handoverResult.shift}\nTime: ${handoverResult.timestamp}\n\nPENDING:\n${handoverResult.items.pending.map((i) => `• ${i.title} (${i.patient || 'General'})`).join('\n')}\n\nFOLLOW-UP:\n${handoverResult.items.followup.map((i) => `• ${i.title} (${i.patient || 'General'})`).join('\n')}\n\nCOMPLETED:\n${handoverResult.items.completed.map((i) => `• ${i.title}`).join('\n')}\n\nCOMMUNICATION:\n${handoverResult.items.communication.map((i) => `• ${i.title}`).join('\n')}\n\nNEEDS VERIFICATION:\n${handoverResult.items.verification.map((i) => `• ${i.title}`).join('\n')}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJson = () => {
    if (!handoverResult) return;
    const blob = new Blob([JSON.stringify(handoverResult, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `handover-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (!handoverResult) return;
    setIsExportingPdf(true);
    setErrorMessage(null);

    try {
      await exportHandoverToPdf(handoverResult);
      setPdfExported(true);
      setTimeout(() => setPdfExported(false), 2500);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? `PDF Export failed: ${err.message}` : 'Failed to generate and download PDF.'
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  const hasAnyInput = Boolean(recordedBlob || uploadedFile || manualNotes.trim().length > 0);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col font-sans transition-colors duration-200">
      <Header isDark={isDark} onToggleTheme={toggleTheme} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 flex flex-col gap-6 sm:gap-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#003d5b] via-[#30638e] to-[#00798c] rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden border border-white/10">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[#edae49] text-xs font-semibold mb-4 border border-[#edae49]/30 backdrop-blur-xs">
              <Stethoscope className="w-3.5 h-3.5 text-[#edae49]" />
              <span>Next-Gen Clinical Communication</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
              Handover<span className="text-[#edae49]">Guard</span>
            </h1>
            <p className="text-slate-100/90 text-base sm:text-lg leading-relaxed mb-6">
              Empowering healthcare teams with AI-assisted clinical shift handovers. Record or upload voice dictations, transcribe, and automatically categorize critical patient updates into structured action cards.
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-100">
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-xs border border-white/10">
                <CheckCircle className="w-4 h-4 text-[#edae49]" /> 5-Category SBAR Structure
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-xs border border-white/10">
                <ShieldCheck className="w-4 h-4 text-[#edae49]" /> Verification Safety Guard
              </span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-xs border border-white/10">
                <FileText className="w-4 h-4 text-[#edae49]" /> Zero-Loss Dictation
              </span>
            </div>
          </div>
        </div>

        {/* Section 1 & 2: Input Controls */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">1. Dictation & Input Center</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Choose a method: record live audio, upload an audio file, or enter manual notes
              </p>
            </div>
            {hasAnyInput && (
              <span className="text-xs font-semibold text-[#00798c] dark:text-[#38bdf8] bg-[#00798c]/10 border border-[#00798c]/30 px-2.5 py-1 rounded-lg">
                Input Selected
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VoiceRecorder
              onAudioReady={handleAudioReady}
              onClearAudio={handleClearAudio}
              disabled={isProcessing || isTranscribing}
            />

            <FileUploader
              onFileSelected={handleFileSelected}
              selectedFile={uploadedFile}
              onClearFile={handleClearFile}
              disabled={isProcessing || isTranscribing}
            />
          </div>

          <div className="mt-6">
            <ManualNotesInput
              value={manualNotes}
              onChange={setManualNotes}
              onLoadSample={handleLoadSampleNotes}
              onViewSaved={handleOpenSavedModal}
              disabled={isProcessing || isTranscribing}
            />
            <p className="mt-3 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
              Clinical review required: transcription can contain errors. Verify names, medications,
              doses, timings, and clinical details before generating or using a handover.
            </p>
          </div>

          {/* Action Trigger Banner */}
          <div className="mt-6 p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-card)] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors duration-200">
            <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00798c] dark:bg-[#38bdf8]" />
              <span>
                {isTranscribing
                  ? 'Transcribing audio...'
                  : manualNotes.trim()
                    ? 'Notes are available. Review them before generating the handover.'
                    : recordedBlob || uploadedFile
                      ? 'Audio selected. Transcribe it, then review the transcript below.'
                      : 'Enter notes manually, load the sample notes, or select a saved case.'}
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleTranscribeAudio}
                disabled={isProcessing || isTranscribing || !(recordedBlob || uploadedFile)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 border border-[var(--border-card)] text-[var(--text-primary)] hover:bg-[var(--bg-main)] font-semibold text-sm rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
                <span>{isTranscribing ? 'Transcribing...' : 'Transcribe Audio'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleGenerateHandover(false)}
                disabled={isProcessing || isTranscribing || !manualNotes.trim()}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 bg-[#00798c] hover:bg-[#006575] text-white font-semibold text-sm rounded-xl shadow-md shadow-[#00798c]/25 transition-all focus:ring-4 focus:ring-[#00798c]/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4 text-[#edae49]" />
                <span>Generate Handover</span>
              </button>

              {/* Demo Helper: Simulate Error */}
              <button
                type="button"
                onClick={() => handleGenerateHandover(true)}
                disabled={isProcessing || isTranscribing}
                title="Test how error states render for judges"
                className="px-3 py-3 text-xs text-[var(--text-muted)] hover:text-[#d1495b] hover:bg-[#d1495b]/10 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-[#d1495b]/30"
              >
                Test Error
              </button>
            </div>
          </div>
        </section>

        {/* Loading / Error States */}
        {isProcessing && (
          <section className="animate-fade-in">
            <LoadingState progressPercent={68} />
          </section>
        )}

        {errorMessage && !isProcessing && (
          <section className="animate-fade-in">
            <ErrorState
              message={errorMessage}
              onRetry={() => handleGenerateHandover(false)}
            />
          </section>
        )}

        {/* Section 3: Handover Dashboard */}
        {handoverResult && !isProcessing && (
          <section className="animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border-main)]">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">2. Handover Dashboard</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/30">
                    Analysis Completed
                  </span>
                  {handoverResult.caseId && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#00798c]/15 text-[#00798c] dark:text-[#38bdf8] font-mono font-medium border border-[#00798c]/30">
                      Case: {handoverResult.caseId}
                    </span>
                  )}
                  {handoverResult.patientReference && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#30638e]/15 text-[#30638e] dark:text-[#93c5fd] font-medium border border-[#30638e]/30">
                      Pt: {handoverResult.patientReference}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Structured clinical categories ready for oncoming shift review
                </p>
              </div>

              {/* Dashboard Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-muted)] border border-[var(--border-main)] rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-[#30638e] dark:text-[#6ba1ce]" />
                  <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-muted)] border border-[var(--border-main)] rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#00798c] dark:text-[#38bdf8]" />
                  <span>Export JSON</span>
                </button>

                {/* Export PDF Button */}
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={!handoverResult || isExportingPdf}
                  title={!handoverResult ? 'No handover available to export' : 'Export current handover as readable PDF'}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-muted)] border border-[var(--border-main)] rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FileDown className="w-3.5 h-3.5 text-[#d1495b] dark:text-[#fda4af]" />
                  <span>{isExportingPdf ? 'Exporting PDF...' : pdfExported ? 'PDF Downloaded!' : 'Export PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHandoverResult(null)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors cursor-pointer"
                  title="Reset Dashboard"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Transcript Preview Box */}
            <div className="bg-[var(--bg-card-muted)] rounded-2xl p-4 border border-[var(--border-main)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#00798c] dark:text-[#38bdf8]" />
                  Raw Transcript Preview
                </span>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  Shift: {handoverResult.shift}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-mono bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-main)]">
                "{handoverResult.rawTranscript}"
              </p>
            </div>

            {/* Cards for all 5 Categories: Pending, Follow-up, Completed, Communication, Needs verification */}
            <HandoverDashboardCards items={handoverResult.items} />
          </section>
        )}
      </main>

      {/* Saved Handovers Modal */}
      <SavedHandoversModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        savedHandovers={savedList}
        isLoading={isLoadingSaved}
        errorMessage={savedListError}
        onSelectCase={handleLoadSavedCase}
        onDeleteCase={handleDeleteSavedCase}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-[var(--border-main)] bg-[var(--bg-card)] py-6 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-muted)] gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text-primary)]">HandoverGuard</span>
            <span>•</span>
            <span>Clinical Continuity & Patient Safety System</span>
          </div>
          <div className="flex items-center gap-4 text-[var(--text-muted)]">
            <span>Theme: {isDark ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
