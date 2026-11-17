# Test plan

The map of AgroPilot's tests: what each part protects, where the tests are, and what is not covered yet. Updated by the `test` skill after every section.

Last updated: 2026-11-17, after the watering timeline (frontend `src/lib/timeline.ts`).

## How to run

| Suite | Command | Needs |
| --- | --- | --- |
| registry | `cd services/registry-service && uv run pytest` | nothing (SQLite copy per test); `TEST_DATABASE_URL` for PostgreSQL |
| weather | `cd services/weather-service && uv run pytest` | nothing (fake provider) |
| planner | `cd services/planner-service && uv run pytest` | nothing (fake registry and weather) |
| frontend | `cd services/frontend && npm test` | nothing (pure logic) |
| e2e | `cd tests/e2e && uv run pytest` | the stack running (`run-stack`); skips when down |

## Per service

### registry-service
- **Covered:** catalogues (`test_catalogues.py`), farms CRUD (`test_farms.py`), plots CRUD and plot rules (`test_plots.py`), shared errors and query parameters (`test_errors.py`), settings (`test_config.py`), seed data (`test_seed.py`), break-the-API matrix incl. broken databases and concurrency (`test_matrix.py`), demo UI strings (`test_ui.py`).
- **Known gaps:** not reviewed by this skill yet.

### weather-service
- **Covered:** forecast queries, grid cells, cache, stale answers and 503 (`test_forecast.py`), the Open-Meteo call and bad answers (`test_provider.py`), settings (`test_config.py`), shared errors (`test_errors.py`).
- **Known gaps:** not reviewed by this skill yet.

### planner-service
- **Covered:** the FAO-56 calculation against the hand-calculated cases (`test_engine.py`), the plan endpoint with fake upstreams (`test_plan.py`), settings (`test_config.py`), shared errors (`test_errors.py`).
- **Known gaps:** not reviewed by this skill yet.

### frontend (src/lib)
- **Covered:** watering timeline (Y16, A63): start time parsing and fallback, watering windows (per day, past midnight, back-to-back capped days, a run still going pushes the next), date arithmetic across month/year/leap day and machine time zones, clock times (`timeline.test.ts`); run durations and weekday labels the timeline shows (`format.test.ts`).
- **Known gaps:**
  - `watering-timeline.tsx` private helpers (`barPosition`: the bar cut at the plan's last day; `windowText`/`momentText`: "Sun 06:00 - Mon 06:00, 24 h") are not in `src/lib`, so they have no unit test; the `qa` skill checks them on the page.
  - Other `src/lib` modules (`plan-query.ts`, `soil-feel.ts`, `http.ts`, `config.ts`, `health.ts`, `formatArea`/`formatLitres`/`formatDay`/`formatFetchedAt`) have no tests yet.
  - No contract test that the frontend's `PlanDay` type matches the planner's response model.

## Across services (e2e)

No e2e suite yet (`tests/e2e/` does not exist). The first section with a cross-service flow creates it.

## Known gaps (system-wide)

- No cross-service e2e flow (create a plot, the planner plans it, the page renders it).
