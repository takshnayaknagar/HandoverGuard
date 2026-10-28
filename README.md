# HandoverGuard

HandoverGuard is a mobile-first, AI-assisted healthcare handover web application built as a hackathon prototype. It organizes information from a clinician-reviewed transcript into structured handover categories and provides access to saved handovers.

> **Clinical safety notice:** HandoverGuard produces unverified drafts, not clinical decisions. Healthcare professionals must review the transcript and generated output. It must not be used as a substitute for clinical judgment.

## Features

- **Manual transcript input:** Submit handover notes for structuring.
- **Speech-to-text:** Transcribe supported audio locally using Faster-Whisper.
- **AI-assisted structuring:** Organize documented information using Groq.
- **Structured handover categories:** Separate completed actions, pending tasks, follow-ups, communication, and unclear or undocumented information.
- **Authentication:** Cookie-based login and logout; no public self-registration.
- **Saved handovers:** Persist, list, retrieve, and delete handovers belonging to the authenticated user.
- **PDF export:** Export saved handovers to PDF from the frontend.
- **Responsive interface:** A React/Vite web application designed for desktop and mobile-sized screens.

## Technology stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Python, FastAPI, Pydantic
- **AI provider:** Groq, using `openai/gpt-oss-120b`
- **Speech-to-text:** Faster-Whisper, using the `base` model with CPU `int8` computation
- **Database:** SQLite
- **PDF generation:** jsPDF
- **Testing:** pytest

## How it works

1. A clinician enters a transcript or records/uploads supported audio.
2. If audio is used, the backend transcribes it locally.
3. The clinician reviews and corrects the transcript before submitting it for structuring.
4. The backend sends the transcript to the AI provider and validates the returned data.
5. The application displays the structured handover for professional review.
6. Successful handovers are saved in SQLite and can be accessed later by the authenticated owner.
7. Saved handovers can be exported as PDFs.

## Handover categories

The structured response contains six fields:

| Field | Purpose |
|---|---|
| `patient_reference` | A patient, bed, or other reference explicitly documented in the transcript; otherwise `null`. |
| `completed` | Actions explicitly documented as completed. |
| `pending` | Documented outstanding tasks, results, or actions. |
| `follow_up` | Documented follow-up actions. |
| `communication` | Documented communication with patients, families, or healthcare professionals. |
| `unclear_or_undocumented` | Important ambiguities, contradictions, or information that requires verification. |

### Safety rules

- A task being mentioned does not mean it was completed.
- Missing information must not be treated as proof that an action was not performed.
- An empty list means that no information was documented in that category, not that there is nothing outstanding.
- The AI must not invent facts to fill gaps.

## API overview

The backend runs on port `8000`. During local development, the Vite server proxies frontend requests from `/api/...` to the corresponding backend routes, stripping the `/api` prefix.

| Method | Backend route | Purpose | Authentication |
|---|---|---|---|
| `GET` | `/health` | Health check | Not required |
| `POST` | `/login` | Authenticate a provisioned account and establish a session | Not required |
| `POST` | `/logout` | Revoke the session and clear the session cookie | Session required |
| `GET` | `/me` | Return the current authenticated user's information | Session required |
| `POST` | `/process-handover` | Validate, process, and save a handover | Session required |
| `POST` | `/transcribe` | Transcribe an uploaded audio file | Session required |
| `GET` | `/handovers` | List the current user's saved handovers | Session required |
| `GET` | `/handovers/{case_id}` | Retrieve a saved handover owned by the current user | Session required |
| `DELETE` | `/handovers/{case_id}` | Delete a saved handover owned by the current user | Session required |

### Processing a handover

`POST /process-handover` accepts JSON containing a transcript:

```json
{
  "transcript": "Blood test results are pending. Cardiology review tomorrow."
}
```

The successful response contains the six structured handover fields, together with saved-record metadata such as `case_id` and `created_at`.

Errors use a consistent structure:

```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable error message"
  }
}
```

The backend validates input and AI output. A successful HTTP response does not mean the handover is clinically verified.

### Speech-to-text

`POST /transcribe` accepts `multipart/form-data` with the file field named `audio`.

- **Successful response:** `{"transcript": "recognized text"}`
- **Supported formats:** WAV, MP3, OGG, M4A, WEBM
- **Maximum audio upload size:** 25 MB
- **Local processing:** Transcription uses Faster-Whisper locally; audio is not sent to an external speech-to-text provider.
- **Transcript review:** The transcript must be reviewed and corrected before it is submitted for AI structuring.

The Whisper model may download on the first transcription request. Warm up the model before a live demonstration to reduce first-request delays.

## Authentication and saved data

The current application uses cookie-based authentication. Accounts are provisioned by the system administrator; public self-registration is not available.

### Create a demo account

From the repository root, open PowerShell and activate the project's virtual environment:

```powershell
.venv\Scripts\Activate.ps1
```

Set the staff identifier and run the account-provisioning script:

```powershell
$env:HANDOVERGUARD_DEMO_STAFF_ID = "STAFF-001"
python -m tools.provision_demo_account
```

Replace `STAFF-001` with the desired staff identifier. Follow the script's prompts for any remaining required inputs, including the password if prompted.

The script uses the database configured for the current environment. Ensure the backend and provisioning script are configured to use the intended database.

Do not put passwords, session cookies, or API keys in this README or commit them to the repository.

Saved handovers are associated with an owner. The API restricts listing, retrieval, and deletion to records owned by the authenticated user.

The current integrated application uses **SQLite** for persistence. Supabase was an experimental branch and is not part of the current integrated application.

## Running locally

### Prerequisites

- A compatible Python version supported by the project dependencies
- Node.js and npm
- Git
- A Groq API key for AI processing

### 1. Set up the backend

From the repository root, open PowerShell:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Create a local `.env` file using `.env.example` as the reference. Configure the required Groq API key and any other variables documented by the project configuration.

**Never commit `.env` or expose API keys in frontend code.**

Start the backend:

```powershell
.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Backend URLs:

- Health check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- Interactive API documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 2. Set up the frontend

Open a second PowerShell terminal in the repository root:

```powershell
npm install
npm run dev
```

The Vite development server uses port `3000` with a strict port setting.

Open [http://localhost:3000](http://localhost:3000).

The frontend uses the Vite `/api` proxy to reach the backend at `http://127.0.0.1:8000`. Keep both development servers running while using the application.

### 3. Sign in

Use the demo account credentials supplied by the project team or system administrator. There is no public sign-up flow.

### 4. Prepare a demonstration

- Use fictional or appropriately de-identified patient information.
- Review and correct any speech-to-text output.
- Check the generated handover before treating it as usable documentation.
- Test saved handover retrieval and deletion.
- Export a saved handover to PDF and inspect the resulting file before presenting it.

## Testing and build verification

Run backend tests:

```powershell
.venv\Scripts\python.exe -m pytest -q
```

Build the frontend:

```powershell
npm.cmd run build
```

The latest previously reported backend test run shared by the team reported **78 passed, 1 skipped**. This is a historical result; rerun the tests after subsequent changes.

The frontend build has also succeeded in the latest shared integration workflow. A successful build verifies compilation and bundling, not every runtime feature.

## Safety, privacy, and limitations

- HandoverGuard is a prototype for organizing documented information, not a diagnostic or treatment system.
- AI-generated content must be reviewed by a qualified healthcare professional.
- Speech recognition may be inaccurate; review the transcript before processing it.
- The application must not invent medical facts, diagnoses, medications, dosages, or treatment instructions.
- Use synthetic or properly de-identified data for development and demonstrations.
- Do not use real patient information without appropriate authorization and safeguards.
- Local development and successful tests do not establish that the application is production-ready or compliant with healthcare privacy requirements.

## Deployment status

**Not deployed.** The team plans to deploy after the frontend has been finalized and the integrated application is ready.

## Team contributions

The following summary reflects the team's reported responsibilities; it is not inferred solely from Git commit authorship.

- **Person 1 (Tanmay N.K):** Frontend and dashboard development.
- **Person 2 (Veanne Gonsalves):** Speech-to-text integration and SQLite database implementation.
- **Person 3: (Taksh Nayak Nagar)** Backend, AI processing, integration, authentication, and related application work.
- **Person 4: (Akshita)** UI/UX contributions, testing, and assistance with the demonstration.

## Project status

The current integration includes a responsive React/Vite interface, a FastAPI backend, local speech-to-text, AI-assisted handover structuring, SQLite persistence, cookie-based authentication, owner-scoped saved handovers, deletion, and frontend PDF export.

The project remains a hackathon prototype and is not yet deployed.
