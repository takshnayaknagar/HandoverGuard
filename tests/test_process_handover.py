"""Tests for POST /process-handover (Stage 2: mock processing, no LLM)."""

from fastapi.testclient import TestClient

from app.config import settings
from app.mock_service import MOCK_NOTICE


def test_valid_transcript_returns_ok(client: TestClient):
    response = client.post(
        "/process-handover",
        json={"transcript": "Blood test results are pending. Cardiology review tomorrow."},
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) == {
        "patient_reference",
        "completed",
        "pending",
        "follow_up",
        "communication",
        "unclear_or_undocumented",
    }
    assert body["patient_reference"] is None
    for field in ("completed", "pending", "follow_up", "communication"):
        assert body[field] == []
    assert body["unclear_or_undocumented"] == [MOCK_NOTICE]


def test_empty_transcript_rejected(client: TestClient):
    response = client.post("/process-handover", json={"transcript": ""})

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_input"


def test_whitespace_only_transcript_rejected(client: TestClient):
    response = client.post("/process-handover", json={"transcript": "   \n\t  "})

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_input"


def test_transcript_exactly_at_limit_accepted(client: TestClient):
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
