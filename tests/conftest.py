"""Shared pytest fixtures: a test client for the FastAPI app.

The LLM is never called in tests — Stage 1 only has /health, which is
fully independent of any LLM configuration.
"""

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
