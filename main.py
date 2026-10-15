"""HandoverGuard backend — FastAPI application entry point.

Run locally with:
    uvicorn main:app --reload

Stage 1: GET /health — liveness check, independent of any LLM configuration.
Stage 2: POST /process-handover — transcript validation + API contract.
Stage 3: real LLM extraction (Groq) with schema-constrained output, typed error
mapping, and one overall deadline shared by at most two attempts.
Stage 5: POST /transcribe — local faster-whisper speech-to-text returning an
editable transcript; the clinician reviews it BEFORE any handover processing.

The handover result is an UNVERIFIED DRAFT for clinician review.
"""

import asyncio
import os
import tempfile

from fastapi import FastAPI, File, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import stt_service
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
from app.stt_service import STTBusyError, STTModelError, STTTimeoutError

app = FastAPI(
    title="HandoverGuard Backend",
    description="AI-assisted medical handover organization tool (hackathon prototype).",
    version="0.4.0",
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


@app.exception_handler(RequestValidationError)
def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Unify request-body validation failures (missing field, wrong type, bad JSON)
    into the standard error shape instead of FastAPI's default {"detail": [...]}.
    Validation details are kept generic: no transcript content is echoed back.
    """
    return _error_response(
        422,
        "invalid_request_body",
        "Request body must be JSON with a non-empty 'transcript' string field.",
    )


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check: the backend is running. No LLM or external service involved."""
    return {"status": "ok"}


@app.post("/process-handover", response_model=HandoverResponse)
def process_handover(request: HandoverRequest) -> HandoverResponse | JSONResponse:
    """Accept a transcript and return a structured handover draft.

    Input validation is local; extraction is one Groq call whose output is
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

# --- Speech-to-text -----------------------------------------------------------

# Chunk size for streaming uploads to disk; the size limit is enforced while
# reading, so an oversized upload is never buffered fully in memory.
_UPLOAD_CHUNK_BYTES = 1024 * 1024

# Secondary sanity limit on the header bytes we inspect for format sniffing.
_HEADER_BYTES = 32


def _is_supported_audio(header: bytes) -> bool:
    """Content-signature check on the actual bytes.

    Filename extensions and client-declared MIME types are NOT trusted. This
    confirms the container only (wav/mp3/ogg/m4a/webm), not audio integrity —
    a corrupt but well-formed file fails later in transcription with a safe
    stt_model_error, never a crash.
    """
    if len(header) < 12:
        return False
    if header[:4] == b"RIFF" and header[8:12] == b"WAVE":
        return True  # wav
    if header[:3] == b"ID3" or (header[0] == 0xFF and (header[1] & 0xE0) == 0xE0):
        return True  # mp3 (ID3 tag or frame sync)
    if header[:4] == b"OggS":
        return True  # ogg
    if header[4:8] == b"ftyp":
        return True  # m4a / mp4 audio
    if header[:4] == b"\x1a\x45\xdf\xa3":
        return True  # webm (EBML)
    return False


@app.post("/transcribe", response_model=None)
async def transcribe(audio: UploadFile = File(...)) -> dict[str, str] | JSONResponse:
    """Accept an audio note and return an editable transcript.

    The transcript MUST be reviewed and edited by a clinician before it is
    sent to /process-handover — transcription is not guaranteed accurate.

    Audio is streamed to a temporary file OUTSIDE the repository (enforcing
    the size limit while reading) and deleted in a finally block on every
    path. The heavy model work runs in a worker thread so the event loop is
    never blocked; see app/stt_service.py for timeout/concurrency semantics.
    """
    if audio.content_type and not audio.content_type.startswith("audio/"):
        return _error_response(400, "audio_invalid", "Uploaded file is not an audio file.")

    limit_bytes = settings.max_audio_mb * 1024 * 1024
    fd, tmp_path = tempfile.mkstemp(prefix="hg_audio_")
    os.close(fd)  # reopened for writing below; path stays unique
    try:
        written = 0
        with open(tmp_path, "wb") as out:
            while chunk := await audio.read(_UPLOAD_CHUNK_BYTES):
                written += len(chunk)
                if written > limit_bytes:
                    return _error_response(
                        400,
                        "audio_too_large",
                        f"Audio exceeds the maximum of {settings.max_audio_mb} MB.",
                    )
                out.write(chunk)

        if written == 0:
            return _error_response(400, "audio_invalid", "Uploaded audio file is empty.")

        with open(tmp_path, "rb") as f:
            header = f.read(_HEADER_BYTES)
        if not _is_supported_audio(header):
            return _error_response(
                400,
                "audio_invalid",
                "Unsupported audio format. Supported: WAV, MP3, OGG, M4A, WEBM.",
            )

        try:
            transcript = await asyncio.to_thread(
                stt_service.transcribe_audio, tmp_path, cleanup_path=tmp_path
            )
        except STTBusyError:
            return _error_response(
                503,
                "stt_busy",
                "The server is busy transcribing another audio note. Please try again shortly.",
            )
        except STTTimeoutError:
            # Note: the worker thread may still be finishing server-side.
            return _error_response(
                504,
                "stt_timeout",
                "Transcription did not finish in time. Please try a shorter audio note.",
            )
        except STTModelError:
            return _error_response(
                503,
                "stt_model_error",
                "Transcription failed. Please check the audio file and try again.",
            )
        except Exception:
            # Any unexpected STT failure still gets the unified error shape.
            # (asyncio.CancelledError is a BaseException and is NOT caught here,
            # so request cancellation/shutdown is never swallowed.)
            return _error_response(
                503,
                "stt_model_error",
                "Transcription failed. Please check the audio file and try again.",
            )

        return {"transcript": transcript}
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
