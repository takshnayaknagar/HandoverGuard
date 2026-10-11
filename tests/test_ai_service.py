"""Unit tests for app/ai_service.py — fully mocked, zero network calls.

The genai Client is replaced by fakes via ai_service._client_for_attempt, so
no API key is needed and no request ever leaves the machine. The one live
test at the bottom is strictly opt-in and shows up as SKIPPED by default.
"""

import json
import os

import httpx
import pytest
from google.genai import errors as genai_errors

from app import ai_service
from app.ai_service import (
    LLMAuthOrQuotaError,
    LLMInvalidResponseError,
    LLMNotConfiguredError,
    LLMTimeoutError,
    LLMUnavailableError,
    process_transcript_with_llm,
)
from app.config import settings
from app.schemas import HandoverResponse

VALID_JSON = (
    '{"patient_reference": "Bed 4", "completed": ["Morning medications given"],'
    ' "pending": ["Blood test results pending"], "follow_up": ["Cardiology review tomorrow"],'
    ' "communication": ["Family updated"], "unclear_or_undocumented": []}'
)


class FakeResponse:
    def __init__(self, text):
        self.text = text


class FakeModels:
    def __init__(self, script):
        self._script = list(script)
        self.calls = []

    def generate_content(self, model, contents, config):
        self.calls.append({"model": model, "contents": contents, "config": config})
        step = self._script.pop(0)
        if isinstance(step, Exception):
            raise step
        return step


class FakeClient:
    def __init__(self, script):
        self.models = FakeModels(script)


@pytest.fixture()
def fake_llm(monkeypatch):
    """Replace the real Gemini client with a scripted fake; use a dummy key."""
    budgets = []

    def install(script):
        fake = FakeClient(script)

        def fake_client_factory(budget_seconds):
            budgets.append(budget_seconds)
            return fake

        monkeypatch.setattr(ai_service, "_client_for_attempt", fake_client_factory)
        monkeypatch.setattr(ai_service.settings, "gemini_api_key", "dummy-key-for-tests")
        return fake

    install.budgets = budgets
    return install


def test_successful_extraction_returns_validated_handover(fake_llm):
    fake_llm([FakeResponse(VALID_JSON)])

    result = process_transcript_with_llm("Morning medications given. Bed 4.")

    assert isinstance(result, HandoverResponse)
    assert result.patient_reference == "Bed 4"
    assert result.completed == ["Morning medications given"]
    assert result.pending == ["Blood test results pending"]
    assert result.follow_up == ["Cardiology review tomorrow"]
    assert result.communication == ["Family updated"]
    assert result.unclear_or_undocumented == []


def test_call_is_schema_constrained_json(fake_llm):
    fake = fake_llm([FakeResponse(VALID_JSON)])

    process_transcript_with_llm("Some transcript.")

    config = fake.models.calls[0]["config"]
    assert config.response_mime_type == "application/json"
    assert config.response_schema is HandoverResponse


def test_attempt_timeout_is_bounded_by_overall_budget(fake_llm):
    fake_llm([FakeResponse(VALID_JSON)])

    process_transcript_with_llm("Some transcript.")

    budget = fake_llm.budgets[0]
    assert 0 < budget <= settings.llm_timeout_seconds


def test_empty_response_is_invalid_output(fake_llm):
    fake_llm([FakeResponse("   ")])

    with pytest.raises(LLMInvalidResponseError):
        process_transcript_with_llm("Some transcript.")


def test_blocked_response_is_invalid_output(fake_llm):
    fake_llm([FakeResponse(None)])

    with pytest.raises(LLMInvalidResponseError):
        process_transcript_with_llm("Some transcript.")


def test_malformed_json_is_invalid_output(fake_llm):
    fake_llm([FakeResponse("not json at all {")])

    with pytest.raises(LLMInvalidResponseError):
        process_transcript_with_llm("Some transcript.")


def test_schema_mismatch_is_invalid_output(fake_llm):
    full = {
        "patient_reference": 123,
        "completed": [],
        "pending": [],
        "follow_up": [],
        "communication": [],
        "unclear_or_undocumented": [],
    }
    fake_llm([FakeResponse(json.dumps(full))])

    with pytest.raises(LLMInvalidResponseError):
        process_transcript_with_llm("Some transcript.")


def test_partial_json_is_rejected_not_defaulted(fake_llm):
    fake_llm([FakeResponse('{"patient_reference": "Bed 4"}')])

    with pytest.raises(LLMInvalidResponseError):
        process_transcript_with_llm("Some transcript.")


def test_unknown_keys_are_rejected_not_ignored(fake_llm):
    fake_llm([FakeResponse('{"mystery_key": true}')])

    with pytest.raises(LLMInvalidResponseError):
        process_transcript_with_llm("Some transcript.")


def test_server_error_retries_once_then_succeeds(fake_llm):
    fake = fake_llm(
        [
            genai_errors.ServerError(500, {"error": {"message": "transient"}}),
            FakeResponse(VALID_JSON),
        ]
    )

    result = process_transcript_with_llm("Some transcript.")

    assert result.patient_reference == "Bed 4"
    assert len(fake.models.calls) == 2  # initial attempt + the single retry


def test_repeated_server_errors_exhaust_retries(fake_llm):
    fake_llm(
        [
            genai_errors.ServerError(503, {"error": {"message": "down"}}),
            genai_errors.ServerError(503, {"error": {"message": "still down"}}),
        ]
    )

    with pytest.raises(LLMUnavailableError):
        process_transcript_with_llm("Some transcript.")


def test_network_error_retries_then_gives_up(fake_llm):
    fake_llm([httpx.ConnectError("connection refused"), httpx.ConnectError("connection refused")])

    with pytest.raises(LLMUnavailableError):
        process_transcript_with_llm("Some transcript.")


def test_rate_limit_maps_to_auth_or_quota(fake_llm):
    fake_llm([genai_errors.ClientError(429, {"error": {"message": "quota"}})])

    with pytest.raises(LLMAuthOrQuotaError):
        process_transcript_with_llm("Some transcript.")


def test_invalid_credentials_map_to_auth_or_quota(fake_llm):
    fake_llm([genai_errors.ClientError(401, {"error": {"message": "bad key"}})])

    with pytest.raises(LLMAuthOrQuotaError):
        process_transcript_with_llm("Some transcript.")


def test_other_client_errors_do_not_retry(fake_llm):
    fake = fake_llm([genai_errors.ClientError(400, {"error": {"message": "bad request"}})])

    with pytest.raises(LLMUnavailableError):
        process_transcript_with_llm("Some transcript.")

    assert len(fake.models.calls) == 1  # non-transient: no retry attempted


def test_httpx_timeout_maps_to_processing_timeout(fake_llm):
    fake_llm([httpx.ReadTimeout("timed out")])

    with pytest.raises(LLMTimeoutError):
        process_transcript_with_llm("Some transcript.")


def test_missing_api_key_fails_fast_without_network(fake_llm, monkeypatch):
    fake_llm([])  # installs dummy key + factory that records whether it is called
    monkeypatch.setattr(ai_service.settings, "gemini_api_key", "")

    with pytest.raises(LLMNotConfiguredError):
        process_transcript_with_llm("Some transcript.")

    assert fake_llm.budgets == []  # no client was ever constructed


live_enabled = os.environ.get("RUN_LIVE_TESTS") == "1" and bool(settings.gemini_api_key)


@pytest.mark.skipif(
    not live_enabled,
    reason="Opt-in live test: requires RUN_LIVE_TESTS=1 and GEMINI_API_KEY configured.",
)
def test_live_gemini_fictional_transcript():
    """Real API call against Gemini with a clearly fictional transcript.

    Never runs in the default suite: pytest -v shows this as SKIPPED unless
    RUN_LIVE_TESTS=1 is exported AND a key is configured.
    """
    transcript = (
        "This is fictional test data for Mr Test Patient in Bed 99. "
        "Completed the morning medication round. Blood test results are pending. "
        "Cardiology review tomorrow at 10am. Spoke with the daughter about the plan. "
        "Not sure if the antibiotics were given, documentation is unclear."
    )

    result = process_transcript_with_llm(transcript)

    assert set(result.model_dump().keys()) == {
        "patient_reference",
        "completed",
        "pending",
        "follow_up",
        "communication",
        "unclear_or_undocumented",
    }
    assert result.patient_reference is None or isinstance(result.patient_reference, str)
