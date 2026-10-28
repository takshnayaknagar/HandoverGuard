"""Tests for POST /transcribe and app/stt_service.py — fully mocked.

No Whisper model is ever constructed, no model download, no real audio, no
credentials. The transcription function is replaced by fakes; the service
timeout/busy semantics are tested with a fake model and a tiny deadline.
"""

import time

import pytest
from fastapi.testclient import TestClient

import main
from app import stt_service
from app.stt_service import STTBusyError, STTModelError, STTTimeoutError, transcribe_audio

# A minimal well-formed WAV header: "RIFF" ... "WAVE"
WAV_BYTES = b"RIFF\x24\x00\x00\x00WAVEfmt " + b"\x00" * 20


@pytest.fixture()
def mock_stt(monkeypatch):
    """Replace the transcription function at the route boundary."""
    calls = {"paths": []}

    def install(func):
        def wrapper(path, cleanup_path=None):
            calls["paths"].append(path)
            return func(path)

        monkeypatch.setattr(main.stt_service, "transcribe_audio", wrapper)
        return calls

    return install


def _post_audio(client: TestClient, content: bytes, filename: str = "note.wav", mime: str = "audio/wav"):
    return client.post(
        "/transcribe",
        files={"audio": (filename, content, mime)},
    )


# --- Route tests ---------------------------------------------------------------


def test_transcribe_success(client: TestClient, mock_stt):
    mock_stt(lambda path: "Fictional transcript text.")

    response = _post_audio(client, WAV_BYTES)

    assert response.status_code == 200
    assert response.json() == {"transcript": "Fictional transcript text."}


def test_transcribe_success_cleans_up_temp_file(client: TestClient, mock_stt):
    import os

    seen = {}

    def fake(path):
        seen["path"] = path
        seen["existed_during"] = os.path.exists(path)
        return "text."

    mock_stt(fake)
    response = _post_audio(client, WAV_BYTES)

    assert response.status_code == 200
    assert seen["existed_during"] is True  # file present during transcription
    assert os.path.exists(seen["path"]) is False  # deleted afterwards (finally)


def test_missing_audio_field_rejected(client: TestClient):
    response = client.post("/transcribe", data={})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request_body"


def test_non_audio_mime_rejected(client: TestClient):
    response = _post_audio(client, WAV_BYTES, mime="application/json")

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "audio_invalid"


def test_empty_audio_rejected(client: TestClient):
    response = _post_audio(client, b"")

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "audio_invalid"


def test_bad_content_signature_rejected(client: TestClient):
    # Text bytes with a lying .wav filename and audio/wav MIME — must fail on
    # content, proving neither filename nor MIME is trusted.
    response = _post_audio(client, b"this is definitely not audio data" * 2, filename="note.wav")

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "audio_invalid"


def test_oversized_audio_rejected_while_streaming(client: TestClient, monkeypatch):
    monkeypatch.setattr(main.settings, "max_audio_mb", 0)  # any byte exceeds
    response = _post_audio(client, WAV_BYTES + b"\x00" * 100)

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "audio_too_large"


def test_supported_format_signatures():
    assert main._is_supported_audio(WAV_BYTES) is True
    assert main._is_supported_audio(b"ID3\x04\x00" + b"\x00" * 16) is True  # mp3
    assert main._is_supported_audio(b"\xff\xfb\x90\x00" + b"\x00" * 16) is True  # mp3 frame sync
    assert main._is_supported_audio(b"OggS\x00\x02" + b"\x00" * 16) is True  # ogg
    assert main._is_supported_audio(b"\x00\x00\x00\x20ftypM4A " + b"\x00" * 8) is True  # m4a
    assert main._is_supported_audio(b"\x1a\x45\xdf\xa3" + b"\x00" * 16) is True  # webm
    assert main._is_supported_audio(b"plain text bytes here" + b"\x00") is False
    assert main._is_supported_audio(b"short") is False


def test_model_error_maps_to_503(client: TestClient, mock_stt):
    def fail(path):
        raise STTModelError("boom")

    mock_stt(fail)
    response = _post_audio(client, WAV_BYTES)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "stt_model_error"


def test_timeout_maps_to_504(client: TestClient, mock_stt):
    def hang(path):
        raise STTTimeoutError("deadline")

    mock_stt(hang)
    response = _post_audio(client, WAV_BYTES)

    assert response.status_code == 504
    assert response.json()["error"]["code"] == "stt_timeout"


def test_busy_maps_to_503(client: TestClient, mock_stt):
    def busy(path):
        raise STTBusyError("full")

    mock_stt(busy)
    response = _post_audio(client, WAV_BYTES)

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "stt_busy"


def test_temp_file_removed_even_on_validation_failure(client: TestClient, mock_stt, monkeypatch):
    import os
    import tempfile

    created = {}

    real_mkstemp = tempfile.mkstemp

    def tracking_mkstemp(*args, **kwargs):
        fd, path = real_mkstemp(*args, **kwargs)
        created[path] = True
        return fd, path

    monkeypatch.setattr(main.tempfile, "mkstemp", tracking_mkstemp)
    mock_stt(lambda path: "unused")

    response = _post_audio(client, b"not audio")  # fails signature validation

    assert response.status_code == 400
    assert created, "temp file was created"
    assert all(not os.path.exists(p) for p in created)  # all cleaned up




# --- Review-fix regressions -----------------------------------------------------


def test_unexpected_stt_exception_maps_to_503_error_shape(client: TestClient, mock_stt):
    def explode(path):
        raise RuntimeError("can't start new thread")

    mock_stt(explode)
    response = _post_audio(client, WAV_BYTES)

    assert response.status_code == 503
    body = response.json()
    assert body["error"]["code"] == "stt_model_error"
    assert "RuntimeError" not in body["error"]["message"]  # no internals leaked


def test_service_releases_slot_when_thread_start_fails(monkeypatch, tmp_path):
    import threading as real_threading_module

    class BrokenThread:
        def __init__(self, *a, **k):
            pass

        def start(self):
            raise RuntimeError("can't start new thread")

        def join(self, timeout=None):
            pass

    monkeypatch.setattr(stt_service.threading, "Thread", BrokenThread)
    audio = tmp_path / "a.wav"
    audio.write_bytes(WAV_BYTES)

    try:
        with pytest.raises(RuntimeError):
            transcribe_audio(str(audio))
    finally:
        pass

    assert stt_service._job_slots._value == stt_service.settings.stt_max_concurrent
    # restore real Thread for other tests (monkeypatch does this automatically)


def test_timeout_worker_deletes_cleanup_path_when_it_finishes(monkeypatch, tmp_path):
    """The route may fail to delete the temp file on Windows while the worker
    holds it open after a timeout; the worker must reclaim it when done."""
    import os

    held = tmp_path / "held.wav"
    held.write_bytes(WAV_BYTES)

    # Simulate Windows: os.remove fails while the worker is alive.
    import main as main_module

    real_remove = os.remove
    started = time.monotonic()

    def windows_like_remove(path):
        # Simulate Windows: deletion fails only while the decoder holds the
        # file; once the worker has finished with it, removal succeeds.
        if os.path.abspath(path) == os.path.abspath(str(held)) and time.monotonic() - started < 0.45:
            raise PermissionError("file in use")
        return real_remove(path)

    monkeypatch.setattr(stt_service, "_get_model", lambda: FakeModel(delay=0.5))
    monkeypatch.setattr(stt_service.settings, "stt_timeout_seconds", 0.2)
    monkeypatch.setattr(os, "remove", windows_like_remove)

    with pytest.raises(STTTimeoutError):
        transcribe_audio(str(held), cleanup_path=str(held))

    assert os.path.exists(str(held))  # worker still running, file still held
    time.sleep(1.0)  # worker finishes and runs its own cleanup
    assert not os.path.exists(str(held))  # reclaimed by the worker's finally

# --- Service-level semantics (fake model, no downloads) ------------------------


class FakeSegment:
    def __init__(self, text):
        self.text = text


class FakeModel:
    def __init__(self, delay: float = 0.0, fail: bool = False):
        self._delay = delay
        self._fail = fail

    def transcribe(self, path):
        if self._delay:
            time.sleep(self._delay)
        if self._fail:
            raise RuntimeError("decoder failure")
        return [FakeSegment(" bed four. "), FakeSegment(" meds given.")], None


@pytest.fixture()
def fast_deadline(monkeypatch):
    monkeypatch.setattr(stt_service.settings, "stt_timeout_seconds", 0.2)


def test_service_transcribes_and_joins_segments(monkeypatch, tmp_path):
    monkeypatch.setattr(stt_service, "_get_model", lambda: FakeModel())
    audio = tmp_path / "a.wav"
    audio.write_bytes(WAV_BYTES)

    result = transcribe_audio(str(audio))

    assert result == "bed four. meds given."


def test_service_model_failure_raises_stt_model_error(monkeypatch, tmp_path):
    monkeypatch.setattr(stt_service, "_get_model", lambda: FakeModel(fail=True))
    audio = tmp_path / "a.wav"
    audio.write_bytes(WAV_BYTES)

    with pytest.raises(STTModelError):
        transcribe_audio(str(audio))


def test_service_timeout_raises_and_does_not_cancel(monkeypatch, tmp_path):
    """A slow model triggers STTTimeoutError; the worker keeps running (slot
    stays held until it truly finishes — we verify the slot is NOT released
    immediately after the timeout)."""
    monkeypatch.setattr(stt_service, "_get_model", lambda: FakeModel(delay=1.0))
    monkeypatch.setattr(stt_service.settings, "stt_timeout_seconds", 0.2)
    audio = tmp_path / "a.wav"
    audio.write_bytes(WAV_BYTES)

    with pytest.raises(STTTimeoutError):
        transcribe_audio(str(audio))

    # The orphaned worker still holds a slot right now.
    assert stt_service._job_slots._value < stt_service.settings.stt_max_concurrent

    time.sleep(1.0)  # let the worker finish
    assert stt_service._job_slots._value == stt_service.settings.stt_max_concurrent


def test_service_busy_when_slots_exhausted(monkeypatch, tmp_path):
    monkeypatch.setattr(stt_service, "_get_model", lambda: FakeModel())
    while stt_service._job_slots.acquire(blocking=False):
        pass  # exhaust all slots as another job would
    try:
        with pytest.raises(STTBusyError):
            transcribe_audio(str(tmp_path / "x.wav"))
    finally:
        for _ in range(stt_service.settings.stt_max_concurrent):
            stt_service._job_slots.release()


# --- Regression: existing endpoints unchanged ----------------------------------


def test_health_still_ok(client: TestClient):
    assert client.get("/health").json() == {"status": "ok"}


def test_process_handover_contract_unchanged(client: TestClient, monkeypatch):
    from app.schemas import HandoverResponse

    monkeypatch.setattr(
        main, "process_transcript_with_llm", lambda t: HandoverResponse(pending=["p"])
    )
    response = client.post("/process-handover", json={"transcript": "Fictional."})
    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {
        "patient_reference",
        "patient_bed",
        "completed",
        "pending",
        "follow_up",
        "communication",
        "unclear_or_undocumented",
        "case_id",
        "created_at",
    }
    assert isinstance(body["case_id"], str) and body["case_id"]
    assert isinstance(body["created_at"], str) and body["created_at"]
