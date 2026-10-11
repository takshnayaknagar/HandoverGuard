"""HandoverGuard backend — FastAPI application entry point.

Run locally with:
    uvicorn main:app --reload

Stage 1: GET /health — liveness check, independent of any LLM configuration.
Stage 2: POST /process-handover — validates the transcript and returns a
clearly-labelled MOCK handover (no LLM call yet; that arrives in Stage 3).
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.mock_service import mock_process_transcript
from app.schemas import HandoverRequest, HandoverResponse

app = FastAPI(
    title="HandoverGuard Backend",
    description="AI-assisted medical handover organization tool (hackathon prototype).",
    version="0.2.0",
)

# Allow only the frontend dev origin (from settings/.env) — never a wildcard.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check: the backend is running. No LLM or external service involved."""
    return {"status": "ok"}


@app.post("/process-handover", response_model=HandoverResponse)
def process_handover(request: HandoverRequest) -> HandoverResponse | JSONResponse:
    """Accept a transcript and return a structured handover.

    Stage 2: the returned handover is a fixed mock — no analysis happens yet.
    Input validation, however, is already the real thing.
    """
    if not request.transcript.strip():
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "invalid_input",
                    "message": "Transcript must not be empty.",
                }
            },
        )

    if len(request.transcript) > settings.max_transcript_chars:
        return JSONResponse(
            status_code=400,
            content={
                "error": {
                    "code": "invalid_input",
                    "message": (
                        f"Transcript exceeds the maximum of "
                        f"{settings.max_transcript_chars} characters "
                        f"(received {len(request.transcript)})."
                    ),
                }
            },
        )

    return mock_process_transcript(request.transcript)
