"""SQLite access: one short-lived connection per request."""

import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from errors import UnavailableError

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
