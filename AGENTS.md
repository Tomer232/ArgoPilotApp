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

- `services/registry-service/`: the only service today. FastAPI + Python's built-in `sqlite3` (no ORM), Python 3.12, managed with `uv`.
- `experiments/ollama-agent/agent.py`: a standalone uv script (inline dependencies), unrelated to the service.
- `DECISIONS.md`: every design decision, grouped as **Yours** (Y#), **Ours** (O#) and **Agent's** (A#). New decisions get the next number in the right group; superseded ones are marked, not deleted.
- `.claude/skills/`: skills. Third-party ones (e.g. `skill-creator`) are installed with `npx skills add` and pinned in `skills-lock.json`. Don't edit them; update by reinstalling. Our own skills live here too.
- `.claude/rules/`: rules that load only for matching paths (e.g. `registry-service.md`).
- `docs/judgment-log.md`: the decisions where the agent's suggestion and the owner's choice differed, written in the owner's words.

## Commands

Run from `services/registry-service` (needs `uv` and `sqlite3` on PATH):

```bash
uv sync                                   # create .venv
bash seed_registry.sh                     # (re)create registry.db with demo data
uv run uvicorn main:app --port 8000       # API at /v1/..., /health, demo UI at /ui
uv run pytest                             # full suite (~10 s)
uv run pytest tests/test_plots.py::test_name   # a single test
uv run pytest -k "planting_date"          # tests matching a keyword
```

There is no linter or formatter configured. `REGISTRY_DB_PATH` overrides the database file location.

## Registry service architecture

- `main.py` only wires things: routers, error handlers, `/health`, `/ui` (serves the static `ui/index.html`), and a global dependency that rejects unknown query parameters with 422 (allowed ones are listed in `ALLOWED_QUERY_PARAMS`, so a new query parameter must be added there).
- `catalogues.py`, `farms.py`, `plots.py`: one file per area; each route runs its own SQL with small helpers (`find_farm`, `find_plot`, `check_references`). No repository layer.
- `models.py`: Pydantic request/response models and input helpers. Request models inherit `RequestModel` (strict types, `extra="forbid"`, no inf/NaN). Response models list exactly the spec's fields, which is how "return only listed fields" is enforced.
- `db.py`: `with connect() as conn:` opens a new connection per request with `mode=rw` (never creates a missing DB) and `PRAGMA foreign_keys = ON`, commits on success. `sqlite3.IntegrityError` passes through so routes can map it to 409/422; every other database error becomes a 503.
- `errors.py`: every error response is RFC 9457 `application/problem+json`. Raise `ValidationFailedError` (422), `NotFoundError` (404), `ConflictError` (409) or `UnavailableError` (503, adds `Retry-After: 5`). FastAPI's own 400/404/405 and validation errors are rewritten into the same shape; 405 deliberately has no `code` and carries a computed `Allow` header. A stored row that fails the response model is a 503, not a 500.
- Schema and demo data live only in `seed_registry.sh`; there are no migrations.

Conventions that span files:
- Path ids that are not UUIDs give 404 (`parse_id`); any UUID spelling is normalized to lowercase. A non-UUID `?farm_id=` filter gives 422.
- Unknown references inside a body (farm, crop, soil, emitter) give 422, not 404. Plot names are unique per farm (409).
- PATCH changes only sent fields (`sent_fields`); an explicit `null` is 422; `{}` is 200 unchanged.
- `planting_date` "future" check uses the client's `Time-Zone` header (IANA name); with no header, today is taken in UTC+14 (`today_for_request` in `models.py`).

## Tests

- `tests/conftest.py` runs the real `seed_registry.sh` once per session into a temp dir, then gives each test a private copy via `REGISTRY_DB_PATH`. Use the `client` fixture; tests never touch `registry.db`.
- `tests/helpers.py` has seed ids, `plot_body(**changes)` for a valid plot body, and `assert_problem(response, status, code)` for checking error responses.
- `tests/test_matrix.py` is the break-the-API matrix (bad values, protocol abuse, broken/locked/corrupt databases, concurrency).
- `tests/test_ui.py` asserts on strings inside `ui/index.html`, so UI markup changes can break it.

## Project constraints

- The task says to build only what the spec lists and delete unlisted functionality (that is why `/docs`, `/openapi.json`, `Location` headers and pagination are absent). Treat anything outside the spec as a decision for the owner, and record it in `DECISIONS.md`.
- Measurement scripts under `services/registry-service/scripts/` are committed tooling, **not a requirement** (Y12). Anything else built outside the requirements is logged in `docs/extras.md`.
- Every function gets a short docstring. The owner is interviewed on this code and must be able to explain every line (see "How we work").
