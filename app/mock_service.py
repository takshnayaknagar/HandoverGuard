"""Mock handover processing — Stage 2 placeholder.

IMPORTANT: this module does NOT analyse the transcript in any way. It returns
a fixed, clearly-labelled response so the API contract can be built, tested,
and integrated with the frontend before any LLM exists.

Stage 3 will replace the call to this module with app/ai_service.py, which
sends the transcript to Gemini and validates the result against the same
HandoverResponse schema.
"""

from app.schemas import HandoverResponse

MOCK_NOTICE = (
    "Mock response: no analysis has been performed yet. "
    "LLM integration arrives in Stage 3."
)


def mock_process_transcript(transcript: str) -> HandoverResponse:
    """Return an honest placeholder handover. The transcript is deliberately unused."""
    return HandoverResponse(unclear_or_undocumented=[MOCK_NOTICE])
