"""Service settings, read once at startup from .env (environment variables win)."""

import sys
from pathlib import Path

from pydantic import Field, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

# The service folder: .env lives here, whatever folder uvicorn is started from.
SERVICE_DIR = Path(__file__).parent


class Settings(BaseSettings):
    """Every setting the weather service needs. None has a default: all live in .env."""

    model_config = SettingsConfigDict(env_file=SERVICE_DIR / ".env")

    provider_base_url: str = Field(min_length=1)  # Open-Meteo's forecast URL
    provider_api_key: str  # may be empty: the free tier needs no key
    provider_timeout_seconds: float = Field(gt=0, le=60)  # per attempt
    provider_retries: int = Field(ge=0, le=5)  # extra attempts after the first
    provider_retry_pause_seconds: float = Field(ge=0, le=10)
    fresh_hours: float = Field(gt=0, le=24)  # a forecast this young is served without calling
    max_stale_hours: float = Field(gt=0, le=72)  # older than this, not even served as stale


def load_settings() -> Settings:
    """Read the settings, or stop the service now with one clear line."""
    try:
        return Settings()
    except ValidationError as exc:
        names = sorted({str(error["loc"][0]).upper() for error in exc.errors()})
        print(
            f"Missing or invalid setting: {', '.join(names)}. Copy .env.example to .env and fill it in.",
            file=sys.stderr,
        )
        sys.exit(1)


settings = load_settings()
