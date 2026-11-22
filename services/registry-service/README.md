# Registry service

The registry API for AgroPilot. It stores **farms** and **plots** (create, read, update, delete) and serves three read-only catalogues: **crops**, **soils** and **emitters**. It uses FastAPI with SQLAlchemy Core (tables and queries, no ORM classes), on PostgreSQL in production and on a SQLite file for local work and tests.

Every error is RFC 9457 `application/problem+json` with a `code`: `VALIDATION` (422), `NOT_FOUND` (404), `CONFLICT` (409) or `UNAVAILABLE` (503, always with `Retry-After: 5`). A 405 has no `code` because none of the four fits; see the judgment log.

## Run it

Run these from this folder. You need [uv](https://docs.astral.sh/uv/).

```bash
uv sync                               # create .venv with the dependencies
cp .env.example .env                  # the settings file; .env is never committed
bash seed_registry.sh                 # create registry.db (SQLite) with demo data
uv run uvicorn main:app --port 8000
```

- API: `http://127.0.0.1:8000/v1/...`
- Health check: `/health`: 200 `{"status": "ok"}` when the API answers and the database runs a query; 503 `UNAVAILABLE` (with `Retry-After`) when the database is down.
- Demo UI: `/ui`, which opens on a playground for trying any request

**Settings.** The one required setting is `DATABASE_URL`, read from the environment or from `.env` (the environment wins). Without it the service stops at startup with `Missing required setting DATABASE_URL. Copy .env.example to .env and fill it in.` A malformed URL (for example `postgres://...` instead of `postgresql+psycopg://...`) also stops it with one line: `DATABASE_URL is not a valid database URL. ...`. `.env.example` has a line for each database:

| Database | `DATABASE_URL` |
| --- | --- |
| SQLite (local) | `sqlite:///registry.db` (a relative path means this folder) |
| PostgreSQL (production) | `postgresql+psycopg://registry:<password>@localhost:5432/registry?connect_timeout=3&options=-c%20statement_timeout%3D5000` |

On PostgreSQL, `connect_timeout=3` and `statement_timeout=5000` turn a database that is down or stuck into a 503 within a few seconds instead of a hung request. The service never creates a missing database or tables; it answers 503 instead.

**Seeding PostgreSQL.** Create the tables and the 15 demo rows once:

```bash
uv run python seed.py                       # uses DATABASE_URL from .env
DATABASE_URL='postgresql+psycopg://...' uv run python seed.py   # or give it directly
```

It is all or nothing, in one transaction. If any of the five tables already exists it prints `Tables already exist; nothing changed.` and exits 1, so it can't harm a database that is in use. `bash seed_registry.sh` does the same for a SQLite file: it deletes the file first, then runs `seed.py` on it. The schema lives in `tables.py`, the rows in `seed.py`.

## Endpoints

| Path | Methods |
| --- | --- |
| `/v1/farms`, `/v1/plots` | GET (list), POST |
| `/v1/farms/{id}`, `/v1/plots/{id}` | GET, PATCH, DELETE |
| `/v1/crops`, `/v1/soils`, `/v1/emitters` and `/{id}` | GET only (anything else: 405) |

`GET /v1/plots?farm_id=...` filters plots by farm. Deleting a farm that still has plots gives 409.

**Planting date and time zones.** A `planting_date` may not be in the future, and "today" is the client's local date. Send it as a header with an IANA zone name, for example `Time-Zone: Asia/Jerusalem`. With no header, today is taken in UTC+14, the first zone to reach a new day, so nobody is rejected for entering their own date. An unknown zone gives 422. Every real zone lies between UTC−12 and UTC+14, so a client can't move "today" more than a day past UTC. The demo UI sends the browser's zone.

## Test it

```bash
uv run pytest          # SQLite: 448 passed, 2 skipped (PostgreSQL-only tests), about 10 s
```

Tests need no `.env`. Each test gets its own copy of a freshly seeded SQLite file.

**Running the suite on PostgreSQL (optional).** Set `TEST_DATABASE_URL` and every test runs against PostgreSQL instead. Each test drops every table and seeds again, so **use a separate database, never `registry`**. The suite refuses to start unless the database name ends in `_test`. Create it once:

```bash
sudo -u postgres createdb -O registry registry_test
TEST_DATABASE_URL='postgresql+psycopg://registry:<password>@localhost:5432/registry_test?connect_timeout=3&options=-c%20statement_timeout%3D5000' uv run pytest
```

Result: 433 passed, 17 skipped. The skipped ones break a SQLite file (missing, read-only, corrupt, locked), which doesn't exist on PostgreSQL. Two tests run only on PostgreSQL: the farm-row lock during plot writes, and the all-or-nothing seed.

`tests/test_matrix.py` is the break-the-API matrix. It covers bad field values, protocol abuse (wrong content type, broken JSON, huge bodies), broken databases (missing, read-only, locked, corrupt, bad rows) and concurrent writes.

## Latency (P2 NFR-2.2, P1 NFR-1.1: p95 ≤ 100 ms at 10 req/s)

Method: each of the 10 GET endpoints was called at 10 req/s for 30 s, which is 300 requests per endpoint. Requests went out on a fixed schedule without waiting for earlier answers, so a slow answer could not delay the next request and hide its slowness. The first 10 requests were a warm-up and not counted. Script: `scripts/measure_latency.py`.

| Database | Data | Worst p95 | Slowest endpoint | Errors |
| --- | --- | --- | --- | --- |
| **PostgreSQL 18 (P2)** | Seed data (4 plots) | **5.8 ms** | `GET /v1/farms/{id}`, `GET /v1/emitters/{id}` | 0 of 3,000 |
| SQLite (P1) | Seed data (4 plots) | **6.8 ms** | `GET /v1/plots` | 0 |
| SQLite (P1) | 1,000 plots | **14.9 ms** (p99 22.1 ms) | `GET /v1/plots` | 0 |

PostgreSQL run of 2026-11-18 (after the last registry code change, nothing else running), every endpoint (ms):

| Endpoint | p50 | p95 | p99 | max |
| --- | --- | --- | --- | --- |
| `GET /v1/farms` | 3.5 | 4.8 | 5.3 | 5.7 |
| `GET /v1/farms/{id}` | 3.9 | 5.8 | 6.3 | 6.7 |
| `GET /v1/plots` | 3.9 | 5.3 | 5.6 | 10.0 |
| `GET /v1/plots/{id}` | 3.6 | 5.6 | 6.1 | 6.2 |
| `GET /v1/crops` | 3.5 | 5.0 | 5.4 | 6.1 |
| `GET /v1/crops/{id}` | 3.8 | 5.2 | 5.5 | 5.8 |
| `GET /v1/soils` | 3.5 | 4.5 | 5.1 | 5.4 |
| `GET /v1/soils/{id}` | 3.7 | 5.0 | 5.5 | 5.9 |
| `GET /v1/emitters` | 4.1 | 5.3 | 5.5 | 5.8 |
| `GET /v1/emitters/{id}` | 3.8 | 5.8 | 6.1 | 6.6 |

With PostgreSQL stopped, every `/v1` request answered 503 with `Retry-After: 5` in under 10 ms. After restarting PostgreSQL, the next request was 200 again, without restarting the service.

Test machine: i7-1165G7 laptop, WSL2, Python 3.12.16, one uvicorn worker, client on the same machine.

## Load limits

A separate load test (`scripts/hammer.py`, P1, on SQLite) raised the request rate and the data size until p95 went over 100 ms. It used one uvicorn worker and a scratch database.

- **Request rate:** every GET stays at p95 ≤ 7 ms up to 200 req/s, and most stay there up to 400. Above about 200 req/s the laptop itself could not send requests fast enough, so those numbers are rough.
- **Reads and writes mixed (80/20):** p95 ≤ 7 ms up to 200 req/s, with no errors.
- **Data size, the known limit:** `GET /v1/plots` returns every plot, so it slows down as the table grows. At 10 req/s it measured p95 49 ms at 5,000 plots and 91 ms at 12,500. At 15,000 plots it timed out. The fix would be pagination, which would change the spec's API, so it is left to the spec owner (`DECISIONS.md` O48).

## More

- `../../DECISIONS.md`: every design decision, marked as mine, ours or the agent's.
- `../../docs/judgment-log.md`: where the agent's suggestion and my decision differed, and why.
