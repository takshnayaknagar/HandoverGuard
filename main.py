"""HandoverGuard backend â€” FastAPI application entry point."""

import asyncio
from datetime import datetime, timezone
import os
import tempfile

from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

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
from app.database import (
    initialize_database,
    save_handover,
    list_handovers,
    get_handover,
    delete_handover,
)
from app.auth import (
    create_session,
    get_user_by_staff_id,
    get_user_for_session,
    revoke_session,
    verify_password,
)
from app.schemas import HandoverRequest, HandoverResponse
from app.stt_service import STTBusyError, STTModelError, STTTimeoutError


app = FastAPI(
    title="HandoverGuard Backend",
    description="AI-assisted medical handover organization tool (hackathon prototype).",
    version="0.5.0",
)


@app.on_event("startup")
def startup():
    """Initialize the local database when the backend starts."""
    initialize_database()


# Allow only the configured frontend development origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
    allow_credentials=True,
)

SESSION_COOKIE = "handoverguard_session"


class LoginRequest(BaseModel):
    staff_id: str = Field(min_length=1, max_length=128)
    password: str = Field(min_length=1, max_length=256)


def _check_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin != settings.frontend_origin:
        raise HTTPException(status_code=403, detail="Request origin is not allowed")


def _current_user(request: Request) -> dict:
    user = get_user_for_session(request.cookies.get(SESSION_COOKIE, ""))
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


def _cookie_secure() -> bool:
    return settings.app_env.casefold() == "production"


def _error_response(
    status_code: int,
    code: str,
    message: str,
) -> JSONResponse:
    """Return the standard API error format."""
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


@app.exception_handler(RequestValidationError)
def handle_validation_error(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Return a consistent error for invalid request bodies."""
    return _error_response(
        422,
        "invalid_request_body",
        "Request body is invalid or does not match the expected format.",
    )


@app.get("/health")
def health() -> dict[str, str]:
    """Check whether the backend is running."""
    return {"status": "ok"}


@app.post("/login")
def login(payload: LoginRequest, request: Request, response: Response) -> dict:
    _check_origin(request)
    user = get_user_by_staff_id(payload.staff_id)
    if user is None or not user["is_active"] or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid Staff ID or password")
    token, expires_at = create_session(user["user_id"])
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        secure=_cookie_secure(),
        samesite="lax",
        expires=expires_at,
        max_age=int((expires_at - datetime.now(timezone.utc)).total_seconds()),
        path="/",
    )
    return {"user_id": user["user_id"], "staff_id": user["username"]}


@app.post("/logout")
def logout(request: Request, response: Response) -> dict:
    _check_origin(request)
    token = request.cookies.get(SESSION_COOKIE, "")
    revoke_session(token)
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"status": "ok"}


@app.get("/me")
def me(user: dict = Depends(_current_user)) -> dict:
    return {"user_id": user["user_id"], "staff_id": user["username"]}


# --- Process and save a handover ----------------------------------------------


@app.post("/process-handover", response_model=None)
def process_handover(
    payload: HandoverRequest,
    request: Request,
    user: dict = Depends(_current_user),
) -> HandoverResponse | JSONResponse:
    """Process a transcript and save the resulting handover."""
    _check_origin(request)
    transcript = payload.transcript

    if not transcript.strip():
        return _error_response(
            400,
            "invalid_input",
            "Transcript must not be empty.",
        )

    if len(transcript) > settings.max_transcript_chars:
        return _error_response(
            400,
            "invalid_input",
            (
                f"Transcript exceeds the maximum of "
                f"{settings.max_transcript_chars} characters "
                f"(received {len(transcript)})."
            ),
        )

    try:
        result = process_transcript_with_llm(transcript)

        # Save only a successfully generated, validated handover.
        result_data = result.model_dump()
        # An explicitly entered bed takes precedence; otherwise retain the
        # bed extracted from the transcript rather than erasing it.
        manual_bed = payload.patient_bed.strip() if payload.patient_bed and payload.patient_bed.strip() else None
        result_data["patient_bed"] = manual_bed or result.patient_bed
        case_id = save_handover(transcript, result_data, owner_id=user["user_id"])
        saved_record = get_handover(case_id, owner_id=user["user_id"])

        if saved_record is None:
            raise RuntimeError("Saved handover could not be retrieved.")

        # Return the saved record's exact metadata with the clinical result.
        response = result.model_dump()
        response["patient_bed"] = result_data["patient_bed"]
        response["case_id"] = case_id
        response["created_at"] = saved_record["created_at"]
        return response

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


# --- Retrieve saved handovers -------------------------------------------------


@app.get("/handovers")
def get_all_handovers(user: dict = Depends(_current_user)) -> list[dict]:
    """List saved cases, newest first, with their IDs and timestamps."""
    return list_handovers(owner_id=user["user_id"])


@app.get("/handovers/{case_id}", response_model=None)
def get_saved_handover(case_id: str, user: dict = Depends(_current_user)) -> dict | JSONResponse:
    """Retrieve one saved case using its unique case ID."""
    handover = get_handover(case_id, owner_id=user["user_id"])

    if handover is None:
        return _error_response(
            404,
            "case_not_found",
            "No saved handover was found for that case ID.",
        )

    return handover

@app.delete("/handovers/{case_id}", response_model=None)
def delete_saved_handover(case_id: str, request: Request, user: dict = Depends(_current_user)) -> dict | JSONResponse:
    """Delete one saved handover using its unique case ID."""
    _check_origin(request)
    deleted = delete_handover(case_id, owner_id=user["user_id"])

    if not deleted:
        return _error_response(
            404,
            "case_not_found",
            "No saved handover was found for that case ID.",
        )

    return {"status": "ok", "case_id": case_id}

# --- Speech-to-text -----------------------------------------------------------

_UPLOAD_CHUNK_BYTES = 1024 * 1024
_HEADER_BYTES = 32


def _is_supported_audio(header: bytes) -> bool:
    """Check the file signature for supported audio containers."""
    if len(header) < 12:
        return False

    if header[:4] == b"RIFF" and header[8:12] == b"WAVE":
        return True

    if header[:3] == b"ID3" or (
        header[0] == 0xFF and (header[1] & 0xE0) == 0xE0
    ):
        return True

    if header[:4] == b"OggS":
        return True

    if header[4:8] == b"ftyp":
        return True

    if header[:4] == b"\x1a\x45\xdf\xa3":
        return True

    return False


@app.post("/transcribe", response_model=None)
async def transcribe(
    request: Request,
    audio: UploadFile = File(...),
    user: dict = Depends(_current_user),
) -> dict[str, str] | JSONResponse:
    """Convert an audio note into text for clinician review."""
    _check_origin(request)
    if audio.content_type and not audio.content_type.startswith("audio/"):
        return _error_response(
            400,
            "audio_invalid",
            "Uploaded file is not an audio file.",
        )

    limit_bytes = settings.max_audio_mb * 1024 * 1024
    fd, tmp_path = tempfile.mkstemp(prefix="hg_audio_")
    os.close(fd)

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
            return _error_response(
                400,
                "audio_invalid",
                "Uploaded audio file is empty.",
            )

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
                stt_service.transcribe_audio,
                tmp_path,
                cleanup_path=tmp_path,
            )

        except STTBusyError:
            return _error_response(
                503,
                "stt_busy",
                "The server is busy transcribing another audio note. Please try again shortly.",
            )

        except STTTimeoutError:
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
