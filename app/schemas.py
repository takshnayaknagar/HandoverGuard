"""Pydantic models defining the API contract.

These models are the single source of truth for what the API accepts and
returns. Stage 3 will reuse HandoverResponse as the schema the LLM must
produce, so the contract never drifts between mock and real processing.
"""

from pydantic import BaseModel, Field


class HandoverRequest(BaseModel):
    """Request body for POST /process-handover."""

    transcript: str = Field(..., description="The doctor's voice-note transcript, as plain text.")
    patient_bed: str | None = Field(default=None, max_length=128)


class HandoverResponse(BaseModel):
    """Response body for POST /process-handover.

    patient_reference is null unless the transcript itself clearly establishes
    a patient or bed reference. An empty list means "nothing documented in
    this category" — never "nothing outstanding".

    NOTE: LLM-output strictness (exact key set + types) is enforced in
    app/ai_service.py, independent of provider.
    """

    patient_reference: str | None = None
    patient_bed: str | None = None
    completed: list[str] = Field(default_factory=list)
    pending: list[str] = Field(default_factory=list)
    follow_up: list[str] = Field(default_factory=list)
    communication: list[str] = Field(default_factory=list)
    unclear_or_undocumented: list[str] = Field(default_factory=list)
