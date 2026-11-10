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
| Y7 | Future work (after P1, separate branch): a UI, and deliberately breaking the database to prove every failure is handled | Not part of P1: the task says to delete unlisted functionality. **The UI part was later changed by Y8.** |
| Y8 | Build a small UI now, on the same branch, in the P1 pull request, styled like a reference dashboard you supplied | You want visuals that show and exercise every feature. Trade-off accepted: a reviewer sees functionality the task doesn't list. |
| Y9 | The two measurement scripts (`measure_latency.py`, `hammer.py`) are kept locally, not committed | They are tooling, not API features, and the task says to delete unlisted functionality. Replaces O36 and the "committed" part of O44. Trade-off: a reviewer cannot rerun the measurement; the README describes the method instead. |
| Y10 | "Today" for the planting-date rule is the client's local date, from a `Time-Zone` header (e.g. `Asia/Jerusalem`) | A farmer's "today" is where they are. Replaces O9 when the header is sent. Protection against a lying client: every real zone is between UTC-12 and UTC+14, so a claimed zone can move "today" at most one day past UTC, never further. |

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
| O9 | "Today" = today in UTC+14, the first zone on Earth to reach a new day (**now only when no `Time-Zone` header is sent: see Y10**) | Cheapest version of Y2: a date is rejected only if it is in the future everywhere. Nobody is wrongly rejected. Cost: a date up to about a day ahead can pass in western zones. **Temporary**: revisit with a per-plot time zone from lat/lon. |
| O10 | `Retry-After: 5` seconds on 503 | A missing or locked local SQLite file is usually fixed quickly. |
| O11 | Database path from the `REGISTRY_DB_PATH` environment variable, default `registry.db` next to the code | Tests point it at a temporary copy and never touch real data. |
| O12 | New database connection per request | Opening a local SQLite file takes well under 1 ms, so the p95 ≤ 100 ms target is safe. No thread-safety issues; a deleted file is noticed at once. |
| O13 | `IntegrityError` passes to the routes; every other database error → 503 | `IntegrityError` means "the database refused this data" (→ 409 or 422). Anything else means the database can't be used. |
| O14 | `/docs`, `/redoc`, `/openapi.json` turned off | The task does not list them and says to delete unlisted functionality. |
| O15 | FastAPI with Python's built-in `sqlite3`, no ORM | The seed script already owns the schema; an ORM would be a second definition of it. Fewer dependencies. |
| O16 | `registry.db` is git-ignored; `seed_registry.sh` is committed | The database is generated; the script is the source. |
| O17 | One file per area: `catalogues.py`, `farms.py`, `plots.py`, with shapes in `models.py` | Easy to find and explain: plot logic lives in `plots.py`. `main.py` only wires things together. |
| O18 | The three catalogues share two helpers (`get_all`, `get_one`), with six tiny route functions | No logic copied three times, yet every URL still has its own visible function. |
| O19 | Lists come back in insertion order (`ORDER BY rowid`) | Without `ORDER BY`, SQLite's order is not guaranteed. Catalogues then match the spec's tables; farms and plots come oldest first. |
| O20 | Responses are shaped by Pydantic models | "Return only the fields listed" is enforced in one place, and types are fixed (`flow_lph` float, `available_water_mm_per_m` int). |
| O21 | PATCH with an explicit `null` (`{"name": null}`) → 422 | A missing field means "don't change it"; `null` is an attempt to erase a required value. |
| O22 | Any valid UUID spelling in the URL is accepted and normalized | Uppercase, no dashes or `{braces}` are the same id; `str(uuid.UUID(raw))` turns them into the stored lowercase form. |
| O23 | No `Location` header on 201 | The spec asks only for 201 and the object; the id is already in the body. Unlisted functionality. |
| O24 | Each route runs its own SQL in its area file, with small helpers like `find_farm()` | Everything about farms reads top to bottom in `farms.py`. A separate repository layer would double the files for no gain at this size. |
| O25 | Rebuild the virtual environment on Python 3.12 | The venv was on 3.14.4 while the repo's `.python-version` says 3.12. Match what the repo declares, which is what reviewers will run. |
| O26 | `GET /v1/plots?farm_id=<unknown farm>` → 200 and `[]` | It's a filter, and the spec says "no rows means 200 and `[]`". |
| O27 | `GET /v1/plots?farm_id=abc` (not a UUID) → 422 | A malformed filter is bad input. (In the *path*, a non-UUID is 404 because there it names a resource.) |
| O28 | Unknown query parameters → 422, on every URL | Same rule as unknown body fields. Otherwise `?farmid=` (typo) quietly returns every plot. |
| O29 | Tests use `httpx2` under FastAPI's `TestClient` | Starlette 1.10 marks `httpx` as deprecated for its test client and asks for `httpx2`; tested, it runs with no warnings. Dev-only dependency. |
| O30 | Run the real `seed_registry.sh` once per test run, then give every test its own copy of the file | Tests use exactly the spec's data, can't affect each other, and copying is near-instant (134 tests in under 1 s). |
| O31 | One test file per area (`test_errors`, `test_catalogues`, `test_farms`, `test_plots`) | Each test file mirrors the code file it tests. |
| O32 | Date tests compute "today in UTC+14" when they run | Always correct on any day, with no clock-freezing library to explain. |
| O33 | Latency is measured by our own small Python script, not a load-testing tool | Nothing to install, uses `httpx2` (already a dev dependency), and every line can be explained. |
| O34 | All 10 GET endpoints (list and by id for all five resources), 30 s each at 10 requests/s | 300 requests per endpoint gives a stable p95. |
| O35 | Measure on the seed data (the official number) and again with 1,000 plots | The seed has only 4 plots; the second run shows how the plot list holds up as it grows. |
| O36 | The script is committed in `scripts/measure_latency.py` | The task says "Measure it"; a reviewer can rerun the exact measurement behind the PR's number. |
| O37 | The service itself serves the UI at `/ui` | Same address as the API, so the browser needs no cross-origin (CORS) setup, and one command starts everything. |
| O38 | Plain HTML, CSS and JavaScript in one file, no framework, no build step | Nothing to install; small `fetch()` calls to the API you already know. |
| O39 | Extras: an API activity panel, "Try to break it" buttons, a health indicator | Lets you demo every error (404/405/409/422/503) in the interview and see the raw problem+json. |
| O40 | The UI shows one view at a time; Overview is a summary (KPIs, area chart, farms, 5 recent plantings, 5 last requests), each card linking to its full view | You asked for a real overview, not every section stacked on one page. |
| O41 | A "break the API" matrix, both as committed tests (`tests/test_matrix.py`) and as a one-off report | The tests guard forever; the report shows what each attack actually returned. |
| O42 | The matrix covers bad fields, protocol abuse, broken databases and concurrency | All four kinds you asked for. 266 cases plus 4 concurrency tests. |
| O43 | When the matrix finds a failure: report first, then fix one by one | Matches "pause, reflect, understand". |
| O44 | The hammer test ramps request rate, data size, and mixed reads+writes, against 1 uvicorn worker as shipped; committed as `scripts/hammer.py` | Honest numbers for the service as it runs, and anyone can rerun them. |
| O45 | A body FastAPI can't decode (invalid UTF-8, JSON nested 100,000 deep) → 422 `VALIDATION` | **Found by the matrix**: it was FastAPI's own 400, with no `code`. Same answer as any other unreadable body. |
| O46 | A stored row that doesn't fit the API (e.g. text in a number column) → 503 `UNAVAILABLE`; plus a last-resort handler so no crash is ever plain text | **Found by the matrix**: it was a plain-text 500. Broken data in the database is like a corrupt file (Y4). |
| O47 | HEAD requests keep getting 405 | The spec lists only GET; the 405 says which methods do work. |
| O48 | The `GET /v1/plots` size limit is documented, not fixed | **Found by the hammer**: past ~13,000 plots one response takes over 100 ms, so at 10 req/s requests arrive faster than they're answered and time out. The real fix (pagination) changes the spec's API, so it's the spec owner's decision. |
| O49 | The 405 `Allow` header lists every method the URL accepts | **Found by the matrix**: `/v1/farms` said `Allow: POST`, leaving out GET. |
| O50 | No `Time-Zone` header → today in UTC+14 (O9, unchanged); an unknown zone (e.g. `Mars/Base`) → 422 `VALIDATION`; the demo UI sends the browser's zone automatically | Old clients and curl keep working; a bad zone fails loudly like any bad input; the demo uses your real local date. Base is UTC, not the server's location, because servers move. |

## Agent's

| # | Decision | Why | Where |
| --- | --- | --- | --- |
| A1 | Error `title` comes from a hand-written table, not Python's `HTTPStatus` | Python 3.13+ calls 422 "Unprocessable Content"; the spec's example says "Unprocessable Entity". | `errors.py` `TITLES` |
| A2 | 405 responses keep FastAPI's `Allow` header | Standard HTTP: tells the client which methods do work. | `errors.py` `handle_http_error` |
| A3 | A 422 `detail` lists every problem as `field: message`, joined by `; ` | One response shows all mistakes, not just the first. | `errors.py` `handle_request_validation_error` |
| A4 | One error class per `code` (`NotFoundError`, …), raised by routes | Routes say what went wrong; status and code come with the class. | `errors.py` |
| A5 | Open the database with `?mode=rw` | Without it, `sqlite3` silently creates an empty database when the file is missing, so "database unreachable" would never happen. | `db.py` `connect` |
| A6 | `PRAGMA foreign_keys = ON` on every connection | SQLite ignores `REFERENCES` unless this is set, per connection. | `db.py` `connect` |
| A7 | Commit only if the whole request succeeds | A failed request leaves the database as it was. | `db.py` `connect` |
| A8 | Uppercase UUIDs in the URL are lowercased before lookup | Ids are stored as lowercase text; otherwise a valid id would return 404. | `models.py` `parse_id` |
| A9 | VS Code points at the service's virtual environment | Removes "import could not be resolved" warnings. Local only (git-ignored). | `.vscode/settings.json` |
| A10 | Table names go into the SQL string; ids are passed as `?` parameters | Table names are our own constants, never user input, so this is safe. Ids come from the URL, so they must be parameters (prevents SQL injection). | `catalogues.py` helpers |
| A11 | Models are set with `response_model=` in the route decorator, not as a return type | The helpers return plain dicts; FastAPI filters them through the model. A return type of `Crop` would make the editor flag a type mismatch. | `catalogues.py` routes |
| A12 | 405 on catalogues needs no code of its own | Only `GET` is defined, so FastAPI returns 405 for any other method, and our handler turns it into problem+json. | `catalogues.py` |
| A13 | "Farm still has plots" is detected by the database's foreign key, not by counting plots first | **Changed from the first plan** (check, then delete). The foreign key is the single source of truth, and there is no gap between "check" and "delete" where another request could add a plot. Relies on `PRAGMA foreign_keys = ON` (A6). | `farms.py` `delete_farm` |
| A14 | A small `sent_fields()` helper rejects explicit nulls on PATCH | Tested: Pydantic accepts `{"name": null}` for an optional field, so O21 needs its own check. Plots will reuse it. | `models.py` |
| A15 | The server creates ids with `uuid.uuid4()` (random) | Clients never choose ids; O4 already rejects `id` in a body. | `farms.py` `create_farm` |
| A16 | 204 responses use `response_class=Response` | Otherwise FastAPI sends a `content-type: application/json` header with an empty body. | `farms.py` `delete_farm` |
| A17 | A 422 for a missing body says `body: Field required` | The first version dropped the word `body` and said only `Field required`. | `errors.py` |
| A18 | `planting_date` is text that must match `YYYY-MM-DD` exactly, then be a real date, then not be in the future | Tested: strict mode rejects even a valid `"2026-03-01"` (JSON has no date type), and non-strict mode is too loose (accepts `"2026-03-01T00:00:00"` and timestamps). | `models.py` `PlantingDate` |
| A19 | `Infinity` and `NaN` are rejected in every request body | Python's JSON reader accepts them. `Infinity` passes "area > 0", then crashes with a 500 when sent back. | `models.py` `RequestModel` |
| A20 | Farm, crop, soil and emitter are looked up **before** the write | Gives the spec's own message (`"Unknown emitter"`) instead of a generic foreign-key error. After that, any `IntegrityError` on write can only be the unique name rule, so it becomes 409. | `plots.py` `check_references` |
| A21 | PATCH merges the changes into the stored plot, then checks the whole result | Moving a plot to another farm (O7) is just another field change: the new farm must exist and the name must be free there. | `plots.py` `update_plot` |
| A22 | The unknown-query-parameter rule (O28) lives in one place: a dependency on the whole app, with a small table of allowed parameters per URL | One rule, one place; routes don't repeat it. | `main.py` |
| A23 | 422 messages for date and UUID problems start with Pydantic's own `Value error, …` | Pydantic adds that prefix to messages from our custom checks. Removing it needs a more complex error type; left as is. | `models.py` |
| A24 | Tests check status and `code`, and the `detail` text only where we wrote it ourselves (`Unknown emitter`) | Python's own messages change between versions (seen: 3.12 vs 3.14 for `2026-02-30`), so asserting them would make tests break on upgrades. | `tests/` |
| A25 | Shared ids, the spec's example plot body and `assert_problem()` live in `tests/helpers.py` | Importing from `conftest.py` is discouraged by pytest; `conftest.py` keeps only fixtures. | `tests/helpers.py` |
| A26 | The tests were proven by breaking the code on purpose (13 breaks, in a scratch copy) | Every break, e.g. removing the foreign-key setting or allowing area 0, made at least one test fail. Passing tests prove little unless they can fail. Not committed. | — |
| A27 | Requests go out on a fixed schedule (one every 100 ms) without waiting for the previous answer | If each request waited for the last, one slow response would delay the next ones and the slowness would be under-counted ("coordinated omission"). | `measure_latency.py` `measure` |
| A28 | The first 10 requests per endpoint are a warm-up and not counted | They include opening the connection, which a running service only pays once. | `measure_latency.py` `main` |
| A29 | Percentiles use `method="inclusive"` | Found in a trial run: Python's default estimate reported a p99 above the slowest real request. | `measure_latency.py` `main` |
| A30 | The 1,000-plot database is built in a scratch folder with one SQL statement, not committed | It's only for the context run. The PR describes how it was made. | — |
| A31 | The UI's forms do no checking of their own (`novalidate`); the API is the only validator | The point of the UI is to show the API's rules. Browser checks would hide the 422s. | `ui/index.html` |
| A32 | Every value from the API is escaped before it goes into the page | Farm and plot names are user input; without escaping, a name like `<script>` would run in the browser (XSS). | `ui/index.html` `esc()` |
| A33 | Editing a plot sends only the changed fields (PATCH) | Shows the "PATCH changes only the fields in the body" rule in action. | `ui/index.html` `openPlotForm` |
| A34 | The plot filter calls `GET /v1/plots?farm_id=` instead of filtering in the browser | Exercises the API's own filter. | `ui/index.html` `loadTablePlots` |
| A35 | The health check polls every 5 s and is not logged in the activity panel | It would flood the panel. `/health` checks the API; a catalogue request checks the database. | `ui/index.html` `checkHealth` |
| A36 | The page is served by one plain route (`FileResponse`), not a static-files mount | One file, one route, easy to read. | `main.py` `ui` |
| A37 | The font (Inter) loads from Google Fonts, with system fonts as fallback | Matches the reference style; offline, the page still works with the fallback font. | `ui/index.html` |
| A38 | The matrix uses a test client that returns crashes as 500s (`raise_server_exceptions=False`) | By default FastAPI's test client re-raises a crash as a Python exception, so the matrix couldn't see what a real caller gets. | `tests/test_matrix.py` |
| A39 | The `Allow` header is worked out with the public `route.matches()`, asking method by method | FastAPI 0.162 wraps included routers in a private `_IncludedRouter`; depending on private internals would break on upgrades. | `errors.py` `allowed_methods` |
| A40 | The hammer script builds its own scratch databases and starts and stops its own server | One command reproduces everything; `registry.db` is never touched. | `scripts/hammer.py` |
| A41 | The hammer reports the **achieved** rate next to the target rate | If the client can't send as fast as asked, the step measures the laptop, not the service. Seen: above ~200 req/s on this laptop, client and server compete for the same CPU. | `scripts/hammer.py` |
| A42 | Matrix cases with no decision yet (`None`) only check the two rules | Their actual answers are listed for you: duplicate JSON keys (last wins), 1 MB names (accepted), no content-type (422), `+json` (201), trailing slash (307 redirect), `farm_id` twice (last wins), a garbage stored date (returned as-is). | `tests/test_matrix.py` |
| A43 | One of my matrix expectations was wrong and was corrected | With the plots table dropped, deleting a farm correctly succeeds: nothing references it. | `tests/test_matrix.py` |
| A44 | The future-date check moved from the Pydantic model to the plot routes (`check_not_future`), fed by a `today_for_request` dependency | A Pydantic validator can't see request headers; the model still checks the date is real (`check_real_date`). PATCH checks the date only when it is sent. | `models.py`, `plots.py` |
