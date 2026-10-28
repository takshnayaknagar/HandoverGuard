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
import { SAMPLE_HANDOVERS } from './data/sampleData';
import { formatBedLabel, getBedIdentifier } from './utils/displayFormatters';
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
  ArrowLeft,
  Check,
  ChevronDown,
  FileText, 
  Download,
  Trash2,
  Stethoscope,
  FileDown,
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<'login' | 'input' | 'dashboard' | 'export' | 'saved'>('login');
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);
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
  const [patientBed, setPatientBed] = useState('');
  const [savedSort, setSavedSort] = useState<'newest' | 'patient' | 'bed'>('newest');
  const [isSavedSortOpen, setIsSavedSortOpen] = useState(false);
  const [pendingDeleteCaseId, setPendingDeleteCaseId] = useState<string | null>(null);
  const [isDeletingCase, setIsDeletingCase] = useState(false);
  const [isTranscriptVisible, setIsTranscriptVisible] = useState(false);
  const audioInputRef = React.useRef<HTMLInputElement | null>(null);
  const [exportMenuCaseId, setExportMenuCaseId] = useState<string | null>(null);
  const [isCurrentExportMenuOpen, setIsCurrentExportMenuOpen] = useState(false);

  useEffect(() => {
    if (!isSavedSortOpen) return;
    const closeMenu = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-saved-sort-menu]')) setIsSavedSortOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSavedSortOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isSavedSortOpen]);

  useEffect(() => {
    if (!pendingDeleteCaseId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeletingCase) setPendingDeleteCaseId(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [pendingDeleteCaseId, isDeletingCase]);

  useEffect(() => {
    if (!exportMenuCaseId) return;
    const closeMenu = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-export-menu]')) {
        setExportMenuCaseId(null);
        setIsCurrentExportMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExportMenuCaseId(null);
    };
    document.addEventListener('mousedown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [exportMenuCaseId]);

  // Processing & Output states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [handoverResult, setHandoverResult] = useState<HandoverOutput | null>(null);

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
    setManualNotes('');
    setIsTranscriptVisible(false);
  };

  const handleClearAudio = () => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setManualNotes('');
    setIsTranscriptVisible(false);
  };

  // Upload handler
  const handleFileSelected = (file: File) => {
    setUploadedFile(file);
    setRecordedBlob(null);
    setManualNotes('');
    setIsTranscriptVisible(false);
    setRecordedUrl(null);
  };

  const handleClearFile = () => {
    setUploadedFile(null);
  };

  // Sample quick-loader
  const handleLoadSampleNotes = () => {
  const randomIndex = Math.floor(Math.random() * SAMPLE_HANDOVERS.length);
  const sample = SAMPLE_HANDOVERS[randomIndex];

  setManualNotes(sample.rawTranscript);
  setPatientBed(sample.patientBed ?? '');
  setIsTranscriptVisible(true);
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
    if (activeScreen !== 'export' && activeScreen !== 'dashboard') return;

    let cancelled = false;
    setIsLoadingSaved(true);
    if (activeScreen === 'dashboard') {
      setSavedListError(null);
    } else {
      setExportScreenError(null);
    }

    fetchSavedHandovers()
      .then((list) => {
        if (!cancelled) setSavedList(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Could not fetch saved handovers from the database.';
          if (activeScreen === 'dashboard') {
            setSavedListError(message);
          } else {
            setExportScreenError(message);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSaved(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeScreen]);

  const handleDeleteSavedCase = async (caseId: string): Promise<boolean> => {
  setSavedListError(null);

  try {
    await deleteSavedHandover(caseId);
    const list = await fetchSavedHandovers();
    setSavedList(list);
    return true;
  } catch (err: unknown) {
    setSavedListError(
      err instanceof Error
        ? err.message
        : 'Failed to delete the saved handover.'
    );
    return false;
  }
};

  const requestDeleteSavedCase = (caseId: string) => setPendingDeleteCaseId(caseId);

  const confirmDeleteSavedCase = async () => {
    if (!pendingDeleteCaseId || isDeletingCase) return;
    const caseId = pendingDeleteCaseId;
    setIsDeletingCase(true);
    const deleted = await handleDeleteSavedCase(caseId);
    setIsDeletingCase(false);
    if (deleted && handoverResult?.caseId === caseId) {
      setHandoverResult(null);
      setActiveScreen('dashboard');
    }
    if (deleted) setPendingDeleteCaseId(null);
  };

  const handleDeleteCurrentHandover = async () => {
    if (!handoverResult?.caseId) return;
    requestDeleteSavedCase(handoverResult.caseId);
  };

  const handleLoadSavedCase = async (caseId: string) => {
    setIsProcessing(true);
    setIsSavedModalOpen(false);
    setErrorMessage(null);

    try {
      const loaded = await fetchSavedHandoverById(caseId);
      setHandoverResult(loaded);
      setManualNotes(loaded.rawTranscript || '');
      setIsTranscriptVisible(true);
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

  const handleSavedExportChoice = (caseId: string, format: 'pdf' | 'json') => {
    setExportMenuCaseId(null);
    if (format === 'pdf') {
      void handleExportSavedPdf(caseId);
    } else {
      void handleExportSavedJson(caseId);
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
      setIsTranscriptVisible(true);
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

      const result = await generateHandover({ rawText: reviewedNotes, patientBed });
      setHandoverResult(result);
      setManualNotes('');
      setIsTranscriptVisible(false);
      setActiveScreen('dashboard');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred while parsing handover.'
      );
    } finally {
      setIsProcessing(false);
    }
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
    <div className="min-h-screen bg-[var(--bg-main)] px-0 text-[var(--text-primary)] flex justify-center font-sans transition-colors duration-200 sm:px-3">
      <div className="relative flex min-h-screen w-full max-w-[440px] flex-col overflow-hidden border-[var(--border-main)] bg-[var(--bg-main)] shadow-2xl sm:my-3 sm:min-h-[calc(100vh-24px)] sm:rounded-[36px] sm:border lg:my-0 lg:max-w-[1440px] lg:rounded-none lg:border-0 lg:shadow-none">
      {currentUser && <Header
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onRequestSignOut={() => setIsSignOutConfirmOpen(true)}
        title={activeScreen === 'login' ? 'Login' : activeScreen === 'input' ? 'Voice Note' : activeScreen === 'dashboard' ? 'Dashboard' : activeScreen === 'export' ? 'Export' : 'Saved Handovers'}
      />}

      <main className={`mx-auto flex w-full flex-1 flex-col gap-5 px-4 sm:gap-8 sm:px-6 lg:px-12 ${currentUser ? 'pb-28 pt-4 sm:py-8' : 'pb-4 pt-2 sm:py-4'}`}>
        {isAuthChecking && <section className="mx-auto flex w-full max-w-md items-center justify-center rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-10 text-sm text-[var(--text-secondary)]">Checking session...</section>}
      {!isAuthChecking && !currentUser && (
      <LoginScreen
      rememberedStaffId={localStorage.getItem('handoverguard-staff-id') || ''}
      onLogin={handleLogin}
      authMessage={authMessage}
      />
      )}
        {!isAuthChecking && currentUser && authMessage && <div role="alert" className="mx-auto w-full max-w-3xl rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-4 py-3 text-sm text-[var(--text-primary)]">{authMessage}</div>}
        {isSignOutConfirmOpen && currentUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="sign-out-title">
            <div className="w-full max-w-sm rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-5 shadow-2xl">
              <h2 id="sign-out-title" className="text-base font-bold text-[var(--text-primary)]">Sign out?</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">Your current session will be ended on this device.</p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSignOutConfirmOpen(false)}
                  className="min-h-11 flex-1 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-input)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSignOutConfirmOpen(false);
                    void handleLogout();
                  }}
                  className="min-h-11 flex-1 rounded-xl bg-[#000000] px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF] dark:bg-[#f5f5f5] dark:text-[#050505] dark:hover:bg-white"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
        {pendingDeleteCaseId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-handover-title"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !isDeletingCase) setPendingDeleteCaseId(null);
            }}
          >
            <div className="w-full max-w-sm rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-5 shadow-2xl">
              <h2 id="delete-handover-title" className="text-base font-bold text-[var(--text-primary)]">Delete handover?</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">This will permanently delete this saved handover. This action cannot be undone.</p>
              {savedListError && <p role="alert" className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">{savedListError}</p>}
              <div className="mt-5 flex gap-2">
                <button type="button" disabled={isDeletingCase} onClick={() => setPendingDeleteCaseId(null)} className="min-h-11 flex-1 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-input)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]">Cancel</button>
                <button type="button" disabled={isDeletingCase} onClick={() => void confirmDeleteSavedCase()} className="min-h-11 flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">{isDeletingCase ? 'Deleting...' : 'Delete'}</button>
              </div>
            </div>
          </div>
        )}

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
              onUploadAudio={() => audioInputRef.current?.click()}
              onRequestTextEntry={() => setIsTranscriptVisible(true)}
              disabled={isProcessing || isTranscribing}
            />

            <FileUploader
              onFileSelected={handleFileSelected}
              selectedFile={uploadedFile}
              onClearFile={handleClearFile}
              inputRef={audioInputRef}
              disabled={isProcessing || isTranscribing}
            />
          </div>

          <div className="mt-4 flex flex-col gap-4">
            <ManualNotesInput
              value={manualNotes}
              onChange={setManualNotes}
              onLoadSample={handleLoadSampleNotes}
              onViewSaved={handleOpenSavedModal}
              isVisible={isTranscriptVisible}
              patientBed={patientBed}
              onPatientBedChange={setPatientBed}
              disabled={isProcessing || isTranscribing}
            />
            <p className="mt-3 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-3 py-2.5 text-xs leading-relaxed text-[var(--text-secondary)]">
              Clinical review required: transcription can contain errors. Verify names, medications,
              doses, timings, and clinical details before generating or using a handover.
            </p>
          </div>

          {/* Source-style primary action footer, backed by the real target handlers. */}
          <div className="sticky bottom-20 z-20 mt-1 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)]/95 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.10)] backdrop-blur-md">
            <div className="flex items-start gap-2">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--text-primary)]" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--text-primary)]">Review before generating</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                {isTranscribing
                  ? 'Transcribing audio...'
                  : manualNotes.trim()
                    ? 'Notes are available. Review them before generating the handover.'
                    : recordedBlob || uploadedFile
                      ? 'Audio selected. Transcribe it, then review the transcript below.'
                      : 'Enter notes manually, load the sample notes, or select a saved case.'}
                </p>
              </div>
            </div>

            <div className="mt-3 flex w-full flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleTranscribeAudio}
                disabled={isProcessing || isTranscribing || !(recordedBlob || uploadedFile)}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--bg-input)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                <span>{isTranscribing ? 'Transcribing...' : 'Transcribe Audio'}</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateHandover}
                disabled={isProcessing || isTranscribing || !manualNotes.trim()}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#000000] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#f5f5f5] dark:text-[#050505] dark:hover:bg-white"
              >
                <Sparkles className="h-4 w-4" />
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
          <section className="mx-auto flex w-full max-w-md flex-col gap-4 pb-28 animate-fade-in scroll-mt-24 xl:max-w-7xl">
            <div
              className="sticky z-30 -mx-1 space-y-2 bg-[var(--bg-main)] px-1 pb-2 pt-1"
              style={{ top: 'calc(4rem + env(safe-area-inset-top, 0px))' }}
            >
            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                {getBedIdentifier(handoverResult.patientBed) ? (
                  <div className="flex h-12 min-w-12 shrink-0 items-center justify-center rounded-full bg-[#16233f] px-2 text-sm font-bold text-white">
                    {getBedIdentifier(handoverResult.patientBed)}
                  </div>
                ) : (
                  <span className="shrink-0 text-sm font-medium text-[var(--text-muted)]">Not recorded</span>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-bold text-[var(--text-primary)]">{formatBedLabel(handoverResult.patientBed) ?? 'Bed not recorded'}</span>
                  </div>
                  <p className="mt-0.5 break-words text-xs text-[var(--text-secondary)]">
                    {handoverResult.patientReference ? `Patient reference: ${handoverResult.patientReference}` : 'No patient reference documented'}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
                <span className="hidden rounded-full border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] sm:inline-flex">
                  {handoverResult.createdAt ? new Date(handoverResult.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', hour12: false }) : 'Saved handover'}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDeleteCurrentHandover()}
                  disabled={!handoverResult.caseId}
                  aria-label="Delete handover"
                  title="Delete handover"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-500/25 bg-rose-500/10 text-rose-700 transition-colors hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleExportPdf()}
                  disabled={isExportingPdf}
                  aria-label="Export handover"
                  title="Export handover"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-main)] bg-[var(--bg-card-muted)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-input)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="rounded-full border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] sm:hidden">
                  {handoverResult.createdAt ? new Date(handoverResult.createdAt).toLocaleDateString('en-US') : 'Saved'}
                </span>
              </div>
            </div>

            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setHandoverResult(null);
                  setActiveScreen('dashboard');
                }}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-card-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Dashboard</span>
              </button>
            </div>

            {/* Transcript Preview Box: keep the original source text visible for review. */}
            <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-4 shadow-sm sm:p-5">
              <div className="flex flex-col items-start gap-2 mb-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                <span className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#315f9f] dark:text-[#8AB4FF]" />
                  Original Handover Transcript
                </span>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Source transcript used to generate this handover.</p>
                </div>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  Shift: {handoverResult.shift}
                </span>
              </div>
              <p className="whitespace-pre-wrap break-words rounded-xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] p-3.5 text-sm leading-7 text-[var(--text-secondary)]">
                {handoverResult.rawTranscript || 'Original transcript is not available for this handover.'}
              </p>
            </div>

            {/* Cards for all 5 Categories: Pending, Follow-up, Completed, Communication, Needs verification */}
            <HandoverDashboardCards items={handoverResult.items} />
          </section>
        )}

        {activeScreen === 'dashboard' && !handoverResult && !isProcessing && !errorMessage && (
          <section className="mx-auto flex w-full max-w-4xl flex-col gap-5 pb-28 animate-fade-in">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Clinical workspace</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)]">Dashboard</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">Your saved handovers at a glance.</p>
              </div>
              <button type="button" onClick={() => setActiveScreen('input')} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#000000] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF] dark:bg-[#f5f5f5] dark:text-[#050505] dark:hover:bg-white">
                Start new handover
              </button>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-4 py-3 text-sm">
              <div>
                <span className="block text-[var(--text-secondary)]">Saved handovers</span>
                <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                  {savedList[0]?.created_at ? `Latest ${new Date(savedList[0].created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', hour12: false })}` : 'No saved record yet'}
                </span>
              </div>
              <span className="font-semibold text-[var(--text-primary)]">{savedList.length}</span>
            </div>

            <div className="flex min-w-0 items-center justify-between gap-3 text-xs font-semibold text-[var(--text-secondary)]">
              <span>Sort saved handovers</span>
              <div className="relative" data-saved-sort-menu>
                <button type="button" onClick={() => setIsSavedSortOpen((open) => !open)} aria-haspopup="menu" aria-expanded={isSavedSortOpen} className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] px-3 text-sm font-normal text-[var(--text-primary)] outline-none hover:bg-[var(--bg-card-muted)] focus-visible:ring-2 focus-visible:ring-[#8AB4FF]">
                  <span className="max-w-[10rem] truncate">{savedSort === 'newest' ? 'Newest first' : savedSort === 'patient' ? 'Patient reference' : 'Bed number'}</span>
                  <ChevronDown className="h-4 w-4 shrink-0" />
                </button>
                {isSavedSortOpen && (
                  <div role="menu" className="absolute right-0 top-12 z-40 w-52 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-1.5 shadow-xl">
                    {(['newest', 'patient', 'bed'] as const).map((mode) => (
                      <button key={mode} type="button" role="menuitemradio" aria-checked={savedSort === mode} onClick={() => { setSavedSort(mode); setIsSavedSortOpen(false); }} className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]">
                        <span>{mode === 'newest' ? 'Newest first' : mode === 'patient' ? 'Patient reference' : 'Bed number'}</span>
                        {savedSort === mode && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <SavedHandoversModal
              isOpen
              presentation="screen"
              showCloseButton={false}
              onClose={() => setActiveScreen('input')}
              savedHandovers={savedList}
              sortMode={savedSort}
              isLoading={isLoadingSaved}
              errorMessage={savedListError}
              onSelectCase={handleLoadSavedCase}
              onDeleteCase={requestDeleteSavedCase}
              onExportCase={handleExportSavedPdf}
              exportingCaseId={exportingSavedAction?.endsWith(':pdf') ? exportingSavedAction.slice(0, -4) : null}
              exportError={exportError}
            />
          </section>
        )}

        {activeScreen === 'export' && (
          <section className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-28">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">Export</h2>
              <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">Export the current handover using the existing available formats.</p>
            </div>
            {handoverResult ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-5">
                <div className="relative self-end" data-export-menu>
                  <button type="button" aria-haspopup="menu" aria-expanded={isCurrentExportMenuOpen} onClick={() => setIsCurrentExportMenuOpen((open) => !open)} disabled={isExportingPdf} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-input)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]">
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {isExportingPdf ? 'Exporting...' : pdfExported ? 'PDF Downloaded!' : 'Export'}
                  </button>
                  {isCurrentExportMenuOpen && !isExportingPdf && (
                    <div role="menu" aria-label="Export current handover" className="absolute right-0 top-12 z-40 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-2 shadow-xl">
                      <button type="button" role="menuitem" onClick={() => { setIsCurrentExportMenuOpen(false); handleExportPdf(); }} className="flex min-h-11 w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]"><FileDown className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span><span className="block text-sm font-semibold">PDF</span><span className="block text-xs text-[var(--text-muted)]">Readable document for viewing or sharing.</span></span></button>
                      <button type="button" role="menuitem" onClick={() => { setIsCurrentExportMenuOpen(false); handleExportJson(); }} className="mt-1 flex min-h-11 w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]"><FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span><span className="block text-sm font-semibold">JSON</span><span className="block text-xs text-[var(--text-muted)]">Structured handover data.</span></span></button>
                      <button type="button" onClick={() => setIsCurrentExportMenuOpen(false)} className="mt-1 min-h-10 w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-card-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]">Cancel</button>
                    </div>
                  )}
                </div>
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
                        <div className="min-w-0 space-y-1">
                          <p className="break-words text-base font-semibold text-[var(--text-primary)]">
                            Bed: {getBedIdentifier(item.patient_bed) ?? 'Not recorded'}
                          </p>
                          <p className="break-words text-sm text-[var(--text-secondary)]">
                            {item.patient_reference || 'Patient reference not recorded'}
                          </p>
                          <p className="text-sm text-[var(--text-muted)]">
                            Saved {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="relative w-full sm:w-auto" data-export-menu>
                          <button
                            type="button"
                            aria-haspopup="menu"
                            aria-expanded={exportMenuCaseId === item.case_id}
                            onClick={() => setExportMenuCaseId((current) => current === item.case_id ? null : item.case_id)}
                            disabled={exportingSavedAction !== null}
                            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-main)] bg-[var(--bg-card-muted)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-input)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF] sm:w-32"
                          >
                            <FileDown className="h-4 w-4" aria-hidden="true" />
                            {exportingSavedAction === pdfKey || exportingSavedAction === jsonKey ? 'Exporting...' : 'Export'}
                          </button>
                          {exportMenuCaseId === item.case_id && exportingSavedAction === null && (
                            <div role="menu" aria-label={`Export ${formatBedLabel(item.patient_bed) ?? 'handover'}`} className="absolute right-0 top-12 z-40 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-2 shadow-xl">
                              <button type="button" role="menuitem" onClick={() => handleSavedExportChoice(item.case_id, 'pdf')} className="flex min-h-11 w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]">
                                <FileDown className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                <span><span className="block text-sm font-semibold">PDF</span><span className="block text-xs text-[var(--text-muted)]">Readable document for viewing or sharing.</span></span>
                              </button>
                              <button type="button" role="menuitem" onClick={() => handleSavedExportChoice(item.case_id, 'json')} className="mt-1 flex min-h-11 w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]">
                                <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                <span><span className="block text-sm font-semibold">JSON</span><span className="block text-xs text-[var(--text-muted)]">Structured handover data.</span></span>
                              </button>
                              <button type="button" onClick={() => setExportMenuCaseId(null)} className="mt-1 min-h-10 w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-card-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4FF]">Cancel</button>
                            </div>
                          )}
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
              onDeleteCase={requestDeleteSavedCase}
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
        onLogin={() => { if (!currentUser) setActiveScreen('login'); }}
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
          onDeleteCase={requestDeleteSavedCase}
          onExportCase={handleExportSavedCase}
          exportingCaseId={exportingCaseId}
          exportError={exportError}
        />
      )}

      {/* Footer */}
      {currentUser && <footer className="mt-auto border-t border-[var(--border-main)] bg-[var(--bg-card)] py-6 transition-colors duration-200">
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
      </footer>}
      </div>
    </div>
  );
};

export default App;
