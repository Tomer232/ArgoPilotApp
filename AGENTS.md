# AGENTS.md

Instructions for any coding agent working in this repository. (`CLAUDE.md` only imports this file.)

## How we work

The owner decides; the agent builds and supplies the information needed to decide well.

- Work from the task's requirements: the current task file in the course repo, https://github.com/alonitac/OzVeruach26 (for example `tasks/p2.md`). Build what they ask, nothing more. Don't overdo it.
- Before building, go back and forth with questions until the owner has chosen the route. For each open choice, give the options, a short recommendation and why.
- Never start implementing on your own. Ask first, then build one step at a time and stop after each step for review.
- Write clean, plain code a person can read: small functions, clear names, no clever tricks.

## Coding principles (Karpathy guidelines)

1. **Think before coding.** Don't assume. If something is unclear, say so and ask. Surface trade-offs.
2. **Simplicity first.** The minimum code that solves the problem. Nothing speculative.
3. **Surgical changes.** Touch only what the step needs. Clean up only your own mess.
4. **Goal-driven execution.** State what "done" means (a test, a command, a number), and check it before saying a step is finished.

## Repository layout

- `services/weather-service/`: daily ET0 and rain from Open-Meteo, cached in memory per 0.1° cell (port 8001). FastAPI + httpx, no database; settings in `.env`; `uv run pytest` never calls the real provider. See its README.
- `services/planner-service/`: the daily irrigation plan per plot (port 8002), from registry-service and weather-service. FastAPI + httpx, no database, no cache. `engine.py` is the FAO-56 calculation, written from the `irrigation-calc-reference` skill; `upstream.py` is the only code that calls the other services; `uv run pytest` never calls them. See its README.
- `services/frontend/`: the grower's web page (port 3000): plot list and plot page with today's answer, the 7-day plan and a timeline. Next.js 16 + Tailwind 4 + shadcn/ui, styled like the P1 dashboard. Only the Next.js server calls the services (`src/lib/http.ts`, `no-store`); the grower's choices live in the address. `src/proxy.ts` turns an unknown plot into a real 404. Settings in `.env.local`. Its `AGENTS.md` says to read the Next docs in `node_modules/next/dist/docs/` before writing code. See its README.
- `services/registry-service/`: FastAPI + SQLAlchemy Core (no ORM classes), PostgreSQL in production and SQLite for local work and tests, Python 3.12, managed with `uv`.
- `experiments/ollama-agent/agent.py`: a standalone uv script (inline dependencies), unrelated to the service.
- `DECISIONS.md`: every design decision, grouped as **Yours** (Y#), **Ours** (O#) and **Agent's** (A#). New decisions get the next number in the right group; superseded ones are marked, not deleted.
- `.claude/skills/`: skills. Third-party ones (e.g. `skill-creator`) are installed with `npx skills add` and pinned in `skills-lock.json`. Don't edit them; update by reinstalling. Our own skills live here too.
- `.claude/rules/`: rules that load only for matching paths (e.g. `registry-service.md`).
- `docs/judgment-log.md`: the decisions where the agent's suggestion and the owner's choice differed, written in the owner's words.

## Commands

Run from `services/registry-service` (needs `uv`):

```bash
uv sync                                   # create .venv
cp .env.example .env                      # once; sets DATABASE_URL (the agent never reads .env)
bash seed_registry.sh                     # (re)create the SQLite registry.db with demo data
uv run python seed.py                     # create tables + demo rows on DATABASE_URL (refuses if any table exists)
uv run uvicorn main:app --port 8000       # API at /v1/..., /health, demo UI at /ui
uv run pytest                             # full suite on SQLite (~10 s)
uv run pytest tests/test_plots.py::test_name   # a single test
uv run pytest -k "planting_date"          # tests matching a keyword
TEST_DATABASE_URL='postgresql+psycopg://registry:<password>@localhost:5432/registry_test?connect_timeout=3&options=-c%20statement_timeout%3D5000' uv run pytest
                                          # the same suite on PostgreSQL; wipes that database, name must end in _test
```

Run from `services/frontend` (needs Node.js; the three services running for real pages):

```bash
npm install                               # once
cp .env.example .env.local                # once; the service URLs and timeouts (the agent never reads it)
npm run dev                               # http://localhost:3000
npm run build                             # production build, also type-checks
npm run lint                              # ESLint, the frontend's only linter
npm test                                  # Vitest, for src/lib
```

`bash .claude/skills/run-stack/scripts/stack.sh start` (from the repo root) starts all four services in order.

The Python services have no linter or formatter configured. `DATABASE_URL` (environment or `.env`) picks the database: `sqlite:///registry.db` or `postgresql+psycopg://...`. Production is the PostgreSQL database `registry`; tests on PostgreSQL use `registry_test`. Never point `TEST_DATABASE_URL` at `registry`.

## Registry service architecture

- `main.py` only wires things: routers, error handlers, `/health`, `/ui` (serves the static `ui/index.html`), and a global dependency that rejects unknown query parameters with 422 (allowed ones are listed in `ALLOWED_QUERY_PARAMS`, so a new query parameter must be added there).
- `config.py`: pydantic-settings `Settings` with the one required `database_url`, read from the environment or `.env`. Missing: a one-line message and exit 1 at import.
- `tables.py`: the schema, as SQLAlchemy Core `Table` objects. Every table has a hidden integer `seq` primary key (list order: `ORDER BY seq`; never returned) and `id` as `UNIQUE NOT NULL` text.
- `seed.py`: the 15 demo rows. `seed_database(engine)` creates the tables and inserts the rows in one transaction, and refuses if any table exists. `seed_registry.sh` deletes a SQLite file and runs it.
- `catalogues.py`, `farms.py`, `plots.py`: one file per area; each route builds its own Core query (`select`, `insert`, `update`, `delete`) with small helpers (`find_farm`, `find_plot`, `check_references`). No repository layer. `check_references` locks the farm row (`FOR SHARE`) so a concurrent farm delete can't slip in before a plot write.
- `models.py`: Pydantic request/response models and input helpers. Request models inherit `RequestModel` (strict types, `extra="forbid"`, no inf/NaN). Response models list exactly the spec's fields, which is how "return only listed fields" is enforced.
- `db.py`: one engine built from `DATABASE_URL` by `make_engine`. On SQLite: a new connection per request (`NullPool`), opened with `mode=rw` (never creates a missing DB) and `PRAGMA foreign_keys = ON`. On PostgreSQL: a connection pool with `pool_pre_ping`. `with connect() as conn:` is one transaction, committed on success. `sqlalchemy.exc.IntegrityError` passes through so routes can map it to 409/422; every other database error becomes a 503.
- `errors.py`: every error response is RFC 9457 `application/problem+json`. Raise `ValidationFailedError` (422), `NotFoundError` (404), `ConflictError` (409) or `UnavailableError` (503, adds `Retry-After: 5`). FastAPI's own 400/404/405 and validation errors are rewritten into the same shape; 405 deliberately has no `code` and carries a computed `Allow` header. A stored row that fails the response model is a 503, not a 500.
- Schema lives only in `tables.py`, demo data only in `seed.py`; there are no migrations.

Conventions that span files:
- Path ids that are not UUIDs give 404 (`parse_id`); any UUID spelling is normalized to lowercase. A non-UUID `?farm_id=` filter gives 422.
- Unknown references inside a body (farm, crop, soil, emitter) give 422, not 404. Names (farm and plot) are 1-200 characters after trimming, without NUL; otherwise 422. Plot names are unique per farm (409).
- PATCH changes only sent fields (`sent_fields`); an explicit `null` is 422; `{}` is 200 unchanged.
- `planting_date` "future" check uses the client's `Time-Zone` header (IANA name); with no header, today is taken in UTC+14 (`today_for_request` in `models.py`).

## Tests

- `tests/conftest.py` runs the real `seed_registry.sh` once per session into a temp dir, then gives each test a private copy (`use_database` in `helpers.py` points `db.engine` at it). With `TEST_DATABASE_URL` set, each test instead drops and re-seeds that PostgreSQL database. Use the `client` fixture; tests never touch `registry.db` and need no `.env`.
- `@sqlite_only` / `@postgres_only` (in `helpers.py`) mark tests that only make sense on one database.
- `tests/helpers.py` has seed ids, `plot_body(**changes)` for a valid plot body, and `assert_problem(response, status, code)` for checking error responses.
- `tests/test_matrix.py` is the break-the-API matrix (bad values, protocol abuse, broken/locked/corrupt databases, concurrency).
- `tests/test_ui.py` asserts on strings inside `ui/index.html`, so UI markup changes can break it.

## Project constraints

- The task says to build only what the spec lists and delete unlisted functionality (that is why `Location` headers and pagination are absent; `/docs` came back in P2 for the frontend, Y13). Treat anything outside the spec as a decision for the owner, and record it in `DECISIONS.md`.
- Measurement scripts under `services/registry-service/scripts/` are committed tooling, **not a requirement** (Y12). Anything else built outside the requirements is logged in `docs/extras.md`.
- Every function gets a short docstring. The owner is interviewed on this code and must be able to explain every line (see "How we work").
