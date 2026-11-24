# Test plan

The map of AgroPilot's tests: what each part protects, where the tests are, and what is not covered yet. Updated by the `test` skill after every section.

Last updated: 2026-11-24, after everything changed since 2026-11-17 (live QA fixes O125-O133, plot cards Y36/Y37/O134, the redesign's `src/lib` helpers) and the frontend QA 2026-11-24 fixes (O135-O140).

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
- **Covered:** catalogues (`test_catalogues.py`), farms CRUD (`test_farms.py`), plots CRUD and plot rules (`test_plots.py`), shared errors and query parameters incl. a repeated one (O130) and `/health` 503 with `Retry-After` when the database is gone (O126) (`test_errors.py`), settings (`test_config.py`), seed data, and every seed plot inside the O132 ranges (`test_seed.py`), break-the-API matrix incl. the O132 area/spacing bounds on POST and PATCH, broken databases (also on `/health`) and concurrency (`test_matrix.py`), demo UI strings (`test_ui.py`).
- **Known gaps:** only the parts above were reviewed by this skill.

### weather-service
- **Covered:** forecast queries, grid cells, cache, stale answers and 503 (`test_forecast.py`), the Open-Meteo call and bad answers (`test_provider.py`), settings (`test_config.py`), shared errors and a repeated query parameter (O130) (`test_errors.py`).
- **Known gaps:** not reviewed by this skill yet.

### planner-service
- **Covered:** the FAO-56 calculation against the hand-calculated cases, incl. the bucket never going below empty (O99) (`test_engine.py`), the plan endpoint with fake upstreams, incl. the upstream's own reason passed on, trimmed, for any failing status (O127) and cut after 200 characters (O136) (`test_plan.py`), settings (`test_config.py`), shared errors and a repeated query parameter (O130) (`test_errors.py`).
- **Known gaps:** only the parts above were reviewed by this skill.

### frontend (src/lib)
- **Covered:** watering timeline (Y16, Y18, Y19, A63, O104): start time parsing and fallback, watering windows, date arithmetic across month/year/leap day and machine time zones, bar position, labels kept apart by px, the "now" line and notes (`timeline.test.ts`); display formats: durations, weekdays, litres incl. the 10 L edge (O113), area at the O132 bounds, coordinates, forecast time in the phone's zone (Y28), the card's dates under UTC+14/UTC-12, `plural` and one full stop after a service's words (O136) (`format.test.ts`); the overview headline (O105, O125) (`overview.test.ts`); the chart's round mm ticks (O138) (`chart-axis.test.ts`); the card map's OSM tiles: centring, cover, wrap at 180°, both poles cut (O134) (`map-tiles.test.ts`); the choices in the address: `hrefWith`/`hrefWithout` keep the other choices incl. `view` (Y26), a bad `start` dropped (`plan-query.test.ts`); soil-by-feel rows per seed soil, their `start_pct` and word limit (`soil-feel.test.ts`).
- **Known gaps:**
  - Logic that still lives inside components, untestable until moved to `src/lib`: the card's status pill and Today box incl. the capped note (`plot-card.tsx`, Y36, O137), the chart's `chartRows` (`plan-chart.tsx`), the drip-rate guard (`today-recommendation.tsx`, O106).
  - `http.ts`, `config.ts`, `health.ts`, `proxy.ts` have no unit tests (the 404 of `proxy.ts` is covered by e2e).
  - No contract test that the frontend's `PlanDay` type matches the planner's response model.

## Across services (e2e)

`tests/e2e/test_plot_flow.py`, against the running stack, own `e2e-` rows only:
- a plot created in the registry gets a 7-day plan from the planner (registry + weather);
- the frontend's plot page shows it by name;
- an unknown plot page answers a real 404 (O98, O116); the planner's 404 for an unknown plot;
- the registry refuses a 1 cm² plot on the real database and stores nothing (O132).

## Known gaps (system-wide)

- e2e can't take a service or the database down; outages are covered by each service's suite with fakes and by `qa`/`qa-live`.
- The production build (`npm run build`) is skipped by `run-all.sh` while the frontend runs on :3000.
