"""Gemini integration: one schema-constrained LLM call per handover request.

Verified behaviour of the installed google-genai 2.29.0 (checked against the
installed package source and an empirical non-routable-address test, not docs):
- HttpOptions.timeout is an INTEGER in MILLISECONDS and bounds the real HTTP
  request (a 500 ms timeout cut the socket off at ~0.54 s, raising
  httpx.ConnectTimeout).
- The SDK AUTO-RETRIES up to 5 times by default; HttpRetryOptions(attempts=1)
  disables that completely. We use attempts=1 everywhere and own the retry
  policy ourselves: attempt 1 = the initial request, at most ONE retry, and
  only for eligible transient errors.
- There is no per-call timeout parameter on generate_content, so a Client is
  constructed per attempt with the REMAINING overall budget as its timeout.
  Client construction performs no network call.

Timeout semantics: ONE overall deadline (settings.llm_timeout_seconds, 30 s)
shared by both attempts. Attempt 1 gets the full budget; the retry gets only
what remains. This is a genuine network cut-off, not a post-hoc elapsed check.
"""

import json
import time

import httpx
from google import genai
from google.genai import errors as genai_errors
from google.genai import types as genai_types
from pydantic import ValidationError

from app.config import settings
from app.prompt import PROMPT_PREFIX, PROMPT_SUFFIX
from app.schemas import HandoverResponse

# Minimum budget worth spending on the single retry; below this we give up
# and report processing_timeout instead of starting a call we cannot bound.
MIN_RETRY_BUDGET_SECONDS = 2.0

# ClientError codes that mean authentication/permission or quota/rate-limit.
_AUTH_OR_QUOTA_CODES = {401, 403, 429}


class LLMNotConfiguredError(Exception):
    """GEMINI_API_KEY is missing from the backend configuration."""


class LLMAuthOrQuotaError(Exception):
    """The provider rejected the request: invalid credentials or quota/rate limit."""


class LLMUnavailableError(Exception):
    """The provider is unreachable or failing (after the single allowed retry)."""


class LLMTimeoutError(Exception):
    """The overall deadline expired; the network call was cut off."""


class LLMInvalidResponseError(Exception):
    """The provider replied with empty, blocked, or schema-invalid output."""


def _client_for_attempt(budget_seconds: float) -> genai.Client:
    """Build a Client whose HTTP layer enforces the remaining budget for this attempt."""
    return genai.Client(
        api_key=settings.gemini_api_key,
        http_options=genai_types.HttpOptions(
            timeout=max(1, int(budget_seconds * 1000)),  # milliseconds, verified unit
            retry_options=genai_types.HttpRetryOptions(attempts=1),  # no hidden SDK retries
        ),
    )


# The exact keys the model's JSON must contain — no extras, none missing.
_EXPECTED_KEYS = set(HandoverResponse.model_fields.keys())


def _extract(response: genai_types.GenerateContentResponse) -> HandoverResponse:
    """Independently validate the model output against the contract schema.

    Strict on purpose: the JSON must be an object with exactly the six
    contract keys (Gemini rejects additionalProperties in the request schema,
    so key checking happens here instead of in the Pydantic model), and every
    value must type-check. Anything else is invalid output, never silently
    defaulted.
    """
    text = response.text  # None when blocked/empty candidates
    if not text or not text.strip():
        raise LLMInvalidResponseError("LLM returned an empty or blocked response.")

    try:
        payload = json.loads(text)
    except json.JSONDecodeError as exc:
        raise LLMInvalidResponseError("LLM returned malformed JSON.") from exc

    if not isinstance(payload, dict) or set(payload.keys()) != _EXPECTED_KEYS:
        raise LLMInvalidResponseError("LLM JSON does not match the handover schema keys.")

    try:
        return HandoverResponse.model_validate_json(text)
    except ValidationError as exc:
        raise LLMInvalidResponseError(
            "LLM returned JSON that does not match the handover schema."
        ) from exc


def process_transcript_with_llm(transcript: str) -> HandoverResponse:
    """Send the transcript to Gemini once (plus at most one transient retry).

    Raises one of the typed LLM*Error classes; main.py maps them to HTTP
    responses. Never logs or embeds the API key or raw provider payloads.
    """
    if not settings.gemini_api_key:
        raise LLMNotConfiguredError("GEMINI_API_KEY is not configured.")

    prompt = PROMPT_PREFIX + transcript + PROMPT_SUFFIX
    deadline = time.monotonic() + settings.llm_timeout_seconds
    max_attempts = 2

    for attempt in range(1, max_attempts + 1):
        budget_seconds = deadline - time.monotonic()
        if budget_seconds <= 0:
            raise LLMTimeoutError("Overall LLM deadline expired before the call.")

        try:
            client = _client_for_attempt(budget_seconds)
            response = client.models.generate_content(
                model=settings.llm_model,
                contents=prompt,
                config=genai_types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=HandoverResponse,
                ),
            )
        except httpx.TimeoutException as exc:
            # Real network cut-off; no budget left to retry meaningfully.
            raise LLMTimeoutError("LLM request exceeded the overall deadline.") from exc
        except genai_errors.ServerError as exc:
            # 5xx from the provider: transient, eligible for the single retry.
            if attempt < max_attempts and (deadline - time.monotonic()) > MIN_RETRY_BUDGET_SECONDS:
                continue
            raise LLMUnavailableError("LLM provider returned a server error.") from exc
        except httpx.TransportError as exc:
            # Connection failures/resets: transient, eligible for the single retry.
            if attempt < max_attempts and (deadline - time.monotonic()) > MIN_RETRY_BUDGET_SECONDS:
                continue
            raise LLMUnavailableError("Could not reach the LLM provider.") from exc
        except genai_errors.ClientError as exc:
            if exc.code in _AUTH_OR_QUOTA_CODES:
                raise LLMAuthOrQuotaError("LLM rejected credentials or quota.") from exc
            raise LLMUnavailableError("LLM provider rejected the request.") from exc

        return _extract(response)

    raise LLMUnavailableError("LLM provider did not return a usable result.")  # safety net
