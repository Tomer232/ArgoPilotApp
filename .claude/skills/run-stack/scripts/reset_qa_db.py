"""Wipe the QA database and seed it again with the 15 demo rows.

Run by stack.sh with DATABASE_URL pointing at the QA database, from services/registry-service:
    uv run python ../../.claude/skills/run-stack/scripts/reset_qa_db.py
Refuses any database whose name doesn't end in _qa, so it can never wipe 'registry'.
"""

import sys
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.exc import OperationalError

sys.path.insert(0, str(Path.cwd()))  # the registry's own modules (tables, seed)

from seed import seed_database  # noqa: E402
from tables import metadata  # noqa: E402
from config import settings  # noqa: E402


def main() -> None:
    """Drop every registry table in the QA database, then create and seed them again."""
    url = make_url(settings.database_url)
    if not (url.database or "").endswith("_qa"):
        sys.exit("Refusing: the QA database name must end in _qa (it is wiped).")
    engine = create_engine(url)
    try:
        metadata.drop_all(engine)
        seed_database(engine)
    except OperationalError as error:
        # PostgreSQL's own reason (never contains the password), e.g. "password authentication failed".
        reason = str(error.orig).strip().splitlines()[0] if error.orig else "unknown"
        sys.exit(
            f"Cannot connect to '{url.database}' as '{url.username}': {reason}\n"
            f"Setup: 'sudo -u postgres createdb -O registry {url.database}', and its password in ~/.pgpass "
            f"(plain, not URL-encoded; escape ':' and '\\' with '\\')."
        )
    finally:
        engine.dispose()
    print(f"{url.database}: wiped and seeded")


if __name__ == "__main__":
    main()
