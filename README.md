# HandoverGuard Backend

## Project Overview

HandoverGuard is an AI-assisted medical handover organization tool developed as a hackathon prototype.

The system takes a doctor's voice note, converts it into text using a separate speech-to-text component, and organizes the transcript into a structured handover for review by healthcare professionals.

This repository contains the backend and AI processing component.

## My Scope

The backend is responsible for:

* Accepting a text transcript.
* Sending the transcript to an LLM API.
* Extracting information into predefined categories.
* Validating the AI response.
* Returning structured JSON to the frontend.
* Handling invalid input and processing failures.

The backend does not record audio, perform speech-to-text, or implement the frontend dashboard.

## Technology Stack

* Python
* FastAPI
* Uvicorn
* Pydantic
* Groq via the official `groq` SDK (`openai/gpt-oss-120b`)
* pytest for automated testing

## Expected Workflow

1. A doctor records a voice note.
2. The speech-to-text component produces a transcript.
3. The frontend sends the transcript to the backend.
4. The backend sends the transcript to the LLM.
5. The response is validated against the expected schema.
6. The backend returns structured JSON.
7. The frontend displays the result for human review.

## Handover Categories

The API response should contain:

* `patient_reference`: A documented patient or bed reference, or null.
* `completed`: Explicitly documented completed actions.
* `pending`: Explicitly documented pending tasks or results.
* `follow_up`: Documented follow-up actions.
* `communication`: Documented communication with patients, families, or healthcare professionals.
* `unclear_or_undocumented`: Important ambiguities, contradictions, or explicitly identified documentation gaps.

Missing information must not automatically be interpreted as evidence that an action was not performed.

## API Endpoints

### GET /health

Checks whether the backend is running.

### POST /process-handover

Accepts a transcript, sends ONE Groq call with strict schema-constrained JSON output, independently re-validates the result against the six-field schema, and returns the handover draft.

Example request:

```
{
  "transcript": "Blood test results are pending. Cardiology review tomorrow."
}
```

Example response:

```
{
  "patient_reference": "Bed 4",
  "completed": ["Morning medications given"],
  "pending": ["Blood test results are pending"],
  "follow_up": ["Cardiology review tomorrow at 10am"],
  "communication": ["Spoke with the daughter about the plan"],
  "unclear_or_undocumented": ["Not sure if the evening antibiotics were given"]
}
```

Error responses always use one shape:

```
{ "error": { "code": "<machine_code>", "message": "<safe, human-readable>" } }
```

| Situation | Status | `code` |
| --- | --- | --- |
| Empty or whitespace-only transcript | 400 | `invalid_input` |
| Transcript over `MAX_TRANSCRIPT_CHARS` (default 10000) | 400 | `invalid_input` |
| Missing `transcript` field, wrong type, or malformed JSON body | 422 | `invalid_request_body` |
| `GROQ_API_KEY` not configured on the server | 503 | `llm_not_configured` |
| Provider rejected credentials or quota/rate limit | 503 | `llm_auth_or_quota` |
| Provider unreachable or failing (after one bounded retry) | 503 | `llm_unavailable` |
| Overall processing deadline (~30 s) expired | 504 | `processing_timeout` |
| Provider returned empty/blocked/schema-invalid output | 502 | `llm_invalid_response` |

Error messages never contain the API key or raw provider responses.

CORS is enabled only for `FRONTEND_ORIGIN` (default `http://localhost:3000`).

**The output is an unverified draft that requires clinician review.** The extraction prompt forbids inventing facts: a mentioned task is never treated as completed, ambiguous or incomplete medication instructions are flagged in `unclear_or_undocumented` instead of guessed, `patient_reference` stays null unless explicitly stated, and an empty list means "not documented" — never "nothing outstanding". Transcript content is treated as untrusted data, not as instructions.

## Development Status

The backend will be developed in stages:

1. Project setup and health endpoint. (complete)
2. Transcript input and mock response. (complete)
3. LLM integration (Groq, migrated from Gemini). (complete)
4. Output validation and error handling. (implemented in Stage 3)
5. Automated tests.
6. Frontend integration.
7. Documentation and final verification.

Features should be marked complete only after implementation and testing.

## Setup

Prerequisites:

* Python 3.11 or a compatible supported version.
* pip.
* Git, if collaborating through a Git repository.

Create a virtual environment:

### Windows PowerShell

```
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

Install the project dependencies after `requirements.txt` has been created:

```
pip install -r requirements.txt
```

Start the server after `main.py` has been implemented:

```
uvicorn main:app --reload
```

The exact command may change if the project uses a different application entry point.

Open the following local URLs:

* API health check: http://127.0.0.1:8000/health
* Interactive API documentation: http://127.0.0.1:8000/docs

## Environment Variables

Copy `.env.example` to `.env` and add your Groq API key (free key at https://console.groq.com/keys):

```
GROQ_API_KEY=your-key-here
LLM_MODEL=openai/gpt-oss-120b
```

The model must support strict JSON-schema structured outputs — `openai/gpt-oss-120b` and `openai/gpt-oss-20b` do. If the API reports a model is unavailable, update `LLM_MODEL` in both `.env` and `.env.example`.

Never commit `.env` or expose API keys in frontend code.

## Testing

Run automated tests with:

```
pytest
```

All automated tests are mocked and make no network calls. The suite includes one opt-in live test against the real Groq API (clearly fictional transcript); it is skipped unless `RUN_LIVE_TESTS=1` is set AND `GROQ_API_KEY` is configured.

## Frontend Integration (Person 1's React app)

The repository now contains both the FastAPI backend (repo root: `main.py`, `app/`) and the React + Vite frontend (repo root: `src/`, `package.json`). npm is the package manager.

### Running both apps (development)

Backend (repo root):

```
.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Frontend (repo root, second terminal):

```
npm install
npm run dev
```

Expected local addresses:

* Frontend dashboard: http://localhost:5173
* Backend API: http://127.0.0.1:8000 (health check at http://127.0.0.1:8000/health; interactive docs at http://127.0.0.1:8000/docs)

### How the frontend reaches the backend

The frontend calls `/api/process-handover` (same origin). The Vite development
server (`vite.config.ts`) proxies `/api/*` to `http://127.0.0.1:8000` and strips
the `/api` prefix, so the backend receives its normal `POST /process-handover`.
No CORS changes are needed in development. Note: `INTEGRATION_CONTRACT.md`
describes an older planned contract and is superseded — this section and
"API Endpoints" above describe the real one.

### End-to-end test (synthetic data only)

1. Start both apps as above.
2. Open http://localhost:5173 and paste a fictional transcript into
   "Manual Notes / Transcript Backup", e.g.:
   "Patient 104. Blood pressure was checked at 2 PM and recorded as 120 over 80.
   Blood test result is still pending. The patient's family asked about the
   expected discharge time. An ECG was requested, but the note does not confirm
   whether it was completed."
3. Click **Generate Handover** — the dashboard should show real AI output:
   the blood test under Pending, the family question under Communication, and
   the unconfirmed ECG under Needs Verification (never marked as missed).

Current limitation: **audio recording/upload is not connected to transcription
yet** (awaiting Person 2's speech-to-text integration). Audio-only submissions
show an honest error; manual text entry is the working path.

Generated handovers are **unverified drafts that require clinician review**,
and all demo/testing transcripts must use synthetic patient data only.

## Speech-to-Text (POST /transcribe)

The backend also runs **local** speech-to-text (faster-whisper, Whisper "base" model, CPU int8 — same configuration as Person 2's transcription work). No audio is sent to any external service.

```
POST /transcribe   (multipart/form-data, field "audio")
```

* Success: `200 {"transcript": "recognized text"}`.
* Supported formats: WAV, MP3, OGG, M4A, WEBM — validated by file-content signature; filename and declared MIME type are not trusted.
* Limits: max 25 MB (`MAX_AUDIO_MB`), enforced while streaming; uploads are written to a temporary file outside the repository and deleted on every request path — except that a timed-out transcription, whose worker thread continues server-side, deletes its own file when it eventually finishes (on Windows the file cannot be removed while the decoder still holds it open).
* Errors: `audio_invalid` / `audio_too_large` (400), `stt_model_error` (503), `stt_busy` (503 — bounded concurrent jobs), `stt_timeout` (504).

### First-run model download and demo preparation

The ~150 MB Whisper model downloads automatically on the **first** `/transcribe` request. To avoid a delay during a demo, warm it up once beforehand:

```
.venv\Scripts\python.exe -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8')"
```

Expected CPU latency is roughly real-time (a 60-second note takes about 30–90 seconds to transcribe). Keep demo recordings short.

### Important limitation

**Transcription is not guaranteed accurate.** The returned transcript must be reviewed and edited by a clinician in the frontend before clicking Generate — only the reviewed text is sent to `/process-handover`. A transcription timeout bounds the API response but does not cancel the CPU work server-side (documented behaviour).

## Safety and Limitations

HandoverGuard is a prototype for organizing documented information. It is not a diagnostic system and must not replace clinical judgment or professional verification.

The system must not invent medical facts, diagnoses, medications, dosages, or treatment instructions.

Ambiguous information should be flagged for human review.

Use fictional or properly de-identified transcripts for development and demonstrations. Do not use real patient information without appropriate authorization and safeguards.

## Team Integration

Person 1: Frontend and dashboard.

Person 2: Audio processing and speech-to-text.

Person 3: Backend and AI processing.

Person 4: Sample transcripts, testing, and demonstration support.

The API request and response schemas must be agreed upon before frontend integration.
