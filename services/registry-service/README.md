# Registry service

The registry API for AgroPilot. It stores **farms** and **plots** (create, read, update, delete) and serves three read-only catalogues: **crops**, **soils** and **emitters**. It uses FastAPI with SQLite through the standard `sqlite3` module, with no ORM.

Every error is RFC 9457 `application/problem+json` with a `code`: `VALIDATION` (422), `NOT_FOUND` (404), `CONFLICT` (409) or `UNAVAILABLE` (503, always with `Retry-After: 5`). A 405 has no `code` because none of the four fits; see the judgment log.

## Run it

Run these from this folder. You need [uv](https://docs.astral.sh/uv/) and `sqlite3`.

```bash
uv sync                               # create .venv with the dependencies
bash seed_registry.sh                 # create registry.db with demo data
uv run uvicorn main:app --port 8000
```

- API: `http://127.0.0.1:8000/v1/...`
- Health check: `/health`
- Demo UI: `/ui`

To use another database file, set `REGISTRY_DB_PATH=/path/to/file.db`. The service never creates a missing database; it answers 503 instead.

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
uv run pytest          # 421 tests, about 10 s
```

`tests/test_matrix.py` is the break-the-API matrix. It covers bad field values, protocol abuse (wrong content type, broken JSON, huge bodies), broken databases (missing, read-only, locked, corrupt, bad rows) and concurrent writes.

## Latency (NFR-1.1: p95 ≤ 100 ms at 10 req/s)

Method: each of the 10 GET endpoints was called at 10 req/s for 30 s, which is 300 requests per endpoint, with 0 errors. Requests went out on a fixed schedule without waiting for earlier answers, so a slow answer could not delay the next request and hide its slowness. The first 10 requests were a warm-up and not counted.

| Data | Worst p95 | Slowest endpoint |
| --- | --- | --- |
| Seed data (4 plots) | **6.8 ms** | `GET /v1/plots` |
| 1,000 plots | **14.9 ms** (p99 22.1 ms) | `GET /v1/plots` |

Test machine: i7-1165G7 laptop, WSL2, Python 3.12.16, one uvicorn worker, client on the same machine.

## Load limits

A separate load test raised the request rate and the data size until p95 went over 100 ms. It used one uvicorn worker and a scratch database.

- **Request rate:** every GET stays at p95 ≤ 7 ms up to 200 req/s, and most stay there up to 400. Above about 200 req/s the laptop itself could not send requests fast enough, so those numbers are rough.
- **Reads and writes mixed (80/20):** p95 ≤ 7 ms up to 200 req/s, with no errors.
- **Data size, the known limit:** `GET /v1/plots` returns every plot, so it slows down as the table grows. At 10 req/s it measured p95 49 ms at 5,000 plots and 91 ms at 12,500. At 15,000 plots it timed out. The fix would be pagination, which would change the spec's API, so it is left to the spec owner (`DECISIONS.md` O48).

## More

- `../../DECISIONS.md`: every design decision, marked as mine, ours or the agent's.
- `../../docs/judgment-log.md`: where the agent's suggestion and my decision differed, and why.
