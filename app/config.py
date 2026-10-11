"""Application settings, loaded from environment variables and an optional .env file.

Every setting has a sensible default, so the app starts even without a .env file.
Secrets (like GEMINI_API_KEY) are only ever read from the environment — never
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

    # LLM configuration (used from Stage 3 onwards; not needed for /health)
    llm_provider: str = "gemini"
    llm_model: str = "gemini-2.5-flash"
    gemini_api_key: str = ""


settings = Settings()
