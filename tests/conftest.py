
"""Shared pytest fixtures for the FastAPI app."""

import pytest
from fastapi.testclient import TestClient

import app.database as database
from main import app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    # Isolate each test's SQLite database from local demo data.
    monkeypatch.setattr(database, "DATABASE_PATH", tmp_path / "handovers.db")

    # Entering the context manager runs FastAPI startup and shutdown events.
    with TestClient(app) as test_client:
        yield test_client
