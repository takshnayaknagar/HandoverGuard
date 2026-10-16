import type { HandoverOutput, HandoverItem } from '../types/handover';
import { SAMPLE_HANDOVER_OUTPUT } from '../data/sampleData';

/**
 * Handover API Service
 * Calls the FastAPI backend (Person 3): POST /process-handover.
 * The Vite dev server proxies /api -> http://127.0.0.1:8000, so no CORS
 * configuration is needed in development.
 */

const PROCESS_URL = '/api/process-handover';
const TRANSCRIBE_URL = '/api/transcribe';

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

  const response = await fetch(TRANSCRIBE_URL, {
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
interface BackendHandover {
  patient_reference: string | null;
  completed: string[];
  pending: string[];
  follow_up: string[];
  communication: string[];
  unclear_or_undocumented: string[];
}

export interface GenerateHandoverPayload {
  audioBlob?: Blob;
  audioFile?: File;
  rawText?: string;
}

function toItems(category: HandoverItem['category'], texts: string[], patient?: string): HandoverItem[] {
  return texts.map((text, index) => ({
    id: `${category}-${index + 1}`,
    category,
    title: text,
    patient: patient || undefined
  }));
}

/** Map the backend's six-field contract onto the frontend's display model. */
function mapBackendResponse(backend: BackendHandover, transcript: string): HandoverOutput {
  const now = new Date();
  return {
    id: `HO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`,
    shift: 'Ward handover (AI-organised draft)',
    timestamp: now.toISOString(),
    // UNIMPLEMENTED METRICS â€” the dashboard does not render `summary`; it only
    // appears in the Export JSON file. Treat both values as "not assessed":
    // - patientCount: 1/0 indicates whether a patient reference was stated in
    //   the transcript, NOT a count of unique patients.
    // - criticalAlerts: always 0, which means "no critical-alert detection
    //   exists", NEVER "no critical clinical issues".
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

  const response = await fetch(PROCESS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript })
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
  return mapBackendResponse(backend, transcript);
};
