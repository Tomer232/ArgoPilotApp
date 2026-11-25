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


def test_load_settings_exits_in_process_when_database_url_is_missing(tmp_path, monkeypatch, capsys):
    """Same as above, but in this process so coverage sees it: exit code 1 and the one-line message.

    config.py reads .env from its own folder, so chdir would not hide it; point the
    settings at an .env that does not exist instead. Nothing is reloaded, so nothing needs restoring.
    """
    import config

    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setitem(config.Settings.model_config, "env_file", tmp_path / ".env")
    with pytest.raises(SystemExit) as stop:
        config.load_settings()
    assert stop.value.code == 1
    assert "Missing required setting DATABASE_URL" in capsys.readouterr().err


def test_load_settings_reads_the_environment(tmp_path, monkeypatch):
    """With the variable set, load_settings returns it (the environment wins over .env)."""
    import config

    monkeypatch.setenv("DATABASE_URL", "sqlite:///from-env.db")
    monkeypatch.setitem(config.Settings.model_config, "env_file", tmp_path / ".env")
    assert config.load_settings().database_url == "sqlite:///from-env.db"


def test_engine_or_exit_stops_on_a_malformed_url_in_process(capsys):
    """db.engine_or_exit: a URL SQLAlchemy rejects gives exit code 1 and one readable line."""
    import db

    with pytest.raises(SystemExit) as stop:
        db.engine_or_exit("nonsense")
    assert stop.value.code == 1
    assert "DATABASE_URL is not a valid database URL" in capsys.readouterr().err


def test_sqlite_url_without_a_file_is_rejected():
    """db.sqlite_path: sqlite:// with no file path is an ArgumentError (the startup message above)."""
    import db
    from sqlalchemy import make_url
    from sqlalchemy.exc import ArgumentError

    with pytest.raises(ArgumentError):
        db.sqlite_path(make_url("sqlite://"))


def test_postgresql_engine_is_built_with_pre_ping_and_no_connection():
    """db.make_engine on a PostgreSQL URL builds a pooled engine with pool_pre_ping, without connecting."""
    import db
    from sqlalchemy.pool import NullPool

    engine = db.make_engine("postgresql+psycopg://user:pw@localhost:5432/x_test")
    try:
        assert engine.dialect.name == "postgresql"
        assert engine.pool._pre_ping is True
        assert not isinstance(engine.pool, NullPool)
    finally:
        engine.dispose()


def test_integrity_error_passes_through_connect_unchanged(client):
    """db.connect: a duplicate key is not turned into a 503; routes map it to 409 themselves."""
    import db
    from sqlalchemy import insert
    from sqlalchemy.exc import IntegrityError
    from tables import crops

    with pytest.raises(IntegrityError):
        with db.connect() as conn:
            conn.execute(insert(crops).values(id="tomato", name="Duplicate"))
