"""Service settings, read once at startup from .env (environment variables win)."""

import sys
from pathlib import Path

from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

# The service folder: .env lives here, whatever folder uvicorn is started from.
SERVICE_DIR = Path(__file__).parent


class Settings(BaseSettings):
    """Every setting the registry needs. A field with no default is required."""

    model_config = SettingsConfigDict(env_file=SERVICE_DIR / ".env")

    database_url: str


def load_settings() -> Settings:
    """Read the settings, or stop the service now with one clear line."""
    try:
        return Settings()
    except ValidationError:
        print(
            "Missing required setting DATABASE_URL. Copy .env.example to .env and fill it in.",
            file=sys.stderr,
        )
        sys.exit(1)


settings = load_settings()
