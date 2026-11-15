"""SQLite access: one short-lived connection per request."""

import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import Engine, create_engine, event, make_url
from sqlalchemy.engine import URL
from sqlalchemy.pool import NullPool

from config import SERVICE_DIR
from errors import UnavailableError


def make_engine(url: str, *, creating: bool = False) -> Engine:
    """Build the SQLAlchemy engine for a database URL (SQLite or PostgreSQL).

    `creating=True` is for the seed only: it may create a new SQLite file.
    """
    parsed = make_url(url)
    if parsed.get_backend_name() != "sqlite":
        # pre_ping: a restarted PostgreSQL never hands out a dead pooled connection.
        return create_engine(parsed, pool_pre_ping=True)
    path = sqlite_path(parsed)
    if creating:
        engine = create_engine(parsed.set(database=str(path)), poolclass=NullPool)
        make_ddl_transactional(engine)
    else:
        # mode=rw: open an existing file only, never create an empty database.
        rw_url = parsed.set(database=path.as_uri(), query={"mode": "rw", "uri": "true"})
        # NullPool: a fresh connection per request, like before, so a broken file shows at once.
        engine = create_engine(rw_url, poolclass=NullPool)
    turn_on_foreign_keys(engine)
    return engine


def sqlite_path(url: URL) -> Path:
    """The SQLite file of a URL. A relative path means the service folder."""
    path = Path(url.database)
    return path if path.is_absolute() else SERVICE_DIR / path


def turn_on_foreign_keys(engine: Engine) -> None:
    """SQLite ignores REFERENCES unless this pragma is on, on every new connection."""

    @event.listens_for(engine, "connect")
    def on_connect(dbapi_connection, connection_record):
        """Runs once per new SQLite connection, before it is used."""
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys = ON")
        cursor.close()


def make_ddl_transactional(engine: Engine) -> None:
    """Let CREATE TABLE roll back on SQLite, so a failed seed leaves nothing behind.

    Python's sqlite3 commits before every CREATE TABLE by default. SQLAlchemy's
    documented fix: the driver stops managing transactions, and we send BEGIN.
    Used only by the seed; request engines keep sqlite3's default behaviour.
    """

    @event.listens_for(engine, "connect")
    def on_connect(dbapi_connection, connection_record):
        """Turn off the driver's own transaction handling."""
        dbapi_connection.isolation_level = None

    @event.listens_for(engine, "begin")
    def on_begin(conn):
        """Start a real transaction that also covers CREATE TABLE."""
        conn.exec_driver_sql("BEGIN")

# registry.db next to this file, unless REGISTRY_DB_PATH says otherwise (tests use that).
DEFAULT_DB_PATH = Path(__file__).parent / "registry.db"


def db_path() -> Path:
    """Where the database file is."""
    return Path(os.environ.get("REGISTRY_DB_PATH", DEFAULT_DB_PATH))


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    """Open the database for one unit of work.

    Usage:  with connect() as conn: ...
    - mode=rw: open an existing file only. Without it, sqlite3 would silently
      create an empty database when the file is missing.
    - foreign_keys: SQLite ignores REFERENCES unless this is on, per connection.
    - Commits if the block succeeds; if it raises, the changes are discarded.
    - IntegrityError (e.g. duplicate plot name) passes through for routes to turn into 409.
    - Any other database error (missing file, locked, corrupt file) becomes a 503.
    """
    conn = None
    try:
        uri = db_path().resolve().as_uri() + "?mode=rw"
        conn = sqlite3.connect(uri, uri=True)
        conn.row_factory = sqlite3.Row  # rows behave like dicts: row["name"]
        conn.execute("PRAGMA foreign_keys = ON")
        yield conn
        conn.commit()
    except sqlite3.IntegrityError:
        raise
    except sqlite3.DatabaseError as exc:
        raise UnavailableError("Database unavailable") from exc
    finally:
        if conn is not None:
            conn.close()
