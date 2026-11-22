# Registry service on SQLAlchemy (SQLite locally, PostgreSQL in production)

Date: 2026-11-15. Branch: `p2`. Task: `tasks/p2.md` in alonitac/OzVeruach26, registry part (FR-2.1, FR-2.2, NFR-2.1, NFR-2.2, "Global configurations").

## Intent

`services/registry-service` talks to SQLite through Python's `sqlite3`. P2 needs it to run on PostgreSQL in production and stay on a local SQLite file for development and tests, choosing between them by configuration alone. This is the first P2 step (O53): the riskiest change, done while nothing else depends on the registry yet. The owner is interviewed on the code, so it must stay plain and explainable line by line.

## Goals

1. All data access goes through SQLAlchemy (Core). No `import sqlite3` remains in the service code.
2. Every endpoint behaves exactly as today, except the one deliberate change in decision 5 (name rules): same status codes, same `application/problem+json` bodies and `code`s, same `Retry-After: 5` on every 503, same field names and JSON values, same list order (oldest first).
3. The database is chosen by `DATABASE_URL`, read from `services/registry-service/.env` through pydantic-settings in one `config.py`. Switching SQLite and PostgreSQL is a `.env` edit, never a code edit (NFR-2.1).
4. `.env.example` is committed. `.env` is not (already in `.gitignore`). A missing `DATABASE_URL` stops the service at startup with a clear message.
5. One documented command creates the tables in an empty PostgreSQL database and loads the same 15 seed rows as today (FR-2.2): 2 farms, 4 plots, 2 crops, 3 soils, 4 emitters.
6. The existing test suite passes on SQLite (with the name-rule expectations changed as in decision 5).
7. On PostgreSQL, GET list and GET by id have p95 <= 100 ms at 10 req/s (NFR-2.2), measured with the existing `scripts/measure_latency.py`.

## Non-goals

- No new endpoints, fields or behaviour. No migrations tool (Alembic): the schema is created once by the seed command.
- No ORM classes or sessions.
- The test suite does not run against PostgreSQL. PostgreSQL is checked by hand (see Verification).
- Weather, planner and frontend work, and `/docs` (Y13), are later steps.

## Anti-goals (a failure even if it "works")

- Any observable API change, including a different list order, a 500 anywhere the old code gave 503, or a 409 that is not a real name clash.
- Database-specific `if` branches spread through the routes.
- Two copies of the schema or the seed rows that can drift apart.
- A service that starts with no `DATABASE_URL` and fails later on the first request.

## Constraints

- Python 3.12, `uv`, FastAPI as today. New dependencies: `sqlalchemy` (2.x), `pydantic-settings`, and the PostgreSQL driver `psycopg` (v3, `psycopg[binary]`), so URLs look like `postgresql+psycopg://...`.
- AGENTS.md rules: small functions, a docstring on every function, surgical changes, each decision recorded in `DECISIONS.md`.
- The agent may not read `.env` (deny rule). The owner fills in the real values.
- PostgreSQL is set up on localhost:5432: role `registry` (password `registry`), which owns the database `registry`.

## Approaches considered (owner picked A)

- **A. SQLAlchemy Core (picked).** Tables declared once as `Table(...)` objects. Routes build queries with `select()/insert()/update()/delete()`, get rows as dicts (`.mappings()`), and pass them to the existing response models. `metadata.create_all()` gives the seed command the schema on either database. This keeps today's structure (each route runs its own query, small helpers, no repository layer) and stays readable as SQL.
- **B. SQLAlchemy ORM.** Mapped classes plus `Session`. More concepts (sessions, identity map, object state, lazy loading), plus a conversion from objects to dicts in every route. Nothing gained for this API.
- **C. Raw SQL strings through `text()`.** Smallest diff, but no `create_all` (the schema would be written twice), no help with dialect differences, and "through SQLAlchemy" only in name.

## Decisions made with the owner

1. **List order: a hidden `seq` column (owner: A).** PostgreSQL has no `rowid`. Every table gets an auto-increment integer `seq`. Lists use `ORDER BY seq`, and `seq` is never selected into a response. SQLite can auto-increment only an `INTEGER PRIMARY KEY`, so `seq` is the primary key and `id` becomes `TEXT/VARCHAR UNIQUE NOT NULL`. Foreign keys reference `id` (allowed, since it is unique). This behaves the same on both databases. Rejected: "max(seq)+1" (concurrent inserts collide and the `IntegrityError` would look like a 409 name clash), `created_at` (ties), ordering by id or name (changes the order).
2. **`planting_date`: a `Date` column, with the body still text (owner: A; closes half of O51).** The column is `sa.Date`. Request bodies keep today's text check (pattern plus `check_real_date`) because the reason for O51 (Pydantic's strict `date` rejects JSON strings, and lax `date` accepts timestamps) is unaffected by SQLAlchemy. Routes turn the validated text into a `datetime.date` before writing. The `Plot` response model's `planting_date` becomes `datetime.date`, which Pydantic serializes as `"YYYY-MM-DD"`, so the JSON is identical. Update O51 to say the column is done and the body stays text, for the same reason.
3. **Tests stay on SQLite.** `conftest.py` keeps seeding once per session and copying per test, but points the app at the copy through `DATABASE_URL` instead of `REGISTRY_DB_PATH`. The SQLite-file matrix cases (chmod, empty file, folder, exclusive lock, wrong-type values) stay as they are. They still use `sqlite3` directly to break the file, which is fine: that is test tooling, not data access.
4. **One seed command for both databases (owner: A).** `seed.py` holds the 15 rows and calls `metadata.create_all()` on the engine for the current `DATABASE_URL` (or a URL given on the command line), then inserts the rows in today's order, so `seq` matches today's insertion order. If any of the tables already exists, it stops with a clear message and changes nothing (safe on production). `seed_registry.sh` becomes a small wrapper: delete the local SQLite file (default `registry.db`, or the path argument as today), then run `seed.py` against `sqlite:///<that path>`. So `bash seed_registry.sh` and the test setup keep working, and the schema and rows live only in Python.

5. **Names PostgreSQL cannot store become 422 on both databases (owner: A, raised by the builder check).** PostgreSQL text cannot hold the NUL character, and PostgreSQL limits each unique-index entry to about 2.7 KB, so some long names would fail with a database error. Without a rule, those requests would be 503 on PostgreSQL and 201 on SQLite, and a 503 wrongly says "try again". New rule: a name may not contain NUL and may be at most 200 characters after trimming; otherwise 422 `VALIDATION`. It goes on the shared `Name` type in `models.py`, so farm names follow it too (agent's call: farm names hit the same NUL problem, and one name rule is simpler than two). This is a deliberate API change. It replaces O6 ("no max length"), and the matrix expectations for `name=10,000 chars` and `name=NUL character` change from 201 to 422. `test_text_fields_round_trip` drops `"a\u0000b"` from its list of round-trip names, and a NUL case is added as a 422 instead. Add a 201-char (422) and a 200-char (201) boundary case.
6. **The farm row is locked while a plot is written (owner: A, raised by the builder check).** On PostgreSQL, a farm can be deleted between `check_references` and the plot's INSERT or UPDATE. The foreign-key `IntegrityError` would then be reported as a false 409 "name taken". `check_references` reads the farm with `SELECT ... FOR SHARE` (SQLAlchemy `with_for_update(read=True)`; SQLite ignores it, since it already serializes writes). A concurrent farm delete then waits for the plot write and gets the correct 409 "Farm still has plots", and A20 ("any `IntegrityError` on a plot write is the name rule") stays true on both databases. Only the farm needs the lock: crops, soils and emitters are read-only catalogues and cannot be deleted through the API.

7. **A stuck query on PostgreSQL is a 503 after 5 s (owner).** Set by `statement_timeout` in the URL, as above.
8. **An opt-in PostgreSQL test run (owner).** By default the suite runs on SQLite. With `TEST_DATABASE_URL` set, it runs against PostgreSQL instead (see Tests).
9. **The seed is all or nothing (owner).** `seed.py` runs `create_all` and every insert in one transaction, so a failed seed leaves no tables and no rows behind.
10. **A test pins the seed rows to the original script (owner).** See Tests.

## Design

### Files

- **`config.py` (new).** `class Settings(BaseSettings)` with one required field, `database_url: str`, reading `.env` from the service folder (path built from `__file__`, not the working directory). Environment variables override `.env`, which is how tests point it elsewhere. Built once at import as `settings`. On a missing variable it prints one clear line, for example `Missing required setting DATABASE_URL. Copy .env.example to .env and fill it in.`, and exits non-zero, so `uvicorn main:app` fails at startup, not on the first request.
- **`.env.example` (new, committed).** One SQLite example (`sqlite:///registry.db`, resolved relative to the service folder) and one commented PostgreSQL example: `postgresql+psycopg://registry:CHANGE_ME@localhost:5432/registry?connect_timeout=3&options=-c%20statement_timeout%3D5000`. Both timeouts live in the URL, so they are configuration, not code. `connect_timeout=3`: an unreachable server is a 503 within about 3 s. `statement_timeout=5000`: a query that is stuck (for example waiting on a lock) is cancelled after 5 s, which psycopg raises as an `OperationalError`, so it becomes a 503. This matches SQLite's 5 s lock wait. Also lists the optional `TEST_DATABASE_URL` (see Tests), commented out.
- **`tables.py` (new).** `metadata` and the five `Table` definitions (`farms`, `crops`, `soils`, `emitters`, `plots`), mirroring today's schema plus `seq`, with `planting_date` as `Date`, the four foreign keys, and `UniqueConstraint("farm_id", "name")` on plots. This replaces the `CREATE TABLE` statements in `seed_registry.sh` as the single schema definition.
- **`db.py` (rewritten, same contract).**
  - One engine per process, built from `settings.database_url`.
  - For SQLite: the file is opened with `mode=rw` (never creates a missing file; SQLAlchemy supports this as `sqlite:///file:<path>?mode=rw&uri=true`, built by `db.py` from a plain `sqlite:///path` URL so `.env` stays simple), and a connect event runs `PRAGMA foreign_keys = ON` on every new connection. `sqlite3`'s default 5 s lock wait stays. These SQLite settings are the one dialect-specific spot, kept in `db.py`.
  - For PostgreSQL: `pool_pre_ping=True`, so a restarted database does not hand out dead pooled connections.
  - `with connect() as conn:` keeps its meaning: a transaction (`engine.begin()`), committed on success and rolled back on any exception. `sqlalchemy.exc.IntegrityError` passes through. Any other `sqlalchemy.exc.DBAPIError` (missing or locked file, PostgreSQL down, missing table or column) becomes `UnavailableError` (503 with `Retry-After`).
  - A stored value that cannot be read (on SQLite a garbage text in the `Date` column raises `ValueError` while the row is read) also becomes `UnavailableError`, matching the existing "stored row that fails the response model is a 503" rule. On PostgreSQL this cannot happen: the column type refuses it on write.
- **`catalogues.py`, `farms.py`, `plots.py`.** Same routes, same helpers (`get_all`, `get_one`, `find_farm`, `find_plot`, `check_references`), with SQL strings replaced by Core expressions on the tables from `tables.py`. The helper type hints change from `sqlite3.Connection` to `sqlalchemy.Connection`. `except sqlite3.IntegrityError` becomes `except sqlalchemy.exc.IntegrityError`. The meanings stay the same: in `plots.py` it is the unique name rule (references were checked first, A20), and in `farms.py` delete it is "farm still has plots" (A13), which PostgreSQL also enforces through the foreign key. Catalogue and plot reads select the listed columns explicitly (no `SELECT *`), so `seq` never leaks.
- **`seed.py` (new)** and **`seed_registry.sh` (wrapper)**, as in decisions 4 and 9. `seed.py` prints the same summary line as today. The check for existing tables, `create_all` and the inserts all run inside one `engine.begin()` block. PostgreSQL DDL is transactional, so this works as written there. On SQLite, Python's `sqlite3` driver by default commits before each `CREATE TABLE`, so the builder must make DDL part of the transaction. On Python 3.12 the likely way is `connect_args={"autocommit": False}`, or SQLAlchemy's documented pysqlite "BEGIN" event recipe; if that setting goes in `db.py`'s SQLite setup, it must not change how requests behave. A test proves it on SQLite (see Tests), and the opt-in PostgreSQL run proves it there. The seed's engine-building reuses `db.py`'s logic, so the SQLite `mode=rw` rule does not stop it creating a new file. `seed.py` may open the file without `mode=rw`, since creating the database is its job.
- **`models.py`.** Only `Plot.planting_date: datetime.date`. Request models are unchanged.
- **`main.py`.** Unchanged, apart from importing `config` early enough that a missing `DATABASE_URL` fails at startup.
- **`pyproject.toml` / `uv.lock`.** Add the three dependencies.
- **`tests/conftest.py`.** Each test points `DATABASE_URL` at its private copy. Because the engine is built at import, the fixture also gives `db` an engine for the copy (for example by replacing `db.engine` with `monkeypatch`) and disposes of it after the test, so connections never cross tests. A `DATABASE_URL` default is set before `main` is imported, so the suite runs without a `.env`.
- **Tests (`tests/conftest.py` and new tests).**
  - *Default (SQLite):* as above.
  - *Opt-in PostgreSQL run:* when `TEST_DATABASE_URL` is set (for example to a database used only for tests), the `client` fixture points the app at it. Before each test, it drops all tables and runs the seed (tables plus 15 rows), so every test starts from the same state as on SQLite. The SQLite-file matrix cases (`test_broken_database`, `test_locked_database_is_503`) are skipped there with a reason (they break a file that does not exist on PostgreSQL). Everything else runs, including the concurrency tests, which on PostgreSQL also exercise decision 6. Command: `TEST_DATABASE_URL=postgresql+psycopg://... uv run pytest`. Agent's call: pointing it at the production `registry` database works but wipes its data before every test. The README says to use a separate database (for example `registry_test`, owned by `registry`) and gives the one-line `createdb` command. Which database to use is the owner's choice when running it.
  - *Seed rows match the original (decision 10):* the `INSERT` statements of today's `seed_registry.sh` are saved verbatim as `tests/data/original_seed.sql`, with today's `CREATE TABLE` statements so the file runs on its own. Without this copy the original is lost once the script becomes a wrapper. The test loads that file into an in-memory SQLite database with `sqlite3`, seeds a fresh database with `seed.py`, and asserts that every one of the five tables has exactly the same rows (all spec columns, compared as values, `planting_date` as `YYYY-MM-DD` text, `seq` ignored), in the same order, 15 in total. This test runs on the default SQLite run. It uses `sqlite3` directly, which is fine in tests.
  - *Seed is all or nothing (decision 9):* a test makes the seed fail part-way (for example one insert breaks the unique rule, or a patched row list) and asserts that afterwards the database has no tables. It also checks that seeding a database that already has the tables refuses and changes nothing.
- **`scripts/hammer.py`.** Switch from `REGISTRY_DB_PATH` to `DATABASE_URL` so the tool keeps working. `REGISTRY_DB_PATH` is removed everywhere.

### Errors mapping (unchanged outward)

| Situation | SQLite | PostgreSQL | API answer |
| --- | --- | --- | --- |
| Duplicate plot name in a farm | `IntegrityError` | `IntegrityError` | 409 `CONFLICT` |
| Delete a farm that has plots | `IntegrityError` (FK, pragma on) | `IntegrityError` (FK) | 409 `CONFLICT` |
| Database missing, locked, unreadable or corrupt, or the server down | `OperationalError`/`DatabaseError` | `OperationalError` | 503 `UNAVAILABLE`, `Retry-After: 5` |
| Table or column missing | `OperationalError` | `ProgrammingError` | 503 |
| Stored value of the wrong type | response model fails, or `ValueError` on read | refused on write | 503 |

### Docs and records

- `README.md` (service): setup with `.env`, `DATABASE_URL` for both databases, the seed command for PostgreSQL (`DATABASE_URL=... uv run python seed.py`, or with `.env` set, `uv run python seed.py`), measured NFR-2.2 numbers.
- `AGENTS.md`: architecture and commands sections (`db.py`, `config.py`, `tables.py`, `seed.py`, `DATABASE_URL` instead of `REGISTRY_DB_PATH`, "schema lives in `tables.py`").
- `.claude/skills/registry-api/SKILL.md`: description and body say SQLAlchemy Core instead of `sqlite3`.
- `DECISIONS.md`: O57 onwards for the six owner decisions above and the Core choice (all matched the agent's recommendation, so they are "Ours"). Mark O6 as replaced by the name-rule decision. Update O51. Update A20's "Why" to mention the farm-row lock. Record the builder's calls as A46 onwards. `docs/judgment-log.md` gets nothing (no disagreement).

## Verification ("done")

1. `uv run pytest` passes on SQLite with the existing tests. Test changes are limited to `conftest.py`, anything that set `REGISTRY_DB_PATH`, and the name-rule cases in decision 5.
2. `TEST_DATABASE_URL=<a test database> uv run pytest` passes against PostgreSQL, with only the SQLite-file matrix cases skipped.
3. `grep -n "import sqlite3" *.py` in the service finds nothing outside tests and scripts.
4. With no `DATABASE_URL` (no `.env`, variable unset), `uv run uvicorn main:app` exits at startup with the clear message.
5. On an empty `registry` PostgreSQL database, the seed command creates 5 tables and 15 rows. Run again, it refuses and changes nothing.
6. Against PostgreSQL, a manual pass (curl or the `/ui` page) over every endpoint gives the same answers as on SQLite: list order, 404, 409 on duplicate name and on deleting a farm with plots, 422s (including a NUL name and a 201-char name). With PostgreSQL stopped: 503 with `Retry-After: 5`, returned within a few seconds.
7. `scripts/measure_latency.py` against PostgreSQL: p95 <= 100 ms for every GET list and GET by id at 10 req/s. The numbers are recorded for the PR.

## Left to the builder

- Exact Core expressions, helper signatures and the order of the steps in the plan.
- How `conftest.py` swaps the engine per test (any way that keeps tests isolated).
- How `db.py` turns a plain `sqlite:///path` into the `mode=rw` URI.
- How `seed.py` detects existing tables (for example `sqlalchemy.inspect(engine).get_table_names()`).
- Column lengths: `String` with no length (`TEXT`/`VARCHAR`) unless something requires otherwise.
