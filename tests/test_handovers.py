
def test_delete_saved_handover(client):
    # Create a saved handover using the existing API.
    response = client.post(
        "/process-handover",
        json={"transcript": "Patient A: wound dressing completed."},
    )
    assert response.status_code == 200

    # Get its ID from the saved handover list.
    handovers = client.get("/handovers")
    assert handovers.status_code == 200
    saved = handovers.json()
    assert len(saved) == 1

    case_id = saved[0]["case_id"]

    # Delete the saved handover.
    deleted = client.delete(f"/handovers/{case_id}")
    assert deleted.status_code == 200
    assert deleted.json() == {"status": "ok", "case_id": case_id}

    # Verify it no longer exists.
    detail = client.get(f"/handovers/{case_id}")
    assert detail.status_code == 404
    assert detail.json()["error"]["code"] == "case_not_found"

    remaining = client.get("/handovers")
    assert remaining.status_code == 200
    assert remaining.json() == []


def test_delete_nonexistent_handover_returns_404(client):
    response = client.delete("/handovers/nonexistent-case-id")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "case_not_found"
