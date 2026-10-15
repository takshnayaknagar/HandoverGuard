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
