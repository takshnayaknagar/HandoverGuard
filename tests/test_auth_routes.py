from fastapi.testclient import TestClient

import app.auth as auth
import app.database as database
import main
import uuid


def _login(client: TestClient, username: str, password: str):
    return client.post("/login", json={"username": username, "password": password})


def test_login_me_logout_and_invalid_credentials(anonymous_client: TestClient):
    user_id = auth.create_user("demo@example.com", "a sufficiently long password")
    response = _login(anonymous_client, "DEMO@example.com", "a sufficiently long password")
    assert response.status_code == 200
    assert response.json() == {"user_id": user_id, "username": "demo@example.com"}
    assert anonymous_client.get("/me").status_code == 200
    assert anonymous_client.post("/logout").status_code == 200
    assert anonymous_client.get("/me").status_code == 401
    assert _login(anonymous_client, "demo@example.com", "wrong password").status_code == 401


def test_origin_validation_rejects_cross_origin_login(anonymous_client: TestClient):
    auth.create_user("demo", "a sufficiently long password")
    response = anonymous_client.post(
        "/login",
        headers={"Origin": "https://untrusted.example"},
        json={"username": "demo", "password": "a sufficiently long password"},
    )
    assert response.status_code == 403

def test_login_accepts_configured_origin(anonymous_client: TestClient):
    auth.create_user("demo", "a sufficiently long password")
    response = anonymous_client.post(
        "/login",
        headers={"Origin": "http://localhost:3000"},
        json={"username": "demo", "password": "a sufficiently long password"},
    )
    assert response.status_code == 200


def test_login_rejects_missing_origin(anonymous_client: TestClient):
    anonymous_client.headers.pop("Origin", None)
    response = anonymous_client.post(
        "/login",
        json={"username": "demo", "password": "a sufficiently long password"},
    )
    assert response.status_code == 403

def test_saved_handovers_require_authentication_and_are_owner_scoped(anonymous_client: TestClient):
    user_a = auth.create_user("a", "a sufficiently long password")
    user_b = auth.create_user("b", "a sufficiently long password")
    legacy_id = str(uuid.uuid4())
    with database._connection() as connection:
        connection.execute(
        """
        INSERT INTO handovers (
            case_id, owner_id, patient_reference, transcript, completed,
            pending, follow_up, communication, unclear_or_undocumented,
            created_at
        )
        VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                legacy_id,
                None,
                "legacy",
                "[]",
                "[]",
                "[]",
                "[]",
                "[]",
                "2026-01-01T00:00:00+00:00",
            ),
        )

    owned_id = database.save_handover(
        "owned", {"patient_reference": None}, owner_id=user_a
    )
    other_id = database.save_handover(
        "other", {"patient_reference": None}, owner_id=user_b
    )

    assert anonymous_client.get("/handovers").status_code == 401
    _login(anonymous_client, "a", "a sufficiently long password")
    listed = anonymous_client.get("/handovers").json()
    assert {record["case_id"] for record in listed} == {owned_id}
    assert anonymous_client.get(f"/handovers/{owned_id}").status_code == 200
    assert anonymous_client.get(f"/handovers/{other_id}").status_code == 404
    assert anonymous_client.get(f"/handovers/{legacy_id}").status_code == 404
    assert anonymous_client.delete(f"/handovers/{other_id}").status_code == 404
    assert anonymous_client.delete(f"/handovers/{legacy_id}").status_code == 404
    # Switch to user B and verify the reverse ownership boundary.
    _login(anonymous_client, "b", "a sufficiently long password")

    listed_as_b = anonymous_client.get("/handovers").json()
    assert {record["case_id"] for record in listed_as_b} == {other_id}

    assert anonymous_client.get(f"/handovers/{other_id}").status_code == 200
    assert anonymous_client.get(f"/handovers/{owned_id}").status_code == 404
    assert anonymous_client.delete(f"/handovers/{owned_id}").status_code == 404

    # Confirm the protected records and legacy record remain intact.
    assert database.get_handover(owned_id, owner_id=user_a) is not None
    assert database.get_handover(other_id, owner_id=user_b) is not None

    with database._connection() as connection:
        legacy = connection.execute(
            "SELECT owner_id FROM handovers WHERE case_id = ?",
            (legacy_id,),
        ).fetchone()

    assert legacy is not None
    assert legacy["owner_id"] is None
