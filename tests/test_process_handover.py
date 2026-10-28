"""Tests for POST /process-handover.

Validation tests (empty/whitespace/length/missing field) never reach the LLM.
Success and failure-mapping tests mock the LLM boundary
(main.process_transcript_with_llm), so no network call is ever made.
"""

import pytest
from fastapi.testclient import TestClient

from app import ai_service
from app.config import settings
from app.schemas import HandoverResponse
import main

SAMPLE_HANDOVER = HandoverResponse(
    patient_reference="Scott Rogers",
    patient_bed="2",
    completed=["Morning medications given"],
    pending=["Blood test results pending"],
    follow_up=["Cardiology review tomorrow"],
    communication=["Family updated"],
    unclear_or_undocumented=[],
)


@pytest.fixture()
def mock_llm_success(monkeypatch):
    monkeypatch.setattr(main, "process_transcript_with_llm", lambda transcript: SAMPLE_HANDOVER)


@pytest.fixture()
def mock_llm_error(monkeypatch):
    def install(error):
        def raise_error(transcript):
            raise error

        monkeypatch.setattr(main, "process_transcript_with_llm", raise_error)

    return install


def test_health_still_ok(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_valid_transcript_returns_handover_with_separate_bed_metadata(client: TestClient, mock_llm_success):
    response = client.post(
        "/process-handover",
        json={"transcript": "Blood test results are pending. Cardiology review tomorrow."},
    )

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
    assert isinstance(body["case_id"], str)
    assert body["case_id"]
    assert isinstance(body["created_at"], str)
    assert body["created_at"]
    user_response = client.get("/me")
    assert user_response.status_code == 200
    user_id = user_response.json()["user_id"]

    saved_record = main.get_handover(body["case_id"], owner_id=user_id)
    assert saved_record is not None
    assert saved_record["created_at"] == body["created_at"]
    assert body["patient_reference"] == "Scott Rogers"
    assert body["patient_bed"] == "2"
    assert body["completed"] == ["Morning medications given"]
    assert body["pending"] == ["Blood test results pending"]
    assert body["follow_up"] == ["Cardiology review tomorrow"]
    assert body["communication"] == ["Family updated"]
    assert body["unclear_or_undocumented"] == []


def test_manual_bed_explicitly_overrides_extracted_bed(client: TestClient, mock_llm_success):
    response = client.post(
        "/process-handover",
        json={"transcript": "In Bed 2, it's Scott Rogers.", "patient_bed": "3"},
    )

    assert response.status_code == 200
    assert response.json()["patient_bed"] == "3"


def test_empty_transcript_rejected(client: TestClient):
    response = client.post("/process-handover", json={"transcript": ""})

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_input"


def test_whitespace_only_transcript_rejected(client: TestClient):
    response = client.post("/process-handover", json={"transcript": "   \n\t  "})

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_input"


def test_transcript_exactly_at_limit_accepted(client: TestClient, mock_llm_success):
    limit = settings.max_transcript_chars
    response = client.post("/process-handover", json={"transcript": "a" * limit})

    assert response.status_code == 200


def test_transcript_over_limit_rejected(client: TestClient):
    limit = settings.max_transcript_chars
    response = client.post("/process-handover", json={"transcript": "a" * (limit + 1)})

    assert response.status_code == 400
    error = response.json()["error"]
    assert error["code"] == "invalid_input"
    assert str(limit) in error["message"]


def test_missing_transcript_field_rejected(client: TestClient):
    response = client.post("/process-handover", json={})

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "invalid_request_body"
    assert error["message"] == (
        "Request body is invalid or does not match the expected format."
    )


def test_wrong_type_transcript_rejected(client: TestClient):
    response = client.post("/process-handover", json={"transcript": 123})

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request_body"


def test_malformed_json_body_rejected(client: TestClient):
    response = client.post(
        "/process-handover",
        content="{not valid json",
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "invalid_request_body"


def test_not_configured_maps_to_503(client: TestClient, mock_llm_error):
    mock_llm_error(ai_service.LLMNotConfiguredError())

    response = client.post("/process-handover", json={"transcript": "hello"})

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "llm_not_configured"


def test_auth_or_quota_maps_to_503(client: TestClient, mock_llm_error):
    mock_llm_error(ai_service.LLMAuthOrQuotaError())

    response = client.post("/process-handover", json={"transcript": "hello"})

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "llm_auth_or_quota"


def test_unavailable_maps_to_503(client: TestClient, mock_llm_error):
    mock_llm_error(ai_service.LLMUnavailableError())

    response = client.post("/process-handover", json={"transcript": "hello"})

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "llm_unavailable"


def test_timeout_maps_to_504(client: TestClient, mock_llm_error):
    mock_llm_error(ai_service.LLMTimeoutError())

    response = client.post("/process-handover", json={"transcript": "hello"})

    assert response.status_code == 504
    assert response.json()["error"]["code"] == "processing_timeout"


def test_invalid_model_output_maps_to_502(client: TestClient, mock_llm_error):
    mock_llm_error(ai_service.LLMInvalidResponseError())

    response = client.post("/process-handover", json={"transcript": "hello"})

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "llm_invalid_response"
