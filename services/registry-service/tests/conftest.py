"""Shared test setup: every test gets its own fresh copy of the seeded database."""

import shutil
import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from main import app

SERVICE_DIR = Path(__file__).parent.parent


@pytest.fixture(scope="session")
def seeded_db(tmp_path_factory) -> Path:
    """Run the real seed_registry.sh once per test run, into a temp folder."""
    path = tmp_path_factory.mktemp("seed") / "registry.db"
    subprocess.run(
        ["bash", "seed_registry.sh", str(path)],
        cwd=SERVICE_DIR,
        check=True,
        capture_output=True,
    )
    return path


@pytest.fixture
def db_path(seeded_db, tmp_path, monkeypatch) -> Path:
    """A private copy of the seeded database, and point the app at it."""
    path = tmp_path / "registry.db"
    shutil.copy(seeded_db, path)
    monkeypatch.setenv("REGISTRY_DB_PATH", str(path))
    return path


@pytest.fixture
def client(db_path) -> TestClient:
    """Sends requests straight to the app, no server needed."""
    return TestClient(app)
