"""HandoverGuard backend — FastAPI application entry point.

Run locally with:
    uvicorn main:app --reload

Stage 1: GET /health — liveness check, independent of any LLM configuration.
Stage 2: POST /process-handover — transcript validation + API contract.
Stage 3: real Gemini extraction with schema-constrained output, typed error
mapping, and one overall deadline shared by at most two attempts.

The handover result is an UNVERIFIED DRAFT for clinician review.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.ai_service import (
    LLMAuthOrQuotaError,
    LLMInvalidResponseError,
    LLMNotConfiguredError,
    LLMTimeoutError,
    LLMUnavailableError,
    process_transcript_with_llm,
)
from app.config import settings
from app.schemas import HandoverRequest, HandoverResponse

app = FastAPI(
    title="HandoverGuard Backend",
    description="AI-assisted medical handover organization tool (hackathon prototype).",
    version="0.3.0",
)

# Allow only the frontend dev origin (from settings/.env) — never a wildcard.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def _error_response(status_code: int, code: str, message: str) -> JSONResponse:
    """The single predictable error shape used across the API."""
    return JSONResponse(status_code=status_code, content={"error": {"code": code, "message": message}})


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check: the backend is running. No LLM or external service involved."""
    return {"status": "ok"}


@app.post("/process-handover", response_model=HandoverResponse)
def process_handover(request: HandoverRequest) -> HandoverResponse | JSONResponse:
    """Accept a transcript and return a structured handover draft.

    Input validation is local; extraction is one Gemini call whose output is
    re-validated against HandoverResponse. Failures return honest errors —
    never fabricated handover data and never the raw provider response.
    """
    if not request.transcript.strip():
        return _error_response(400, "invalid_input", "Transcript must not be empty.")

    if len(request.transcript) > settings.max_transcript_chars:
        return _error_response(
            400,
            "invalid_input",
            (
                f"Transcript exceeds the maximum of "
                f"{settings.max_transcript_chars} characters "
                f"(received {len(request.transcript)})."
            ),
        )

    try:
        return process_transcript_with_llm(request.transcript)
    except LLMNotConfiguredError:
        return _error_response(
            503,
            "llm_not_configured",
            "AI processing is not configured on the server (missing API key).",
        )
    except LLMAuthOrQuotaError:
        return _error_response(
            503,
            "llm_auth_or_quota",
            "The AI provider rejected the request (authentication or quota). Please try again shortly.",
        )
    except LLMUnavailableError:
        return _error_response(
            503,
            "llm_unavailable",
            "The AI provider is temporarily unavailable. Please try again shortly.",
        )
    except LLMTimeoutError:
        return _error_response(
            504,
            "processing_timeout",
            "AI processing did not finish in time. Please try again.",
        )
    except LLMInvalidResponseError:
        return _error_response(
            502,
            "llm_invalid_response",
            "The AI provider returned an unusable response. No handover was produced.",
        )
