"""Shared test setup: fixed settings from helpers.py, an empty cache, and a test client."""

import os

from helpers import TEST_SETTINGS

# config.py stops the process without its settings. Always overwritten, never taken
# from the shell or a .env, so tests behave the same on every machine.
os.environ.update(TEST_SETTINGS)

import pytest  # noqa: E402  (must come after the settings are set)
from fastapi.testclient import TestClient  # noqa: E402

import forecast  # noqa: E402
from main import app  # noqa: E402


@pytest.fixture(autouse=True)
def empty_cache():
    """Every test starts with an empty forecast cache, like a fresh process."""
    forecast.CACHE.clear()


@pytest.fixture
def client() -> TestClient:
    """A client that talks to the app in-process."""
    return TestClient(app)
