import type { HandoverOutput, HandoverItem } from '../types/handover';
import { SAMPLE_HANDOVER_OUTPUT } from '../data/sampleData';

/**
 * Handover API Service
 * Calls the FastAPI backend: POST /process-handover, GET /handovers, GET /handovers/{case_id}.
 * The Vite dev server proxies /api -> http://127.0.0.1:8000, so no CORS
 * configuration is needed in development.
 */

const PROCESS_URL = '/api/process-handover';
const TRANSCRIBE_URL = '/api/transcribe';
const HANDOVERS_URL = '/api/handovers';

export interface AuthenticatedUser {
  user_id: string;
  staff_id: string;
}

export class SessionExpiredError extends Error {
  constructor() {
    super('Your session has expired. Please sign in again.');
    this.name = 'SessionExpiredError';
  }
}

const fetchWithSession = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const response = await fetch(input, { ...init, credentials: 'include' });
  if (response.status === 401) {
    window.dispatchEvent(new Event('handoverguard:session-expired'));
    throw new SessionExpiredError();
  }
  return response;
};

export const getCurrentUser = async (): Promise<AuthenticatedUser | null> => {
  const response = await fetch('/api/me', { credentials: 'include' });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Could not verify the current session (status ${response.status}).`);
  return response.json() as Promise<AuthenticatedUser>;
};

export const login = async (staffId: string, password: string): Promise<AuthenticatedUser> => {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ staff_id: staffId, password })
  });
  const body = await response.json().catch(() => null) as { detail?: string; error?: { message?: string } } | null;
  if (!response.ok) throw new Error(body?.error?.message || body?.detail || 'Invalid staff ID or password.');
  return body as AuthenticatedUser;
};

export const logout = async (): Promise<void> => {
  const response = await fetchWithSession('/api/logout', { method: 'POST' });
  if (!response.ok) throw new Error('Could not sign out. Please try again.');
};

/**
 * Upload audio to local Whisper STT. The returned transcript must be
 * reviewed and edited by the clinician before generateHandover is called.
 */
export const transcribeAudio = async (audio: Blob | File): Promise<string> => {
  const formData = new FormData();
  const filename =
    audio instanceof File
      ? audio.name
      : audio.type.includes('webm')
        ? 'recording.webm'
        : audio.type.includes('mp4')
          ? 'recording.m4a'
          : 'recording.wav';

  formData.append('audio', audio, filename);

  const response = await fetchWithSession(TRANSCRIBE_URL, {
    method: 'POST',
    body: formData
  });

  const body = await response.json().catch(() => null) as {
    transcript?: unknown;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(
      body?.error?.message || `Transcription failed with status ${response.status}.`
    );
  }

  if (typeof body?.transcript !== 'string') {
    throw new Error('The transcription service returned an invalid response.');
  }

  if (!body.transcript.trim()) {
    throw new Error(
      'No speech was recognized. Please check the recording or enter the notes manually.'
    );
  }

  return body.transcript;
};

/** Response shape returned by the backend (do not rename backend fields). */
export interface BackendHandover {
  case_id?: string;
  patient_reference: string | null;
  patient_bed: string | null;
  completed: string[];
  pending: string[];
  follow_up: string[];
  communication: string[];
  unclear_or_undocumented: string[];
  created_at?: string;
}

export interface SavedHandoverSummary {
  case_id: string;
  patient_reference: string | null;
  patient_bed: string | null;
  created_at: string;
}

export interface GenerateHandoverPayload {
  audioBlob?: Blob;
  audioFile?: File;
  rawText?: string;
  patientBed?: string;
}

function toItems(category: HandoverItem['category'], texts: string[], patient?: string): HandoverItem[] {
  return texts.map((text, index) => ({
    id: `${category}-${index + 1}`,
    category,
    title: text,
    patient: patient || undefined
  }));
}

/** Map the backend's contract onto the frontend's display model. */
export function mapBackendResponse(
  backend: BackendHandover,
  transcript: string,
  extra?: { caseId?: string; createdAt?: string }
): HandoverOutput {
  const now = new Date();
  const caseId = extra?.caseId || backend.case_id;
  const createdAt = extra?.createdAt || backend.created_at || now.toISOString();

  return {
    id: caseId || `HO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`,
    shift: 'Ward handover (AI-organised draft)',
    timestamp: createdAt,
    caseId: caseId,
    patientReference: backend.patient_reference ?? null,
    patientBed: backend.patient_bed ?? null,
    createdAt: createdAt,
    // Metrics UNIMPLEMENTED in dashboard; kept for JSON schema compatibility
    summary: {
      patientCount: backend.patient_reference ? 1 : 0,
      criticalAlerts: 0,
      pendingTasks: backend.pending.length,
      followupsDue: backend.follow_up.length
    },
    items: {
      pending: toItems('pending', backend.pending, backend.patient_reference ?? undefined),
      followup: toItems('followup', backend.follow_up, backend.patient_reference ?? undefined),
      completed: toItems('completed', backend.completed, backend.patient_reference ?? undefined),
      communication: toItems('communication', backend.communication, backend.patient_reference ?? undefined),
      verification: toItems('verification', backend.unclear_or_undocumented, backend.patient_reference ?? undefined)
    },
    rawTranscript: transcript
  };
}

export const generateHandover = async (
  payload: GenerateHandoverPayload,
  useMock = false
): Promise<HandoverOutput> => {
  if (useMock) {
    await new Promise((resolve) => setTimeout(resolve, 1800));
    return {
      ...SAMPLE_HANDOVER_OUTPUT,
      rawTranscript: payload.rawText?.trim() || SAMPLE_HANDOVER_OUTPUT.rawTranscript,
      timestamp: new Date().toISOString()
    };
  }

  // Require reviewed typed/pasted notes; audio must be transcribed before
  // calling this endpoint.
  const transcript = payload.rawText?.trim();
  if (!transcript) {
    throw new Error(
      'Please transcribe the audio first or enter the handover notes manually.'
    );
  }

  const response = await fetchWithSession(PROCESS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, patient_bed: payload.patientBed?.trim() || null })
  });

  if (!response.ok) {
    // Backend errors use {"error": {"code", "message"}} where possible.
    let message = `Backend responded with status ${response.status}`;
    try {
      const body = await response.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      /* keep the status-based message */
    }
    throw new Error(message);
  }

  const backend = (await response.json()) as BackendHandover;

  // Use the exact saved record metadata returned by the backend.
  return mapBackendResponse(backend, transcript);
};
/**
 * Fetch all saved handover cases from the SQLite database.
 */
export const fetchSavedHandovers = async (): Promise<SavedHandoverSummary[]> => {
  const response = await fetchWithSession(HANDOVERS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch saved handovers with status ${response.status}.`);
  }
  return response.json();
};

/**
 * Fetch a specific saved handover case by its unique case_id.
 */
export const fetchSavedHandoverById = async (caseId: string): Promise<HandoverOutput> => {
  const response = await fetchWithSession(`${HANDOVERS_URL}/${encodeURIComponent(caseId)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch handover "${caseId}" with status ${response.status}.`);
  }
  const record = (await response.json()) as BackendHandover & {
    case_id: string;
    transcript: string;
    created_at: string;
  };

  return mapBackendResponse(record, record.transcript || '', {
    caseId: record.case_id,
    createdAt: record.created_at
  });
};

/**
 * Delete one saved handover from the SQLite-backed API.
 */
export const deleteSavedHandover = async (caseId: string): Promise<void> => {
  const response = await fetchWithSession(
    `${HANDOVERS_URL}/${encodeURIComponent(caseId)}`,
    { method: 'DELETE' }
  );

  const body = await response.json().catch(() => null) as {
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(
      body?.error?.message ||
      `Failed to delete handover with status ${response.status}.`
    );
  }
};
