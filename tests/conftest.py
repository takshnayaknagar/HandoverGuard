
"""Shared pytest fixtures for the FastAPI app."""

import pytest
from fastapi.testclient import TestClient

import app.auth as auth
import app.database as database
from main import app


@pytest.fixture()
def anonymous_client(tmp_path, monkeypatch):
    # Isolate each test's SQLite database from local demo data.
    monkeypatch.setattr(database, "DATABASE_PATH", tmp_path / "handovers.db")

    # Entering the context manager runs FastAPI startup and shutdown events.
    with TestClient(app) as test_client:
        test_client.headers["Origin"] = "http://localhost:3000"
        yield test_client


@pytest.fixture()
def client(anonymous_client):
    """Authenticated client using a test-only account and session cookie."""
    auth.create_user("test-user", "a sufficiently long test password")
    response = anonymous_client.post(
        "/login",
        json={"staff_id": "test-user", "password": "a sufficiently long test password"},
    )
    assert response.status_code == 200
    yield anonymous_client
