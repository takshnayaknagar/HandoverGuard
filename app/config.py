"""Application settings, loaded from environment variables and an optional .env file.

Every setting has a sensible default, so the app starts even without a .env file.
Secrets (like GROQ_API_KEY) are only ever read from the environment — never
hardcoded here and never written to logs.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Server settings
    app_host: str = "127.0.0.1"
    app_port: int = 8000

    # CORS: only this origin may call the API from a browser.
    frontend_origin: str = "http://localhost:3000"

    # Input limits
    max_transcript_chars: int = 10_000

    # LLM configuration
    llm_provider: str = "groq"
    llm_model: str = "openai/gpt-oss-120b"
    groq_api_key: str = ""

    # Overall deadline for ONE /process-handover LLM call, in seconds.
    # Shared across the initial attempt and the single allowed retry.
    llm_timeout_seconds: float = 30.0

    # LLM output bounds (safety): out-of-bounds model output is rejected
    # with llm_invalid_response (502), never silently truncated.
    max_output_items: int = 100
    max_output_item_chars: int = 500

    # Speech-to-text settings (local faster-whisper)
    stt_timeout_seconds: float = 180.0
    max_audio_mb: int = 25
    stt_max_concurrent: int = 2


settings = Settings()
