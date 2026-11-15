"""seed.py loads exactly the original 15 rows, all or nothing, and never over existing tables."""

import sqlite3
from pathlib import Path

import pytest
from sqlalchemy import inspect, text

import seed
from db import make_engine

ORIGINAL = Path(__file__).parent / "data" / "original_seed.sql"
TABLES = ["farms", "crops", "soils", "emitters", "plots"]


def rows_by_table(conn: sqlite3.Connection) -> dict[str, list[tuple]]:
    """Every row of every table, oldest first, without seq."""
    out = {}
    for table in TABLES:
        cols = [c[1] for c in conn.execute(f"PRAGMA table_info({table})") if c[1] != "seq"]
        query = f"SELECT {', '.join(cols)} FROM {table} ORDER BY rowid"
        out[table] = conn.execute(query).fetchall()
    return out


def test_seed_rows_match_original_script(tmp_path):
    """seed.py writes the same rows, in the same order, as the original seed_registry.sh."""
    original = sqlite3.connect(":memory:")
    original.executescript(ORIGINAL.read_text())
    path = tmp_path / "new.db"
    seed.seed_database(make_engine(f"sqlite:///{path}", creating=True))
    new = rows_by_table(sqlite3.connect(path))
    assert new == rows_by_table(original)
    assert sum(len(rows) for rows in new.values()) == 15


def test_seed_refuses_when_tables_exist(tmp_path):
    """A second seed stops and leaves the first one's rows alone."""
    engine = make_engine(f"sqlite:///{tmp_path / 'x.db'}", creating=True)
    seed.seed_database(engine)
    with pytest.raises(seed.TablesExistError):
        seed.seed_database(engine)
    with engine.connect() as conn:
        assert conn.execute(text("SELECT count(*) FROM farms")).scalar() == 2


def test_seed_refuses_when_some_tables_exist(tmp_path):
    """Even one of the five tables existing is enough to refuse, and nothing is added."""
    engine = make_engine(f"sqlite:///{tmp_path / 'x.db'}", creating=True)
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE farms (id TEXT)"))
    with pytest.raises(seed.TablesExistError):
        seed.seed_database(engine)
    assert inspect(engine).get_table_names() == ["farms"]


def test_failed_seed_leaves_no_tables(tmp_path, monkeypatch):
    """A seed that fails part-way rolls back the tables too, not just the rows."""
    plots = seed.SEED_ROWS["plots"]
    broken = {**seed.SEED_ROWS, "plots": plots + [plots[0]]}
    monkeypatch.setattr(seed, "SEED_ROWS", broken)  # the last insert breaks the unique rules
    engine = make_engine(f"sqlite:///{tmp_path / 'x.db'}", creating=True)
    with pytest.raises(Exception):
        seed.seed_database(engine)
    assert inspect(engine).get_table_names() == []


def test_relative_sqlite_path_is_in_service_folder():
    """sqlite:///name.db means the service folder, wherever the process was started."""
    engine = make_engine("sqlite:///some-name.db")
    path = Path(engine.url.database.removeprefix("file:"))
    assert path.parent == Path(seed.__file__).parent
