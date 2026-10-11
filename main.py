"""HandoverGuard backend — FastAPI application entry point.

Run locally with:
    uvicorn main:app --reload

Stage 1 scope: only the /health endpoint. It does not depend on any
LLM configuration and always returns 200 when the backend is running.
"""

from fastapi import FastAPI

app = FastAPI(
    title="HandoverGuard Backend",
    description="AI-assisted medical handover organization tool (hackathon prototype).",
    version="0.1.0",
)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness check: the backend is running. No LLM or external service involved."""
    return {"status": "ok"}
