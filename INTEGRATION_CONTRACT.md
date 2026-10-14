# ⚠️ SUPERSEDED — DO NOT IMPLEMENT FROM THIS DOCUMENT

This document was written before the backend integration and describes the
original planned contract (multipart `POST /api/handover/process` with audio
upload and a rich object response). **That contract is NOT the active one.**

**Active integration flow (working and tested):**

1. The frontend sends manual transcript text as JSON:
   `POST /api/process-handover` with body `{"transcript": "..."}`.
2. `/api` is a Vite development-proxy prefix only (`vite.config.ts` forwards
   `/api/*` to `http://127.0.0.1:8000`, stripping the prefix). The backend
   route itself is `POST /process-handover`.
3. The backend returns the six-field handover:
   `{"patient_reference": string|null, "completed": [], "pending": [],
   "follow_up": [], "communication": [], "unclear_or_undocumented": []}`
   (string arrays except `patient_reference`).
4. The adapter (`src/services/handoverApi.ts`) maps these fields to the UI
   categories (pending / followup / completed / communication / verification).

**Audio transcription is NOT integrated yet** (awaiting Person 2's
speech-to-text work). Audio-only submissions are rejected with an honest
error; manual text entry is the working path.

The original spec below is kept for historical context only.

---

# HandoverGuard Frontend Integration Spec (Person 1 ⟷ Person 2)

This document specifies the exact contract between Person 1 (Frontend) and Person 2 (Backend / AI Pipeline).

---

## 1. Endpoint Contract

### POST `/api/handover/process`

Used by the frontend when sending voice dictation, prerecorded audio, or manual notes for AI categorization.

#### Request Format: `multipart/form-data`
- `audio`: File (binary audio blob - `audio/webm`, `audio/wav`, `audio/mp3`, or `audio/m4a`) *(Optional if `notes` is provided)*
- `notes`: String (manual handover notes or pre-transcribed text) *(Optional if `audio` is provided)*
- `shift`: String (e.g., `"Ward 4B - Acute Medical (Night Shift)"`) *(Optional)*

#### Response Format: `application/json` (HTTP 200)

```json
{
  "id": "HO-2026-1014-NIGHT",
  "shift": "Night Shift Handover (Ward 4B - Acute Medical)",
  "timestamp": "2026-10-13T21:45:00Z",
  "rawTranscript": "Handover for Bed 12, John Doe: Blood pressure checked at 21:00, stable at 124/82. Blood test for cardiac enzymes sent at 20:30, result is awaited...",
  "summary": {
    "patientCount": 6,
    "criticalAlerts": 1,
    "pendingTasks": 3,
    "followupsDue": 2
  },
  "items": {
    "pending": [
      {
        "id": "p-1",
        "category": "pending",
        "title": "Blood test result awaited",
        "description": "Cardiac enzyme panel sent at 20:30 to pathology. Lab turn-around expected ~22:30.",
        "patient": "Bed 12 - John Doe",
        "urgency": "high"
      }
    ],
    "followup": [
      {
        "id": "f-1",
        "category": "followup",
        "title": "Review blood test result when available",
        "description": "If troponin is elevated > 14 ng/L, notify Registrar on call immediately.",
        "patient": "Bed 12 - John Doe",
        "urgency": "critical"
      }
    ],
    "completed": [
      {
        "id": "c-1",
        "category": "completed",
        "title": "Blood pressure checked",
        "description": "BP 124/82 mmHg, HR 74 bpm regular, SpO2 98% room air.",
        "patient": "Bed 12 - John Doe",
        "urgency": "low"
      }
    ],
    "communication": [
      {
        "id": "com-1",
        "category": "communication",
        "title": "Family asked about discharge",
        "description": "Advised them Dr. Reynolds rounds at 09:00.",
        "patient": "Bed 14 - Mary Jenkins",
        "urgency": "low"
      }
    ],
    "verification": [
      {
        "id": "v-1",
        "category": "verification",
        "title": "ECG completion status is not documented",
        "description": "Needs verification with night nurse or technician before morning ward round.",
        "patient": "Bed 14 - Mary Jenkins",
        "urgency": "high"
      }
    ]
  }
}
```

#### Error Format (HTTP 4xx / 5xx)

```json
{
  "error": "Transcription failed: audio too quiet or noisy to discern speech."
}
```

---

## 2. Frontend Features Built (Person 1)

1. **Header & Context Bar**: Real-time ward status, ISBAR protocol adherence badges, system health indicator.
2. **Direct Voice Recorder**:
   - Browser `MediaRecorder` API capture with mime-type autodetection (`audio/webm`, `audio/mp4`).
   - Recording status with timer indicator (MM:SS).
   - Audio playback preview with timeline and play/pause controls before submission.
3. **Audio File Uploader**:
   - Drag-and-drop & file browser for prerecorded dictation files (`.mp3`, `.wav`, `.m4a`, `.webm`, `.ogg`).
   - Clear and replace buttons with file size formatting.
4. **Manual Notes Backup**:
   - Fallback textarea with live character counter.
   - One-click **"Load Hospital Sample Note"** button for immediate judge demonstrations.
5. **Categorized Handover Dashboard**:
   - **Pending** card (e.g., Blood test result awaited).
   - **Follow-up** card (e.g., Review blood test result when available).
   - **Completed** card (e.g., Blood pressure checked).
   - **Communication** card (e.g., Family asked about discharge).
   - **Needs verification** card (e.g., ECG completion status is not documented).
   - Card urgency badges (`Critical`, `High`, `Medium`).
   - Patient tag affiliation (e.g., `Bed 12 - John Doe`).
6. **Robust UX & State Management**:
   - Loading indicator with progress and clinical safety validation feedback.
   - Comprehensive error display with retry trigger.
   - "Test Error" button to showcase error handling to judges.
   - "Copy Summary" and "Export JSON" functionality for clinical handover distribution.
