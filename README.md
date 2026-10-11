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
* One LLM provider SDK
* pytest for automated testing

The LLM provider will be selected after checking API access, structured-output support, and current pricing.

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

Accepts a transcript and returns a validated handover.

Example request:

```
{
  "transcript": "Blood test results are pending. Cardiology review tomorrow."
}
```

The response should contain the six fields defined above.

## Development Status

The backend will be developed in stages:

1. Project setup and health endpoint.
2. Transcript input and mock response.
3. LLM integration.
4. Output validation and error handling.
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

Copy `.env.example` to `.env` when the LLM provider has been selected.

Add your actual API key only to `.env` or another secure local configuration method.

Never commit `.env` or expose API keys in frontend code.

## Testing

Run automated tests with:

```
pytest
```

Tests should use fictional transcripts and mocked LLM responses where possible, so they do not require paid API calls.

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
