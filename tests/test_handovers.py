
"""Tests for saved-handover deletion and retrieval."""

from fastapi.testclient import TestClient

import main
from app.schemas import HandoverResponse


def test_delete_saved_handover(
    client: TestClient,
    monkeypatch,
):
    # Keep this test independent of Groq and network availability.
    mock_handover = HandoverResponse(
        patient_reference="Patient A",
        completed=["Wound dressing completed"],
        pending=[],
        follow_up=[],
        communication=[],
        unclear_or_undocumented=[],
    )
    monkeypatch.setattr(
        main,
        "process_transcript_with_llm",
        lambda transcript: mock_handover,
    )

    response = client.post(
        "/process-handover",
        json={"transcript": "Patient A: wound dressing completed."},
    )
    assert response.status_code == 200

    handovers = client.get("/handovers")
    assert handovers.status_code == 200
    saved = handovers.json()
    assert len(saved) == 1

    case_id = saved[0]["case_id"]

    deleted = client.delete(f"/handovers/{case_id}")
    assert deleted.status_code == 200
    assert deleted.json() == {"status": "ok", "case_id": case_id}

    detail = client.get(f"/handovers/{case_id}")
    assert detail.status_code == 404
    assert detail.json()["error"]["code"] == "case_not_found"

    remaining = client.get("/handovers")
    assert remaining.status_code == 200
    assert remaining.json() == []


def test_delete_nonexistent_handover_returns_404(client: TestClient):
    response = client.delete("/handovers/nonexistent-case-id")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "case_not_found"
