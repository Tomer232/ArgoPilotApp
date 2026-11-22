"""Shared test setup: every test gets its own fresh copy of the seeded database."""

import os
import shutil
import subprocess
from pathlib import Path

# config.py stops the process without DATABASE_URL. Tests need no .env: this file
# is never opened (mode=rw never creates it); each test points the app at its copy.
# Always overwritten, never taken from the shell, so a production URL there is never used.
os.environ["DATABASE_URL"] = "sqlite:///unused-by-tests.db"

import pytest  # noqa: E402  (must come after DATABASE_URL is set)
from fastapi.testclient import TestClient
from sqlalchemy import make_url

from helpers import ON_POSTGRES, use_database
from main import app
from seed import seed_database
from tables import metadata

SERVICE_DIR = Path(__file__).parent.parent


def pytest_configure(config):
    """Before any test: refuse a TEST_DATABASE_URL whose database name doesn't end in _test.

    Every test wipes that database, so it must never be the real "registry".
    """
    if ON_POSTGRES and not (make_url(os.environ["TEST_DATABASE_URL"]).database or "").endswith("_test"):
        raise pytest.UsageError("TEST_DATABASE_URL must name a database ending in _test (it is wiped).")


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
def db_path(request, tmp_path, monkeypatch) -> Path | None:
    """A fresh seeded database for this test, and point the app at it.

    SQLite (default): a private copy of the seeded file; returns its path.
    PostgreSQL (TEST_DATABASE_URL set): drop every table and seed again; returns None.
    """
    if ON_POSTGRES:
        engine = use_database(monkeypatch, os.environ["TEST_DATABASE_URL"])
        metadata.drop_all(engine)
        seed_database(engine)
        yield None
    else:
        path = tmp_path / "registry.db"
        shutil.copy(request.getfixturevalue("seeded_db"), path)
        engine = use_database(monkeypatch, f"sqlite:///{path}")
        yield path
    engine.dispose()  # no connection survives into the next test


@pytest.fixture
def client(db_path) -> TestClient:
    """Sends requests straight to the app, no server needed."""
    return TestClient(app)
