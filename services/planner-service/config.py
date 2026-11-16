"""Service settings, read once at startup from .env (environment variables win)."""

import sys
from pathlib import Path

from pydantic import Field, ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

# The service folder: .env lives here, whatever folder uvicorn is started from.
SERVICE_DIR = Path(__file__).parent


class Settings(BaseSettings):
    """Every setting the planner needs. None has a default: all live in .env."""

    model_config = SettingsConfigDict(env_file=SERVICE_DIR / ".env")

    registry_url: str = Field(min_length=1)  # e.g. http://127.0.0.1:8000
    weather_url: str = Field(min_length=1)  # e.g. http://127.0.0.1:8001
    registry_timeout_seconds: float = Field(gt=0, le=60)
    weather_timeout_seconds: float = Field(gt=0, le=60)  # longer than weather's own retries (O84)


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
