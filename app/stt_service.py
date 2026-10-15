"""Speech-to-text service: local faster-whisper transcription.

Mirrors Person 2's configuration (WhisperModel("base"), CPU, int8) from the
transcription-backend branch, wrapped for server use:

- The model is constructed lazily on the first /transcribe request, never at
  startup — /health and every other endpoint stay independent of it. The
  first construction also downloads ~150 MB of model files from HuggingFace
  (see README for the warm-up command to do this ahead of a demo).
- Concurrency is bounded by a semaphore (settings.stt_max_concurrent). The
  slot is held by the WORKER until transcription truly finishes, so jobs
  abandoned after a timeout still count against the cap and cannot pile up.
- Timeout honesty: if transcription exceeds settings.stt_timeout_seconds the
  caller gets STTTimeoutError immediately, but the worker thread KEEPS
  RUNNING server-side until it completes. The timeout bounds the response
  time; it does NOT cancel the CPU work.
- Nothing about the audio or transcript is ever logged.
"""

import logging
import os
import threading

from app.config import settings

logger = logging.getLogger(__name__)


class STTModelError(Exception):
    """The transcription model failed to load or transcribe the audio."""


class STTTimeoutError(Exception):
    """Transcription exceeded the deadline. The worker may still be running."""


class STTBusyError(Exception):
    """All transcription slots are busy; try again shortly."""


_model = None
_model_lock = threading.Lock()

# Bounded job slots — includes jobs still running after a timeout, because
# the worker releases its slot only when it actually finishes.
_job_slots = threading.Semaphore(settings.stt_max_concurrent)


def _get_model():
    """Lazily construct the whisper model (double-checked, thread-safe)."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                from faster_whisper import WhisperModel

                _model = WhisperModel("base", device="cpu", compute_type="int8")
    return _model


def transcribe_audio(audio_path: str, cleanup_path: str | None = None) -> str:
    """Transcribe a local audio file and return the text.

    Raises STTBusyError, STTTimeoutError, or STTModelError.

    cleanup_path (usually the same as audio_path) is deleted by the worker's
    finally block once transcription truly finishes — this reclaims the file
    even when the caller timed out first and could not delete it on Windows
    while the decode phase still held it open. Deleting an already-removed
    file is tolerated.
    """
    if not _job_slots.acquire(blocking=False):
        raise STTBusyError("All transcription slots are busy.")

    result: dict = {}

    def worker() -> None:
        try:
            model = _get_model()
            segments, _info = model.transcribe(audio_path)
            result["text"] = " ".join(segment.text.strip() for segment in segments)
        except Exception as exc:  # surfaced to caller as STTModelError
            # Dev diagnostics: exception class name only — never stack traces,
            # audio, transcripts, or credentials.
            logger.warning("Transcription failed: %s", type(exc).__name__)
            result["error"] = exc
        finally:
            _job_slots.release()
            if cleanup_path is not None:
                try:
                    os.remove(cleanup_path)
                except OSError:
                    pass  # already deleted by the caller, or nothing to reclaim

    thread = threading.Thread(target=worker, daemon=True)
    try:
        thread.start()
    except Exception:
        # thread.start() failed before the worker existed, so the worker's
        # finally (which releases the slot) will never run — release here.
        _job_slots.release()
        raise
    thread.join(settings.stt_timeout_seconds)

    if thread.is_alive():
        # NOTE: the worker continues server-side and keeps its job slot until
        # it finishes. This timeout bounds the response, not the CPU work.
        raise STTTimeoutError("Transcription did not finish in time.")

    if "error" in result:
        raise STTModelError("Transcription failed.") from result["error"]

    return result["text"]
