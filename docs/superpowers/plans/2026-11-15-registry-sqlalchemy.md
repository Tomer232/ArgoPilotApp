# Registry on SQLAlchemy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `services/registry-service` does all data access through SQLAlchemy Core and runs on SQLite or PostgreSQL, chosen only by `DATABASE_URL`, with the API unchanged apart from the new name rule.

**Architecture:** `config.py` reads `DATABASE_URL` (pydantic-settings). `tables.py` declares the schema once. `db.py` builds one engine and keeps the `with connect() as conn:` contract (commit on success, `IntegrityError` passes through, other database errors become 503). Routes keep their shape and build queries with `select/insert/update/delete`. `seed.py` creates the tables and the 15 rows in one transaction on either database.

**Tech Stack:** Python 3.12, uv, FastAPI, SQLAlchemy 2.x Core, pydantic-settings, psycopg 3 (`psycopg[binary]`), pytest.

**Spec:** `docs/superpowers/specs/2026-11-15-registry-sqlalchemy-design.md` (read it first; decision numbers below refer to it).

## Global Constraints

- All commands run from `services/registry-service`. Never read any `.env` file (deny rule).
- AGENTS.md: a short docstring on every function, small functions, plain code, surgical changes. Stop after each task for the owner's review (AGENTS.md "How we work"). Never use emojis.
- Every endpoint keeps its status codes, problem+json bodies, `code`s, `Retry-After: 5` on 503, field names, JSON values and oldest-first list order. The only API change is decision 5 (names).
- No `import sqlite3` in service code (`*.py` in the service folder). Tests and `scripts/` may use it.
- `seq` is never returned by the API.
- `REGISTRY_DB_PATH` is removed everywhere. `DATABASE_URL` replaces it.
- PostgreSQL: role `registry`, password `registry`, database `registry` on `localhost:5432`. Example URL, verbatim: `postgresql+psycopg://registry:CHANGE_ME@localhost:5432/registry?connect_timeout=3&options=-c%20statement_timeout%3D5000`.
- Name rule (decision 5): after trimming, 1 to 200 characters and no NUL (`\x00`); otherwise 422 `VALIDATION`. Applies to farm and plot names.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A NUL character in a catalogue id** (`GET /v1/crops/a%00b`, or `"crop_id": "a\u0000b"` in a plot body): PostgreSQL cannot compare text containing NUL and raises `DataError`, which would be a 503. Expected: 404 `NOT_FOUND` for the path, 422 `VALIDATION` for the body, on both databases. Pinned in Task 4. This is the agent's call, recorded as an A-decision.
2. **A name of exactly 200 characters plus surrounding spaces**: trimming happens before the length check, so it is 201. Pinned in Task 4.
3. **`DATABASE_URL=sqlite:///registry.db` with uvicorn started from another folder**: a relative SQLite path means the service folder, not the working directory. Pinned in Task 3.
4. **PATCH on a plot that does not send `planting_date`**: the stored `date` passes through, and the response still shows `"YYYY-MM-DD"` text. Pinned in Task 3.
5. **Seeding a database that has some but not all of the tables**: refuses and changes nothing. Pinned in Task 2.

---

### Task 1: Settings and startup check

**Files:**
- Modify: `pyproject.toml`, `uv.lock` (via `uv add`)
- Create: `config.py`, `.env.example`
- Test: `tests/test_config.py`

**Interfaces:**
- Produces: `config.SERVICE_DIR: Path` (the service folder), `config.settings: Settings` with `settings.database_url: str`. `Settings` reads `SERVICE_DIR / ".env"`, and environment variables override it.

- [ ] **Step 1: Add the dependencies**

Run: `uv add "sqlalchemy~=2.0" "pydantic-settings~=2.0" "psycopg[binary]~=3.2"`
Expected: `pyproject.toml` lists all three, and `uv.lock` is updated.

- [ ] **Step 2: Write the failing tests**

```python
# tests/test_config.py
"""config.py: a missing DATABASE_URL stops the service at startup with a clear message."""
import os, shutil, subprocess, sys
from pathlib import Path

SERVICE_DIR = Path(__file__).parent.parent

def import_config_in(folder: Path, env: dict) -> subprocess.CompletedProcess:
    """Copy config.py into `folder` (so no real .env is next to it) and import it there."""
    shutil.copy(SERVICE_DIR / "config.py", folder / "config.py")
    return subprocess.run([sys.executable, "-c", "import config"], cwd=folder, env=env,
                          capture_output=True, text=True)

def clean_env() -> dict:
    return {k: v for k, v in os.environ.items() if k != "DATABASE_URL"}

def test_missing_database_url_stops_with_clear_message(tmp_path):
    result = import_config_in(tmp_path, clean_env())
    assert result.returncode == 1
    assert "DATABASE_URL" in result.stderr
    assert ".env.example" in result.stderr
    assert "Traceback" not in result.stderr

def test_database_url_from_env_file(tmp_path):
    (tmp_path / ".env").write_text("DATABASE_URL=sqlite:///x.db\n")
    result = import_config_in(tmp_path, clean_env())
    assert result.returncode == 0, result.stderr
```

- [ ] **Step 3: Run the tests to make sure they fail**

Run: `uv run pytest tests/test_config.py -v`
Expected: FAIL (no `config.py` to copy).

- [ ] **Step 4: Implement `config.py`**

`class Settings(BaseSettings)` with `database_url: str` and `model_config = SettingsConfigDict(env_file=SERVICE_DIR / ".env")`. A function `load_settings() -> Settings` catches pydantic's `ValidationError`, prints exactly `Missing required setting DATABASE_URL. Copy .env.example to .env and fill it in.` to stderr, and calls `sys.exit(1)`. `settings = load_settings()` at module level.

- [ ] **Step 5: Write `.env.example`**

`DATABASE_URL=sqlite:///registry.db` is active. Below it is the commented PostgreSQL URL from Global Constraints, then a commented `# TEST_DATABASE_URL=postgresql+psycopg://registry:CHANGE_ME@localhost:5432/registry_test?connect_timeout=3&options=-c%20statement_timeout%3D5000`. Each line gets a one-line comment saying what it is.

- [ ] **Step 6: Run the tests to make sure they pass**

Run: `uv run pytest tests/test_config.py -v`, then `uv run pytest`
Expected: 2 passed, and the full suite still passes (nothing imports `config` yet).

- [ ] **Step 7: Commit**

```bash
git add pyproject.toml uv.lock config.py .env.example tests/test_config.py
git commit -m "Registry: config.py with required DATABASE_URL, .env.example, SQLAlchemy deps"
```

---

### Task 2: Schema, seed command and wrapper

The old routes keep working during this task. On SQLite, `seq INTEGER PRIMARY KEY` is the `rowid`, so `ORDER BY rowid` still works, and the `Date` column is stored as `'YYYY-MM-DD'` text. The full suite must stay green.

**Files:**
- Create: `tables.py`, `seed.py`, `tests/data/original_seed.sql`, `tests/test_seed.py`
- Modify: `db.py` (add `make_engine` only; `connect()` is unchanged in this task), `seed_registry.sh`

**Interfaces:**
- Consumes: `config.SERVICE_DIR`, `config.settings.database_url` (Task 1).
- Produces:
  - `tables.metadata: MetaData`, and `tables.farms, crops, soils, emitters, plots: Table`. Every table has `seq` (`Integer, primary_key=True`, autoincrement) and `id` (`String, unique=True, nullable=False`). The other columns are as in today's `seed_registry.sh`: `String` for TEXT, `Integer` for `available_water_mm_per_m`, `Float` for REAL, `Date` for `plots.planting_date`. `plots.farm_id/crop_id/soil_id/emitter_id` are `ForeignKey("<table>.id")`, with `UniqueConstraint("farm_id", "name")` on plots. `tables.ALL_TABLES` lists the five in insert order: crops, soils, emitters, farms, plots.
  - `db.make_engine(url: str, *, creating: bool = False) -> Engine`. A relative SQLite path is resolved against `SERVICE_DIR`. `creating=False` opens SQLite with `mode=rw` (never creates a file). `creating=True` may create it. Every SQLite engine runs `PRAGMA foreign_keys = ON` per connection and has transactional DDL (see Step 4). PostgreSQL engines get `pool_pre_ping=True`.
  - `seed.SEED_ROWS: dict[str, list[dict]]`: table name to rows, in today's order, with `planting_date` as `datetime.date`.
  - `seed.seed_database(engine: Engine) -> None`: in one `engine.begin()` block, it raises `seed.TablesExistError` if any of the five tables exists, otherwise runs `metadata.create_all(conn)` and inserts `SEED_ROWS`.
  - CLI: `uv run python seed.py [DATABASE_URL]`. With no argument it uses `settings.database_url`. It prints `Seeded <url without password>` and `  2 farms, 4 plots, 2 crops, 3 soils, 4 emitters`. On `TablesExistError` it prints `Tables already exist; nothing changed.` to stderr and exits 1.

- [ ] **Step 1: Save the original seed SQL**

Copy the SQL between `<<'SQL'` and `SQL` in today's `seed_registry.sh` verbatim into `tests/data/original_seed.sql` (CREATE TABLEs and INSERTs). Add a first-line comment: `-- Verbatim copy of seed_registry.sh before the SQLAlchemy move; tests/test_seed.py compares seed.py against it.`

- [ ] **Step 2: Write the failing tests**

```python
# tests/test_seed.py
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
        out[table] = conn.execute(f"SELECT {', '.join(cols)} FROM {table} ORDER BY rowid").fetchall()
    return out

def test_seed_rows_match_original_script(tmp_path):
    original = sqlite3.connect(":memory:")
    original.executescript(ORIGINAL.read_text())
    path = tmp_path / "new.db"
    seed.seed_database(make_engine(f"sqlite:///{path}", creating=True))
    new = rows_by_table(sqlite3.connect(path))
    assert new == rows_by_table(original)
    assert sum(len(r) for r in new.values()) == 15

def test_seed_refuses_when_tables_exist(tmp_path):
    engine = make_engine(f"sqlite:///{tmp_path / 'x.db'}", creating=True)
    seed.seed_database(engine)
    with pytest.raises(seed.TablesExistError):
        seed.seed_database(engine)
    with engine.connect() as conn:
        assert conn.execute(text("SELECT count(*) FROM farms")).scalar() == 2

def test_seed_refuses_when_some_tables_exist(tmp_path):
    engine = make_engine(f"sqlite:///{tmp_path / 'x.db'}", creating=True)
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE farms (id TEXT)"))
    with pytest.raises(seed.TablesExistError):
        seed.seed_database(engine)
    assert inspect(engine).get_table_names() == ["farms"]

def test_failed_seed_leaves_no_tables(tmp_path, monkeypatch):
    broken = {**seed.SEED_ROWS, "plots": seed.SEED_ROWS["plots"] + [seed.SEED_ROWS["plots"][0]]}
    monkeypatch.setattr(seed, "SEED_ROWS", broken)  # last insert breaks the unique rules
    engine = make_engine(f"sqlite:///{tmp_path / 'x.db'}", creating=True)
    with pytest.raises(Exception):
        seed.seed_database(engine)
    assert inspect(engine).get_table_names() == []

def test_relative_sqlite_path_is_in_service_folder():
    engine = make_engine("sqlite:///some-name.db")
    assert Path(engine.url.database.removeprefix("file:")).parent == Path(seed.__file__).parent
```

`test_relative_sqlite_path_is_in_service_folder` (Review Focus 3) assumes the `file:<path>` URI form from Step 4. Adjust the one assertion if `make_engine` exposes the path differently, but keep what it checks.

- [ ] **Step 3: Run the tests to make sure they fail**

Run: `uv run pytest tests/test_seed.py -v`
Expected: FAIL with `ModuleNotFoundError: seed` (or a missing `make_engine`).

- [ ] **Step 4: Implement `tables.py`, `db.make_engine`, `seed.py`**

For SQLite in `make_engine`, use SQLAlchemy's documented pysqlite recipe for transactional DDL ("Serializable isolation / Savepoints / Transactional DDL"). On the `connect` event, set `dbapi_connection.isolation_level = None` and run `PRAGMA foreign_keys = ON` (it must run outside a transaction, or SQLite ignores it). On the `begin` event, emit `BEGIN`. This gives DDL rollback for the seed, and requests keep their old behaviour (deferred `BEGIN`, 5 s default lock wait). The full suite in Task 3 proves the second part. For `mode=rw`, build `sqlite:///file:<absolute path>?mode=rw&uri=true`. For `creating=True`, use the plain absolute path.

- [ ] **Step 4b: Let the tests import `config` without a `.env`**

`db.py` (and so `seed.py`) now imports `config`, which exits when `DATABASE_URL` is missing. At the top of `tests/conftest.py`, before any app import, add `os.environ.setdefault("DATABASE_URL", "sqlite:///unused-by-tests.db")`. Engines connect lazily, and `mode=rw` never creates the file, so nothing is written. The `seed_registry.sh` subprocess inherits this variable.

- [ ] **Step 5: Turn `seed_registry.sh` into the wrapper**

Keep its header comment (updated), its usage lines and `set -euo pipefail`. Body: `db="${1:-registry.db}"`, `rm -f "$db"`, `uv run python seed.py "sqlite:///$(realpath -m "$db")"`. Drop the `sqlite3` binary check.

- [ ] **Step 6: Run the tests to make sure they pass**

Run: `uv run pytest tests/test_seed.py -v`, then `uv run pytest`
Expected: 5 passed. The full suite passes: conftest still runs `seed_registry.sh`, which now goes through `seed.py`, and the old routes read the new file.

- [ ] **Step 7: Commit**

```bash
git add tables.py seed.py db.py seed_registry.sh tests/conftest.py tests/data/original_seed.sql tests/test_seed.py
git commit -m "Registry: schema in tables.py, seed.py for any database, seed_registry.sh wraps it"
```

---

### Task 3: Routes and db.connect on SQLAlchemy

**Files:**
- Modify: `db.py`, `catalogues.py`, `farms.py`, `plots.py`, `models.py` (`Plot.planting_date` only), `main.py` (only if needed so `config` is imported at startup), `tests/conftest.py`, `tests/test_plots.py`, `scripts/hammer.py`

**Interfaces:**
- Consumes: `db.make_engine`, `tables.*` (Task 2), `config.settings` (Task 1).
- Produces:
  - `db.engine: Engine`, a module global built from `settings.database_url`. `connect()` reads the global at call time, so tests can replace it.
  - `db.connect() -> Iterator[sqlalchemy.Connection]`: an `engine.begin()` transaction. `sqlalchemy.exc.IntegrityError` re-raised. Any other `sqlalchemy.exc.DBAPIError`, and `ValueError` (an unreadable stored value, such as a garbage `Date` on SQLite), become `UnavailableError("Database unavailable")`.
  - Helper signatures as today, with `sqlalchemy.Connection` in place of `sqlite3.Connection`: `find_farm(conn, farm_id) -> dict`, `find_plot(conn, plot_id) -> dict`, `check_references(conn, plot: dict) -> None`, `get_all(table: Table) -> list[dict]`, `get_one(table: Table, item_id: str, label: str) -> dict`. Catalogue helpers now take the `Table` object instead of its name.
  - Conftest fixture `db_path` (same name, so `test_matrix.py` works unchanged): copies the seeded file, sets `DATABASE_URL` to it, `monkeypatch.setattr(db, "engine", make_engine(url))`, and disposes of the engine after the test.

- [ ] **Step 1: Write the failing test (Review Focus 4)**

```python
# tests/test_plots.py
def test_patch_without_date_keeps_date_text(client):
    response = client.patch(f"/v1/plots/{NORTH_BLOCK}", json={"area_m2": 1200})
    assert response.status_code == 200
    assert response.json()["planting_date"] == "2026-03-01"
    assert client.get(f"/v1/plots/{NORTH_BLOCK}").json()["planting_date"] == "2026-03-01"
```

- [ ] **Step 2: Switch conftest to `DATABASE_URL` and run the suite**

Rewrite `db_path` as described in Interfaces (the `DATABASE_URL` default is already there from Task 2).
Run: `uv run pytest -x -q`
Expected: FAIL, because `db.engine` does not exist yet.

- [ ] **Step 3: Rewrite `db.py`'s `connect()` and add `db.engine`**

Remove `import sqlite3`, `DEFAULT_DB_PATH` and `db_path()`. Keep the docstring's list of rules, updated.

- [ ] **Step 4: Port `catalogues.py`, `farms.py`, `plots.py`**

Same routes and messages. Rules:
- Lists use `.order_by(table.c.seq)`.
- Explicit column lists that never include `seq`. For plots, `PLOT_COLUMNS = [plots.c.id, plots.c.farm_id, ...]` in today's `COLUMNS` order.
- Rows come back as `dict(row)` from `.mappings()`.
- `except IntegrityError` is now `sqlalchemy.exc.IntegrityError`, with the same meanings (A13, A20).
- In `create_plot` and `update_plot`, convert `planting_date` text to `datetime.date.fromisoformat(...)` before the `with connect()` block. The returned dict may hold either form, because `Plot` parses both.

Change `models.Plot.planting_date` to `datetime.date`.

- [ ] **Step 5: Update `scripts/hammer.py`**

`running_service` sets `DATABASE_URL=sqlite:///<db_path>` instead of `REGISTRY_DB_PATH`. The extra-plots `INSERT` names its 12 columns, because the table now has `seq`.

- [ ] **Step 6: Run everything**

Run: `uv run pytest -q` and `grep -n "import sqlite3\|REGISTRY_DB_PATH" *.py tests/conftest.py README.md`
Expected: all tests pass, including `test_patch_without_date_keeps_date_text` and every `test_matrix.py` broken-database, lock and concurrency case. The grep shows nothing in the `*.py` files or conftest. README hits are fixed in Task 6.

- [ ] **Step 7: Check startup**

Run: `grep -n "^import config\|^from config" db.py`, then `uv run pytest tests/test_config.py -q`
Expected: `db.py` imports `config` at module level (so `main` → routers → `db` → `config` fails at import, before uvicorn serves), and the config tests pass.

- [ ] **Step 8: Commit**

```bash
git add db.py catalogues.py farms.py plots.py models.py main.py tests/conftest.py tests/test_plots.py scripts/hammer.py
git commit -m "Registry: all data access through SQLAlchemy Core; planting_date is a Date column"
```

---

### Task 4: Name rule and NUL-safe catalogue ids (decision 5, Review Focus 1-2)

**Files:**
- Modify: `models.py`, `catalogues.py`, `tests/test_matrix.py`, `tests/test_farms.py`, `tests/test_plots.py`

**Interfaces:**
- Produces:
  - `models.Name`: `StringConstraints(strip_whitespace=True, min_length=1, max_length=200)` plus an `AfterValidator(reject_nul)`.
  - `models.reject_nul(value: str) -> str` raises `ValueError("must not contain a NUL character")`.
  - `models.CatalogueRef = Annotated[str, AfterValidator(reject_nul)]`, used for `crop_id`, `soil_id` and `emitter_id` in `PlotCreate` and `PlotUpdate`.
  - In `catalogues.get_one`, an id containing `"\x00"` raises `NotFoundError(f"Unknown {label}")` without querying.

- [ ] **Step 1: Change the matrix expectations and add cases**

In `FIELD_CASES`: `name=10,000 chars` becomes 422, `name=NUL character` becomes 422. Add `("name=200 chars", {"name": "a" * 200}, 201)`, `("name=201 chars", {"name": "a" * 201}, 422)`, `("name=200 chars + spaces", {"name": "  " + "a" * 200 + " "}, 201)` and `("crop_id=NUL", {"crop_id": "a\u0000b"}, 422)`. Rename the `# Names: no max length, any text` comment to `# Names: 1-200 characters after trimming, no NUL (decision 5)`. In `test_text_fields_round_trip`, remove `"a\u0000b"` from the list and change the final count from 8 to 7.

- [ ] **Step 2: Add farm and catalogue tests**

```python
# tests/test_farms.py
@pytest.mark.parametrize("name", ["a" * 201, "a\u0000b"])
def test_farm_name_rule(client, name):
    assert_problem(client.post("/v1/farms", json={"name": name}), 422, "VALIDATION")
    assert_problem(client.patch(f"/v1/farms/{DEMO_FARM}", json={"name": name}), 422, "VALIDATION")

def test_farm_name_200_chars_ok(client):
    assert client.post("/v1/farms", json={"name": "a" * 200}).status_code == 201

# tests/test_plots.py (or test_catalogues.py)
@pytest.mark.parametrize("path", ["/v1/crops/a%00b", "/v1/soils/a%00b", "/v1/emitters/a%00b"])
def test_catalogue_id_with_nul_is_404(client, path):
    assert_problem(client.get(path), 404, "NOT_FOUND")
```

Add imports as needed.

- [ ] **Step 3: Run the tests to make sure they fail**

Run: `uv run pytest -q tests/test_matrix.py tests/test_farms.py tests/test_catalogues.py tests/test_plots.py`
Expected: the new and changed cases fail (201 where 422 is expected). The catalogue NUL test may already pass on SQLite. It exists for the PostgreSQL run in Task 5.

- [ ] **Step 4: Implement the `models.py` and `catalogues.py` changes from Interfaces**

- [ ] **Step 5: Run the full suite**

Run: `uv run pytest -q`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add models.py catalogues.py tests/
git commit -m "Registry: names 1-200 chars without NUL; NUL in catalogue ids never reaches the database"
```

---

### Task 5: Farm-row lock and the opt-in PostgreSQL test run (decisions 6, 8)

**Files:**
- Modify: `plots.py` (`check_references`), `tests/conftest.py`, `tests/test_matrix.py` (skip markers), `tests/test_seed.py` (SQLite-only marker where the test builds SQLite files)

**Interfaces:**
- Consumes: `seed.seed_database`, `tables.metadata`, `db.make_engine`.
- Produces:
  - `tests/helpers.py`: `ON_POSTGRES: bool = "TEST_DATABASE_URL" in os.environ` and `sqlite_only = pytest.mark.skipif(ON_POSTGRES, reason="breaks the SQLite file; no such file on PostgreSQL")`. This is the only definition; conftest imports it.
  - `tests/conftest.py`: when `ON_POSTGRES`, the `db_path` fixture (keeping its name for the matrix) runs `metadata.drop_all` and then `seed_database` on `make_engine(os.environ["TEST_DATABASE_URL"])`, patches `db.engine`, and yields `None`. The session `seeded_db` fixture is not used then.

- [ ] **Step 1: Add the farm lock**

In `check_references`, the `farms` lookup uses `.with_for_update(read=True)`. The other three lookups stay plain. Update the docstring to say why (decision 6).

- [ ] **Step 2: Add the PostgreSQL mode to conftest and the skip marks**

Mark `test_broken_database` and `test_locked_database_is_503` with `@sqlite_only`. Mark the `tests/test_seed.py` tests that build SQLite files with `@sqlite_only`, except `test_relative_sqlite_path_is_in_service_folder`, which touches no database and can run everywhere.

- [ ] **Step 3: SQLite run still green**

Run: `uv run pytest -q`
Expected: all pass, nothing skipped.

- [ ] **Step 4: Owner creates the test database (one time)**

Owner runs: `sudo -u postgres createdb -O registry registry_test`
Expected: no output. The agent asks the owner to run it and waits.

- [ ] **Step 5: PostgreSQL run**

Run: `TEST_DATABASE_URL='postgresql+psycopg://registry:registry@localhost:5432/registry_test?connect_timeout=3&options=-c%20statement_timeout%3D5000' uv run pytest -q -rs`
Expected: all pass. The skips are exactly the broken-database cases, the lock test and the SQLite-file seed tests, each with its reason. If a concurrency test or a Review Focus case fails here, stop and report it. Do not loosen the test.

- [ ] **Step 6: Commit**

```bash
git add plots.py tests/
git commit -m "Registry: lock the farm row during plot writes; opt-in test run on PostgreSQL"
```

---

### Task 6: PostgreSQL by hand, latency, docs and decisions

**Files:**
- Modify: `README.md` (service), `AGENTS.md` (repo root), `.claude/skills/registry-api/SKILL.md`, `DECISIONS.md`

- [ ] **Step 1: Seed production**

The owner's `.env` holds the real URL, and the agent never reads it. The agent runs with the URL on the command line:
`uv run python seed.py 'postgresql+psycopg://registry:registry@localhost:5432/registry?connect_timeout=3&options=-c%20statement_timeout%3D5000'`
Expected: `Seeded ...` plus the summary line. If tables already exist, ask the owner before dropping anything. Run it again and expect `Tables already exist; nothing changed.` with exit 1.

- [ ] **Step 2: Manual pass on PostgreSQL**

Start `DATABASE_URL='<the URL above>' uv run uvicorn main:app --port 8000` and check with curl:
- the order of `GET /v1/farms` and `GET /v1/plots` matches SQLite
- `GET /v1/plots/<unknown uuid>` gives 404
- a duplicate plot name gives 409
- `DELETE` on the demo farm gives 409
- a name with NUL, a 201-character name and `/v1/crops/a%00b` give 422, 422 and 404

Then the owner stops PostgreSQL (`sudo service postgresql stop`). `GET /v1/farms` gives 503 with `Retry-After: 5` within about 3 s. The owner restarts it, and the next request is 200 again (`pool_pre_ping`). Then re-seed the `registry` database, so that Step 3 measures the 15 seed rows. Ask the owner before dropping the tables.

- [ ] **Step 3: Latency (NFR-2.2)**

With the service on PostgreSQL: `uv run python scripts/measure_latency.py`
Expected: p95 <= 100 ms for every list and by-id line. Record the printed table for the PR, and put it in the README.

- [ ] **Step 4: Docs and decisions**

- **`README.md`:** setup with `cp .env.example .env`, `DATABASE_URL` for both databases, the seed command for PostgreSQL, the opt-in test run with the `createdb` line and the warning not to point it at `registry`, the measured numbers. Remove `REGISTRY_DB_PATH` and "no ORM".
- **`AGENTS.md`:** update the Repository layout, Commands and Registry service architecture sections. Cover `config.py`, `tables.py` (the schema now lives here, not in `seed_registry.sh`), `seed.py`, `db.py` on SQLAlchemy, `DATABASE_URL`, and the PostgreSQL test command.
- **`SKILL.md`:** "FastAPI + sqlite3" becomes "FastAPI + SQLAlchemy Core (SQLite or PostgreSQL)". Fix any sqlite3-specific guidance in the body.
- **`DECISIONS.md`:**
  - O57-O66 for spec decisions 1-10 and the Core choice.
  - Mark O6 "Replaced by O-n (name rule)". Update O51 (the column is done, the body stays text).
  - Add a note to A20 (the farm lock keeps it true on PostgreSQL).
  - A46 onwards for the agent's calls: farm names follow the 200 rule; NUL-safe catalogue ids (Review Focus 1); the pysqlite transactional-DDL recipe; `seq` as the primary key with `id UNIQUE`; the verbatim `original_seed.sql`; the test database `registry_test`.

- [ ] **Step 5: Final check and commit**

Run: `uv run pytest -q`
Expected: all pass.

```bash
git add README.md ../../AGENTS.md ../../.claude/skills/registry-api/SKILL.md ../../DECISIONS.md
git commit -m "Registry: docs, decisions and measured latency for the SQLAlchemy move"
```
