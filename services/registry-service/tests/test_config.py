"""config.py and db.py: a missing or malformed DATABASE_URL stops the service at startup with a clear message."""

import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

SERVICE_DIR = Path(__file__).parent.parent


def import_config_in(folder: Path, env: dict) -> subprocess.CompletedProcess:
    """Copy config.py into `folder` (so no real .env is next to it) and import it there."""
    shutil.copy(SERVICE_DIR / "config.py", folder / "config.py")
    return subprocess.run(
        [sys.executable, "-c", "import config"],
        cwd=folder,
        env=env,
        capture_output=True,
        text=True,
    )


def clean_env() -> dict:
    """This process's environment without DATABASE_URL."""
    return {k: v for k, v in os.environ.items() if k != "DATABASE_URL"}


def test_missing_database_url_stops_with_clear_message(tmp_path):
    """No .env and no variable: exit code 1 and one readable line, no traceback."""
    result = import_config_in(tmp_path, clean_env())
    assert result.returncode == 1
    assert "DATABASE_URL" in result.stderr
    assert ".env.example" in result.stderr
    assert "Traceback" not in result.stderr


def test_database_url_from_env_file(tmp_path):
    """A .env next to config.py is enough to start."""
    (tmp_path / ".env").write_text("DATABASE_URL=sqlite:///x.db\n")
    result = import_config_in(tmp_path, clean_env())
    assert result.returncode == 0, result.stderr


@pytest.mark.parametrize("url", ["postgres://registry@localhost/registry", "nonsense", "sqlite://"])
def test_malformed_database_url_stops_with_clear_message(url):
    """A DATABASE_URL that isn't a usable URL: exit code 1 and one readable line, no traceback.

    postgres:// is a common copy-paste form that SQLAlchemy rejects; it needs postgresql+psycopg://.
    """
    result = subprocess.run(
        [sys.executable, "-c", "import db"],
        cwd=SERVICE_DIR,
        env={**clean_env(), "DATABASE_URL": url},  # the environment wins over any .env
        capture_output=True,
        text=True,
    )
    assert result.returncode == 1
    assert "DATABASE_URL is not a valid database URL" in result.stderr
    assert "Traceback" not in result.stderr
