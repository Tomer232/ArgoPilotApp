# Decisions — P1 Registry service API

Every design decision made while building `services/registry-service`, and who made it.

- **Yours**: you set the direction yourself, or went beyond the options offered.
- **Ours**: the agent offered options with a recommendation, you chose.
- **Agent's**: the agent decided while writing code, without asking. Review these.

`docs/judgment-log.md` (required by the task) will pick a few of these and tell them in your words.

## Yours

| # | Decision | Why |
| --- | --- | --- |
| Y1 | 405 on catalogue routes returns problem+json **without** a `code` | None of the four codes fits a wrong HTTP method. A misleading stable code is worse than none; clients still have `status: 405`. Risk: a literal reading of FR-1.4 ("every error has a code"). |
| Y2 | "Future" `planting_date` must be judged by the farm's region, not one fixed zone | A farmer in Stockholm or Jerusalem should not be rejected for entering today's local date. For now: the cheapest version (see O9). |
| Y3 | Farm names may repeat | Chosen as the simplest rule that follows the spec: only plot names are unique (per farm). |
| Y4 | A corrupt database file returns 503, not 500 | Found by testing: the first version caught only `OperationalError`, and a non-database file escaped as a plain 500. |
| Y5 | Work step by step, ask all questions first, pause after each step | You will be interviewed on the code and must understand every part. |
| Y6 | Code is simple and readable, with a short comment per function | Same reason. |
| Y7 | Future work (after P1, separate branch): a UI, and deliberately breaking the database to prove every failure is handled | Not part of P1: the task says to delete unlisted functionality. |

## Ours

| # | Decision | Why |
| --- | --- | --- |
| O1 | Unknown `farm_id` in a plot body → `422 VALIDATION` | Same as an unknown crop, soil or emitter: a body field that points at nothing. 404 is for a URL that doesn't exist. |
| O2 | Path id that isn't a UUID (`/v1/farms/abc`) → `404 NOT_FOUND` | No farm has that id. Clients don't need to know the id format. |
| O3 | Strict types: `"1000"` or `true` for a number → 422 | Pydantic would quietly convert them; `true` becoming latitude 1.0 is a hidden bug. |
| O4 | Unknown fields in a body → 422 | Catches typos (`area_m3`) that would otherwise be dropped silently, and blocks sending `id`. |
| O5 | Plot names: trimmed, case-sensitive, unique per farm | Simple and predictable. Matches the database's `UNIQUE (farm_id, name)`, which compares case-sensitively. |
| O6 | Names only need to be non-empty (after trimming); no max length | Exactly what the spec says. |
| O7 | PATCH may move a plot to another farm | `farm_id` is a plot field and PATCH changes the fields in the body. The new farm must exist (422) and the name must be free there (409). |
| O8 | Empty PATCH `{}` → 200, object unchanged | Industry practice (Stripe, GitHub); "PATCH changes only the fields in the body". |
| O9 | "Today" = today in UTC+14, the first zone on Earth to reach a new day | Cheapest version of Y2: a date is rejected only if it is in the future everywhere. Nobody is wrongly rejected. Cost: a date up to about a day ahead can pass in western zones. **Temporary**: revisit with a per-plot time zone from lat/lon. |
| O10 | `Retry-After: 5` seconds on 503 | A missing or locked local SQLite file is usually fixed quickly. |
| O11 | Database path from the `REGISTRY_DB_PATH` environment variable, default `registry.db` next to the code | Tests point it at a temporary copy and never touch real data. |
| O12 | New database connection per request | Opening a local SQLite file takes well under 1 ms, so the p95 ≤ 100 ms target is safe. No thread-safety issues; a deleted file is noticed at once. |
| O13 | `IntegrityError` passes to the routes; every other database error → 503 | `IntegrityError` means "the database refused this data" (→ 409 or 422). Anything else means the database can't be used. |
| O14 | `/docs`, `/redoc`, `/openapi.json` turned off | The task does not list them and says to delete unlisted functionality. |
| O15 | FastAPI with Python's built-in `sqlite3`, no ORM | The seed script already owns the schema; an ORM would be a second definition of it. Fewer dependencies. |
| O16 | `registry.db` is git-ignored; `seed_registry.sh` is committed | The database is generated; the script is the source. |

## Agent's

| # | Decision | Why | Where |
| --- | --- | --- | --- |
| A1 | Error `title` comes from a hand-written table, not Python's `HTTPStatus` | Python 3.12 calls 422 "Unprocessable Content"; the spec's example says "Unprocessable Entity". | `errors.py` `TITLES` |
| A2 | 405 responses keep FastAPI's `Allow` header | Standard HTTP: tells the client which methods do work. | `errors.py` `handle_http_error` |
| A3 | A 422 `detail` lists every problem as `field: message`, joined by `; ` | One response shows all mistakes, not just the first. | `errors.py` `handle_request_validation_error` |
| A4 | One error class per `code` (`NotFoundError`, …), raised by routes | Routes say what went wrong; status and code come with the class. | `errors.py` |
| A5 | Open the database with `?mode=rw` | Without it, `sqlite3` silently creates an empty database when the file is missing, so "database unreachable" would never happen. | `db.py` `connect` |
| A6 | `PRAGMA foreign_keys = ON` on every connection | SQLite ignores `REFERENCES` unless this is set, per connection. | `db.py` `connect` |
| A7 | Commit only if the whole request succeeds | A failed request leaves the database as it was. | `db.py` `connect` |
| A8 | Uppercase UUIDs in the URL are lowercased before lookup | Ids are stored as lowercase text; otherwise a valid id would return 404. | Planned, Step 5 |
| A9 | VS Code points at the service's virtual environment | Removes "import could not be resolved" warnings. Local only (git-ignored). | `.vscode/settings.json` |
