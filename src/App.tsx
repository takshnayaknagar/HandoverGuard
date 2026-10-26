import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MobileNav } from './components/MobileNav';
import { VoiceRecorder } from './components/VoiceRecorder';
import { FileUploader } from './components/FileUploader';
import { ManualNotesInput } from './components/ManualNotesInput';
import { HandoverDashboardCards } from './components/CategoryCard';
import { LoadingState, ErrorState } from './components/StatusStates';
import { SavedHandoversModal } from './components/SavedHandoversModal';
import { LoginScreen } from './components/screens/LoginScreen';
import type { HandoverOutput } from './types/handover';
import { SAMPLE_HANDOVER_OUTPUT } from './data/sampleData';
import {
  generateHandover,
  transcribeAudio,
  fetchSavedHandovers,
  fetchSavedHandoverById,
  deleteSavedHandover,
  type SavedHandoverSummary,
  getCurrentUser,
  login,
  logout,
  type AuthenticatedUser
} from './services/handoverApi';
import { 
  Sparkles, 
  FileText, 
  Copy, 
  Download, 
  FileDown,
  RotateCcw,
  Stethoscope,
  Database
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<'login' | 'input' | 'dashboard' | 'export' | 'saved'>('login');
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (cancelled) return;
        setCurrentUser(user);
        setActiveScreen(user ? 'input' : 'login');
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentUser(null);
          setActiveScreen('login');
          setAuthMessage('Unable to verify your session. Please sign in again.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsAuthChecking(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      setCurrentUser(null);
      setActiveScreen('login');
      setAuthMessage('Your session has expired. Please sign in again.');
    };
    window.addEventListener('handoverguard:session-expired', handleSessionExpired);
    return () => window.removeEventListener('handoverguard:session-expired', handleSessionExpired);
  }, []);

  const handleLogin = async (staffId: string, password: string, _department: string) => {
    await login(staffId, password);
    const user = await getCurrentUser();
    if (!user) throw new Error('Sign-in could not be confirmed. Please try again.');
    setCurrentUser(user);
    setAuthMessage(null);
    setActiveScreen('input');
  };

  const handleLogout = async () => {
    try {
      await logout();
      setAuthMessage(null);
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Could not sign out.');
    } finally {
      setCurrentUser(null);
      setActiveScreen('login');
    }
  };

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
  // Export PDF state for individual saved handovers
  const [exportingCaseId, setExportingCaseId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportingSavedAction, setExportingSavedAction] = useState<string | null>(null);
  const [exportScreenError, setExportScreenError] = useState<string | null>(null);

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
    setActiveScreen('saved');
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

  useEffect(() => {
    if (activeScreen !== 'export') return;

    let cancelled = false;
    setIsLoadingSaved(true);
    setExportScreenError(null);

    fetchSavedHandovers()
      .then((list) => {
        if (!cancelled) setSavedList(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setExportScreenError(
            err instanceof Error ? err.message : 'Could not fetch saved handovers from the database.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSaved(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeScreen]);

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
      setActiveScreen('dashboard');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : `Failed to load saved handover "${caseId}".`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Export PDF for a saved handover case
  const handleExportSavedCase = async (caseId: string) => {
    setExportError(null);
    setExportingCaseId(caseId);
    try {
      const handover = await fetchSavedHandoverById(caseId);
      const { exportHandoverToPdf } = await import('./services/pdfExport');
      await exportHandoverToPdf(handover);
    } catch (err: unknown) {
      setExportError(
        err instanceof Error ? err.message : 'Failed to export saved handover as PDF.'
      );
    } finally {
      setExportingCaseId(null);
    }
  };

  const getSafeExportCaseId = (caseId: string) =>
    caseId.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'unknown-case';

  const handleExportSavedJson = async (caseId: string) => {
    const actionKey = `${caseId}:json`;
    setExportScreenError(null);
    setExportingSavedAction(actionKey);

    try {
      const handover = await fetchSavedHandoverById(caseId);
      const blob = new Blob([JSON.stringify(handover, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `handover-${getSafeExportCaseId(caseId)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setExportScreenError(err instanceof Error ? err.message : 'Failed to export the saved handover as JSON.');
    } finally {
      setExportingSavedAction(null);
    }
  };

  const handleExportSavedPdf = async (caseId: string) => {
    const actionKey = `${caseId}:pdf`;
    setExportScreenError(null);
    setExportingSavedAction(actionKey);

    try {
      const handover = await fetchSavedHandoverById(caseId);
      const { exportHandoverToPdf } = await import('./services/pdfExport');
      await exportHandoverToPdf(handover);
    } catch (err: unknown) {
      setExportScreenError(err instanceof Error ? err.message : 'Failed to export the saved handover as PDF.');
    } finally {
      setExportingSavedAction(null);
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
  const handleGenerateHandover = async () => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const reviewedNotes = manualNotes.trim();
      if (!reviewedNotes) {
        throw new Error(
          'Enter handover notes or transcribe audio first. Review the notes before generating a handover.'
        );
      }

      const result = await generateHandover({ rawText: reviewedNotes });
      setHandoverResult(result);
      setActiveScreen('dashboard');
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
    const textToCopy = `Shift Handover: ${handoverResult.shift}\nTime: ${handoverResult.timestamp}\n\nPENDING:\n${handoverResult.items.pending.map((i) => `- ${i.title} (${i.patient || 'General'})`).join('\n')}\n\nFOLLOW-UP:\n${handoverResult.items.followup.map((i) => `- ${i.title} (${i.patient || 'General'})`).join('\n')}\n\nCOMPLETED:\n${handoverResult.items.completed.map((i) => `- ${i.title}`).join('\n')}\n\nCOMMUNICATION:\n${handoverResult.items.communication.map((i) => `- ${i.title}`).join('\n')}\n\nNEEDS VERIFICATION:\n${handoverResult.items.verification.map((i) => `- ${i.title}`).join('\n')}`;

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
      const { exportHandoverToPdf } = await import('./services/pdfExport');
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
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex justify-center font-sans transition-colors duration-200">
      <div className="relative flex min-h-screen w-full max-w-[440px] flex-col overflow-hidden border-[var(--border-main)] bg-[var(--bg-main)] shadow-2xl sm:my-3 sm:min-h-[calc(100vh-24px)] sm:rounded-[28px] sm:border lg:my-0 lg:max-w-[1440px] lg:rounded-none lg:border-0 lg:shadow-none">
      <Header
        isDark={isDark}
        onToggleTheme={toggleTheme}
        title={activeScreen === 'login' ? 'Login' : activeScreen === 'input' ? 'Voice Note' : activeScreen === 'dashboard' ? 'Dashboard' : activeScreen === 'export' ? 'Export' : 'Saved Handovers'}
      />

      <main className="flex-1 w-full mx-auto px-4 pb-28 pt-4 sm:px-6 sm:py-8 lg:px-12 flex flex-col gap-5 sm:gap-8">
        {isAuthChecking && <section className="mx-auto flex w-full max-w-md items-center justify-center rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-10 text-sm text-[var(--text-secondary)]">Checking session...</section>}
      {!isAuthChecking && !currentUser && (
      <LoginScreen
      rememberedStaffId={localStorage.getItem('handoverguard-staff-id') || ''}
      onLogin={handleLogin}
      authMessage={authMessage}
      />
      )}
        {!isAuthChecking && currentUser && authMessage && <div role="alert" className="mx-auto w-full max-w-3xl rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-4 py-3 text-sm text-[var(--text-primary)]">{authMessage}</div>}
        {!isAuthChecking && currentUser && <div className="flex justify-end"><button type="button" onClick={handleLogout} className="min-h-10 rounded-xl border border-[var(--border-main)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-card-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]">Sign out</button></div>}

        {currentUser && activeScreen === 'input' && <div className="mx-auto flex w-full max-w-md items-center justify-between rounded-xl border border-[#eceef0] bg-[var(--bg-card-muted)] p-3 shadow-sm dark:border-[var(--border-main)]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eceef0] text-[#191c1e] dark:bg-[var(--bg-card)] dark:text-[var(--text-primary)]">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-[var(--text-secondary)]">Active handover note</div>
              <div className="truncate text-base font-semibold text-[var(--text-primary)]">Voice Note</div>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#86f2e4] px-3 py-1 text-xs font-semibold text-[#006f66]">
            <span className="h-2 w-2 rounded-full bg-[#006a61]" /> Ready
          </span>
        </div>}

        {activeScreen === 'input' && <section className="mx-auto flex w-full max-w-md flex-col scroll-mt-24 pb-8">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Record a handover note</h2>
              <p className="text-xs leading-relaxed text-[var(--text-muted)]">
                Record audio or upload a note, then review the transcript before processing.
              </p>
            </div>
            {hasAnyInput && (
              <span className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-2.5 py-1 text-xs font-semibold text-[#315f9f] dark:text-[#8AB4FF]">
                Input Selected
              </span>
            )}
          </div>

          <div className="flex flex-col gap-4">
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

          <div className="mt-4 flex flex-col gap-4">
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

          {/* Source-style primary action footer, backed by the real target handlers. */}
          <div className="sticky bottom-20 z-20 mt-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)]/95 p-3 shadow-lg backdrop-blur-md">
            <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#315f9f] dark:bg-[#8AB4FF]" />
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

            <div className="mt-3 flex w-full flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleTranscribeAudio}
                disabled={isProcessing || isTranscribing || !(recordedBlob || uploadedFile)}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-card)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--bg-main)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                <span>{isTranscribing ? 'Transcribing...' : 'Transcribe Audio'}</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateHandover}
                disabled={isProcessing || isTranscribing || !manualNotes.trim()}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#315f9f] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#244a80] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#8AB4FF] dark:text-[#050505] dark:hover:bg-[#a9c8ff]"
              >
                <Sparkles className="w-4 h-4 text-[#edae49]" />
                <span>Generate Handover</span>
              </button>
            </div>
          </div>
        </section>}

        {/* Loading / Error States */}
        {activeScreen === 'input' && isProcessing && (
          <section className="animate-fade-in">
            <LoadingState progressPercent={68} />
          </section>
        )}

        {activeScreen === 'input' && errorMessage && !isProcessing && (
          <section className="animate-fade-in">
            <ErrorState
              message={errorMessage}
              onRetry={handleGenerateHandover}
            />
          </section>
        )}

        {/* Section 3: Handover Dashboard */}
        {activeScreen === 'dashboard' && handoverResult && !isProcessing && (
          <section className="mx-auto flex w-full max-w-md flex-col gap-5 pb-28 animate-fade-in scroll-mt-24 xl:max-w-7xl">
            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] text-[#315f9f] dark:text-[#8AB4FF]"><FileText className="h-5 w-5" /></div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-[var(--text-primary)]">Current Handover</span>
                    {handoverResult.caseId && <span className="max-w-full break-all rounded-full bg-[var(--bg-card-muted)] px-2 py-0.5 text-xs font-mono text-[var(--text-secondary)]">{handoverResult.caseId}</span>}
                  </div>
                  <p className="mt-0.5 break-words text-xs text-[var(--text-secondary)]">
                    {handoverResult.patientReference ? `Patient reference: ${handoverResult.patientReference}` : 'No patient reference documented'}
                  </p>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-300" /> Ready
              </span>
            </div>

            <div className="flex flex-col gap-4 border-b border-[var(--border-main)] pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Handover Dashboard</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/30">
                    Analysis Completed
                  </span>
                  {handoverResult.caseId && (
                    <span className="rounded-full border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-2.5 py-0.5 text-xs font-mono font-medium text-[var(--text-secondary)]">
                      Case: {handoverResult.caseId}
                    </span>
                  )}
                  {handoverResult.patientReference && (
                    <span className="rounded-full border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                      Pt: {handoverResult.patientReference}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Structured clinical categories ready for oncoming shift review
                </p>
              </div>

              {/* Dashboard Actions */}
              <div className="flex w-full items-center gap-2 flex-wrap sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="flex min-h-10 flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-muted)] border border-[var(--border-main)] rounded-lg shadow-xs transition-colors cursor-pointer sm:flex-none"
                >
                  <Copy className="w-3.5 h-3.5 text-[#315f9f] dark:text-[#8AB4FF]" />
                  <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenSavedModal}
                  className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-card-muted)] cursor-pointer sm:flex-none"
                >
                  <Database className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                  <span>Saved Handovers</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportJson}
                  className="flex min-h-10 flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-muted)] border border-[var(--border-main)] rounded-lg shadow-xs transition-colors cursor-pointer sm:flex-none"
                >
                  <Download className="w-3.5 h-3.5 text-[#315f9f] dark:text-[#8AB4FF]" />
                  <span>Export JSON</span>
                </button>

                {/* Export PDF Button */}
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={!handoverResult || isExportingPdf}
                  title={!handoverResult ? 'No handover available to export' : 'Export current handover as readable PDF'}
                  className="flex min-h-10 flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-muted)] border border-[var(--border-main)] rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed sm:flex-none"
                >
                  <FileDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <span>{isExportingPdf ? 'Exporting PDF...' : pdfExported ? 'PDF Downloaded!' : 'Export PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHandoverResult(null);
                    setActiveScreen('input');
                  }}
                  className="min-h-10 min-w-10 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors cursor-pointer"
                  title="Reset Dashboard"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button type="button" onClick={() => setActiveScreen('input')} className="self-start text-xs font-semibold text-[#315f9f] underline-offset-2 hover:underline dark:text-[#8AB4FF]">
              ← Back to Voice Note
            </button>

            {/* Transcript Preview Box */}
            <div className="bg-[var(--bg-card-muted)] rounded-2xl p-4 sm:p-5 border border-[var(--border-main)]">
              <div className="flex flex-col items-start gap-2 mb-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#315f9f] dark:text-[#8AB4FF]" />
                  Raw Transcript Preview
                </span>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  Shift: {handoverResult.shift}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-mono bg-[var(--bg-card)] p-3.5 rounded-xl border border-[var(--border-main)] break-words">
                "{handoverResult.rawTranscript}"
              </p>
            </div>

            {/* Cards for all 5 Categories: Pending, Follow-up, Completed, Communication, Needs verification */}
            <HandoverDashboardCards items={handoverResult.items} />
          </section>
        )}

        {activeScreen === 'dashboard' && !handoverResult && !isProcessing && !errorMessage && (
          <section className="rounded-3xl border border-[var(--border-main)] bg-[var(--bg-card)] p-6 text-center shadow-sm sm:p-10">
            <FileText className="mx-auto mb-3 h-10 w-10 text-[#00798c] dark:text-[#38bdf8]" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">No current handover result</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--text-muted)]">Process reviewed notes or load a saved handover to view the structured dashboard.</p>
            <button type="button" onClick={() => setActiveScreen('input')} className="mt-5 min-h-11 rounded-xl bg-[#00798c] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#006575]">Open Voice Note</button>
          <button
            type="button"
            onClick={handleOpenSavedModal}
            className="mt-3 min-h-11 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-input)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]"
            >
            View Saved Handovers
          </button>
          </section>
        )}

        {activeScreen === 'export' && (
          <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-28">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Export</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">Export the current handover using the existing available formats.</p>
            </div>
            {handoverResult ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-5 sm:flex-row">
                <button type="button" onClick={handleExportJson} className="min-h-11 flex-1 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-input)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]">Export JSON</button>
                <button type="button" onClick={handleExportPdf} disabled={isExportingPdf} className="min-h-11 flex-1 rounded-xl bg-[#315f9f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#244a80] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]">{isExportingPdf ? 'Exporting PDF...' : pdfExported ? 'PDF Downloaded!' : 'Export PDF'}</button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border-main)] bg-[var(--bg-card-muted)] p-8 text-center text-sm text-[var(--text-secondary)]">No current handover is available to export. Process or load a handover first.</div>
            )}

            <div className="mt-2 flex flex-col gap-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">Previous Handovers</h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">Export a saved record from SQLite.</p>
                </div>
                {savedList.length > 0 && <span className="text-xs text-[var(--text-muted)]">{savedList.length} saved</span>}
              </div>

              {exportScreenError && (
                <div role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                  {exportScreenError}
                </div>
              )}

              {isLoadingSaved ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-main)] bg-[var(--bg-card-muted)] p-6 text-center text-sm text-[var(--text-secondary)]">
                  Loading previous handovers...
                </div>
              ) : savedList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-main)] bg-[var(--bg-card-muted)] p-6 text-center text-sm text-[var(--text-secondary)]">
                  No previous handovers are available.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {savedList.map((item) => {
                    const pdfKey = `${item.case_id}:pdf`;
                    const jsonKey = `${item.case_id}:json`;
                    return (
                      <article key={item.case_id} className="flex flex-col gap-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-all font-mono text-sm font-semibold text-[var(--text-primary)]">{item.case_id}</p>
                          <p className="mt-1 break-words text-xs text-[var(--text-secondary)]">
                            {item.patient_reference ? `Patient reference: ${item.patient_reference}` : 'No patient reference documented'}
                          </p>
                          <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                            Saved {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-52">
                          <button
                            type="button"
                            onClick={() => handleExportSavedPdf(item.case_id)}
                            disabled={exportingSavedAction !== null}
                            className="min-h-10 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-input)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]"
                          >
                            {exportingSavedAction === pdfKey ? 'Exporting...' : 'Export PDF'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportSavedJson(item.case_id)}
                            disabled={exportingSavedAction !== null}
                            className="min-h-10 rounded-lg bg-[#315f9f] px-3 py-2 text-xs font-semibold text-white hover:bg-[#244a80] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]"
                          >
                            {exportingSavedAction === jsonKey ? 'Exporting...' : 'Export JSON'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {activeScreen === 'saved' && (
          <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-28">
            <div className="px-1 pt-2">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Saved Handover Reports</h2>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">Open, review, export, or delete handovers saved in the SQLite database.</p>
            </div>
            <SavedHandoversModal
              isOpen
              presentation="screen"
              onClose={() => {
                setActiveScreen('input');
                setIsSavedModalOpen(false);
              }}
              savedHandovers={savedList}
              isLoading={isLoadingSaved}
              errorMessage={savedListError}
              onSelectCase={handleLoadSavedCase}
              onDeleteCase={handleDeleteSavedCase}
              onExportCase={handleExportSavedCase}
              exportingCaseId={exportingCaseId}
              exportError={exportError}
            />
          </section>
        )}
      </main>

      <MobileNav
        activeScreen={activeScreen}
        isAuthenticated={Boolean(currentUser)}
        onLogin={() => setActiveScreen('login')}
        onInput={() => { if (currentUser) setActiveScreen('input'); }}
        onResult={() => { if (currentUser) setActiveScreen('dashboard'); }}
        onExport={() => { if (currentUser) setActiveScreen('export'); }}
      />

      {/* Saved Handovers Modal */}
      {isSavedModalOpen && activeScreen !== 'saved' && (
        <SavedHandoversModal
          isOpen
          onClose={() => setIsSavedModalOpen(false)}
          savedHandovers={savedList}
          isLoading={isLoadingSaved}
          errorMessage={savedListError}
          onSelectCase={handleLoadSavedCase}
          onDeleteCase={handleDeleteSavedCase}
          onExportCase={handleExportSavedCase}
          exportingCaseId={exportingCaseId}
          exportError={exportError}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-[var(--border-main)] bg-[var(--bg-card)] py-6 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-muted)] gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text-primary)]">HandoverGuard</span>
            <span>-</span>
            <span>Clinical Continuity & Patient Safety System</span>
          </div>
          <div className="flex items-center gap-4 text-[var(--text-muted)]">
            <span>Theme: {isDark ? 'Dark Mode' : 'Light Mode'}</span>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
};

export default App;
