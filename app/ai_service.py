"""Groq integration: one schema-constrained LLM call per handover request.

Verified behaviour of the installed groq SDK 1.7.0 (checked against the
installed package and Groq's docs):
- Groq(api_key=..., timeout=<float SECONDS>, max_retries=0) bounds the real
  HTTP request; max_retries defaults to 2, so it is set to 0 and we own the
  retry policy ourselves: attempt 1 = the initial request, at most ONE retry,
  and only for eligible transient errors.
- Strict structured outputs via response_format={"type": "json_schema",
  "json_schema": {"name", "strict": True, "schema"}} are supported on
  openai/gpt-oss-120b and openai/gpt-oss-20b (constrained decoding).
- Strict-mode schema rules require every field in "required" and
  additionalProperties: false; nullable fields use anyOf unions (which our
  patient_reference str|null already produces).

Timeout semantics: ONE overall deadline (settings.llm_timeout_seconds, 30 s)
shared by both attempts. A Client is constructed per attempt with the
REMAINING budget as its timeout — a genuine network cut-off, not a post-hoc
elapsed check.
"""

import json
import time

import groq
from groq import Groq
from pydantic import ValidationError

from app.config import settings
from app.prompt import PROMPT_PREFIX, PROMPT_SUFFIX
from app.schemas import HandoverResponse

# Minimum budget worth spending on the single retry; below this we give up
# and report processing_timeout instead of starting a call we cannot bound.
MIN_RETRY_BUDGET_SECONDS = 2.0

# The exact keys the model's JSON must contain — no extras, none missing.
_EXPECTED_KEYS = set(HandoverResponse.model_fields.keys())


class LLMNotConfiguredError(Exception):
    """GROQ_API_KEY is missing from the backend configuration."""


class LLMAuthOrQuotaError(Exception):
    """The provider rejected the request: invalid credentials or quota/rate limit."""


class LLMUnavailableError(Exception):
    """The provider is unreachable or failing (after the single allowed retry)."""


class LLMTimeoutError(Exception):
    """The overall deadline expired; the network call was cut off."""


class LLMInvalidResponseError(Exception):
    """The provider replied with empty, blocked, or schema-invalid output."""


def _handover_json_schema() -> dict:
    """Build a strict-mode JSON schema from the contract model.

    Pydantic omits defaulted fields from "required"; Groq strict mode requires
    every field to be listed, so we add them explicitly. The model's own
    anyOf(str, null) for patient_reference is already strict-mode compatible.
    """
    schema = HandoverResponse.model_json_schema()
    schema["required"] = list(HandoverResponse.model_fields.keys())
    schema["additionalProperties"] = False
    return schema


def _client_for_attempt(budget_seconds: float) -> Groq:
    """Build a Client whose HTTP layer enforces the remaining budget for this attempt."""
    return Groq(
        api_key=settings.groq_api_key,
        timeout=budget_seconds,  # seconds (verified SDK unit)
        max_retries=0,  # no hidden SDK retries; our policy owns retrying
    )


def _extract(content: str | None) -> HandoverResponse:
    """Independently validate the model output against the contract schema.

    Strict on purpose: the JSON must be an object with exactly the six
    contract keys, and every value must type-check. Anything else is invalid
    output, never silently defaulted.
    """
    if not content or not content.strip():
        raise LLMInvalidResponseError("LLM returned an empty or blocked response.")

    try:
        payload = json.loads(content)
    except json.JSONDecodeError as exc:
        raise LLMInvalidResponseError("LLM returned malformed JSON.") from exc

    if not isinstance(payload, dict) or set(payload.keys()) != _EXPECTED_KEYS:
        raise LLMInvalidResponseError("LLM JSON does not match the handover schema keys.")

    try:
        return HandoverResponse.model_validate_json(content)
    except ValidationError as exc:
        raise LLMInvalidResponseError(
            "LLM returned JSON that does not match the handover schema."
        ) from exc


def process_transcript_with_llm(transcript: str) -> HandoverResponse:
    """Send the transcript to Groq once (plus at most one transient retry).

    Raises one of the typed LLM*Error classes; main.py maps them to HTTP
    responses. Never logs or embeds the API key or raw provider payloads.
    """
    if not settings.groq_api_key:
        raise LLMNotConfiguredError("GROQ_API_KEY is not configured.")

    prompt = PROMPT_PREFIX + transcript + PROMPT_SUFFIX
    deadline = time.monotonic() + settings.llm_timeout_seconds
    max_attempts = 2

    for attempt in range(1, max_attempts + 1):
        budget_seconds = deadline - time.monotonic()
        if budget_seconds <= 0:
            raise LLMTimeoutError("Overall LLM deadline expired before the call.")

        try:
            client = _client_for_attempt(budget_seconds)
            response = client.chat.completions.create(
                model=settings.llm_model,
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "handover_response",
                        "strict": True,
                        "schema": _handover_json_schema(),
                    },
                },
            )
        except groq.APITimeoutError as exc:
            # Real network cut-off; no budget left to retry meaningfully.
            raise LLMTimeoutError("LLM request exceeded the overall deadline.") from exc
        except (groq.AuthenticationError, groq.PermissionDeniedError, groq.RateLimitError) as exc:
            # Credentials rejected, forbidden, or quota/rate limit hit.
            raise LLMAuthOrQuotaError("LLM rejected credentials or quota.") from exc
        except (groq.InternalServerError, groq.APIConnectionError) as exc:
            # Provider-side failure or connection problem: transient, eligible
            # for the single retry.
            if attempt < max_attempts and (deadline - time.monotonic()) > MIN_RETRY_BUDGET_SECONDS:
                continue
            raise LLMUnavailableError("LLM provider is failing or unreachable.") from exc
        except groq.APIStatusError as exc:
            # Other HTTP errors from the provider (bad request, unknown model...).
            raise LLMUnavailableError("LLM provider rejected the request.") from exc

        return _extract(response.choices[0].message.content)

    raise LLMUnavailableError("LLM provider did not return a usable result.")  # safety net
