# Design: the grower sets today's soil water (supersedes O76)

Status: agreed with the owner 2026-11-17. Research: `services/planner-service/docs/research/soil-feel.md`.

## Problem

The planner only looks forward from today, so it needs to know how full the soil bucket is this morning. Today it always assumes full (O76). In November that makes most plots show "No irrigation" for all 7 days, even when the soil is dry.

## Decision (owner, 2026-11-17)

- The grower tells the planner how wet the soil is today, on the plot page, each visit. Nothing is stored.
- The grower answers about what they can **see and feel in the soil**, not about our bucket. The frontend turns the answer into a bucket level.
- The descriptions depend on the plot's soil (sand, loam, clay loam), from USDA NRCS Program Aid 1619, "Estimating Soil Moisture by Feel and Appearance" (1998).
- If the grower picks nothing, the plan starts full, as today, and the page says so in words.

## Soil descriptions

- **Soil groups:** loam and clay loam are named in the guide. Our "sand" uses the guide's closest group, "fine sand and loamy fine sand" (83 mm/m is inside its range). Our choice.
- **Five rows per soil**, in the guide's order. Each sends the middle of its range (our choice, not the guide's):

  | Key | Label | Guide range | `start_pct` |
  |---|---|---|---|
  | `dry` | Dry | 0-25% | 12.5 |
  | `slightly-moist` | Slightly moist | 25-50% | 37.5 |
  | `moist` | Moist | 50-75% | 62.5 |
  | `wet` | Wet | 75-100% | 87.5 |
  | `free-water` | Wet with free water | 100% (field capacity) | 100 |

- The description text for each soil and row is in `soil-feel.md`, section 2 (tables for sand, loam, clay loam). The UI uses a short version of each (one sentence the grower can check by hand).
- **Same quantity:** the guide's "percent of available water" is our bucket (TAW between field capacity and wilting point).
- **Sampling:** one handful from the middle of the root zone. The guide samples every 30 cm down to root depth at 3 or more sites. We simplify that for a grower on a phone.
- **Accuracy:** 25-point bands. The page calls it an estimate, never a measurement.

## Build plan

Three steps. Stop after each one for review. No commits (the owner commits). Every new function gets a short docstring. Plain, readable code; touch only what the step needs.

### Step 1: planner-service accepts `start_pct`

- `GET /v1/plots/{id}/plan?days=7&start_pct=37.5`. `start_pct` is a number from 0 to 100 inclusive (decimals allowed), the bucket's fill level at the start of today: 100 = full (field capacity), 0 = empty (wilting point). Default 100.
- Add `start_pct` to `ALLOWED_QUERY_PARAMS` in `main.py`.
- Bad value (below 0, above 100, not a number, `nan`, `inf`): `422`, `code`: `VALIDATION`, in the same problem+json shape as a bad `days`.
- `engine.plan_days(plot, forecast, start_pct=100.0)`: the starting depletion is `TAW(day 1) x (1 - start_pct / 100)`, where `TAW(day 1)` is `available_water_mm_per_m x root depth on day 1`. Everything after that is unchanged. Update its docstring (it mentions O76).
- A start below half means day 1 already irrigates (refill to full). That is intended.
- Response: `Plan` gets a top-level `start_pct` field (the value used, default 100).
- Tests:
  - engine: `start_pct=100` gives exactly the current plans (the three hand cases still pass); a start below half irrigates on day 1 and refills to full; `start_pct=0` starts at depletion = TAW.
  - route: default is 100 and appears in the response; a given value reaches the engine; the 422 cases above.
- Done: `uv run pytest` passes in `services/planner-service`.

### Step 2: skill, hand case and README

- `.claude/skills/irrigation-calc-reference/SKILL.md`: a "starting level" rule (step 0) with the formula and the source (owner's decision, superseding O76; PA 1619 for the meaning of the percentage).
- `references/cases.md`: a fourth hand-calculated case that does not start full (for example one demo plot with `start_pct=37.5`), calculated by hand from the skill, not from the code. Add it to the engine tests (NFR-2.5: within 0.5%).
- `services/planner-service/README.md`: the new parameter, its range, default and the 422.
- Done: `uv run pytest` passes, including the fourth case.

### Step 3: frontend soil selector

- `src/lib/soil-feel.ts`: for each of `sand`, `loam`, `clay-loam`, the five rows (key, label, one-sentence description, `start_pct`), with the source cited in a comment. A function that returns the rows for a soil id, or nothing for an unknown soil.
- `src/lib/planner.ts`: `getPlan(plotId, startPct?)` adds `start_pct` to the URL only when given. `Plan` type gets `start_pct`.
- Plot page (`src/app/plots/[id]/page.tsx`) reads `?start_pct=` from its own URL and passes it to `getPlan`.
- A new component, shown under today's recommendation:
  - Title: "How wet is the soil today?" Instruction: "Squeeze a handful of soil from the middle of the root zone."
  - The five rows for this plot's soil (from `plan.soil_id`), each a plain link to `?start_pct=<n>`. The chosen one is highlighted.
  - "I know the exact %": a plain GET form with a number input named `start_pct` (0-100).
  - With no choice, a line says: "Assuming the soil is at field capacity (wet with free water)." With a choice, it says which one, and that this is an estimate.
  - An unknown soil shows only the exact-% form.
- No browser calls to services: links and the form reload the page, which fetches on the server.
- A bad `start_pct` in the URL is the planner's 422, shown by the existing error notice.
- Must stay usable at 375 px (NFR-2.8): no horizontal scroll, today's recommendation still visible without scrolling.
- Done: `npm run build` and `npm run lint` pass in `services/frontend`; with all three services running, picking "Dry" on a demo plot shows irrigation on day 1.

## Part 2: 24-hour cap, trigger choice, timeline (owner, 2026-11-17)

Why: refilling the bucket in one day often needs more than 24 h of dripping (East block, dry: 2024 min), which no system can do.

Decisions:
- **Hard cap:** a day irrigates at most what the drip system gives in 24 h. The bucket may end that day below full. The next day the normal trigger decides again; nothing is carried over automatically.
  - System rate `drip_mm_per_hour = flow_lph / (row_spacing_m x emitter_spacing_m)`.
  - `max_mm_per_day = drip_mm_per_hour x 24`. `irrigation = min(Dr_end, max_mm_per_day)`; `capped = Dr_end > max_mm_per_day`.
  - A capped day has `run_minutes` exactly 1440 (guard against float noise making `ceil` give 1441).
- **Trigger choice:** new query parameter `trigger_pct`: irrigate when the bucket would end the day below this percent of TAW. Default 50 (p2.md, O78). Allowed 1-99 (owner's choice B); outside: 422.
  - Crop value from FAO-56 Table 22 (`p` = fraction used up): tomato p 0.40 -> 60%, bell pepper p 0.30 -> 70%. The planner keeps these with the crop data and returns `crop_trigger_pct`.
  - FAO's range for p is 0.30-0.70 (Ch. 8), so 30-70% is the usual range. Outside it the frontend shows a warning with the crop value as the recommendation; the planner still accepts it.
- **Response additions:** top level `trigger_pct`, `crop_trigger_pct`, `drip_mm_per_hour` (2 decimals); each day `capped`.
- **Display:** run times as "10 h 12 min" (minutes only below 1 h: "45 min"). A setup notice (option A). A horizontal timeline bar with a grower-picked start time (default 06:00).

### Step 4: skill and hand cases first (O85 order)

- `SKILL.md`:
  - Step 4 trigger: `trigger = trigger_pct / 100 x TAW`, default 50, the crop values from Table 22 with source, the 1-99 range.
  - Step 8: the 24-hour cap and `capped`, with the rate formula. Source: physics of the system (owner's decision), not FAO.
- `references/cases.md`:
  - Recalculate case 4 by hand with the cap (its day 1 needed 1467 min > 1440).
  - Check cases 1-3: any day above 1440 min changes, others stay. Say which.
  - Add case 5: a tomato plot with `trigger_pct=60` (crop value), by hand, at least 3 days, chosen so the trigger at 60 irrigates on a day where 50 would not.
- Do not touch code in this step.
- Done: the skill and cases read consistently. Report the changed numbers.

### Step 5: planner engine and API

- `engine.py`: the cap, `capped`, `trigger_pct` parameter (replacing the fixed 0.5), crop `p` in `CROPS`.
- `plan.py`/`main.py`: `trigger_pct` query (1-99, default 50, nan/inf refused), allowed params, response fields above.
- Tests: cases 4 and 5 by hand within 0.5%; capped day is exactly 1440 min and ends below full; next day irrigates only if below trigger; `trigger_pct` 422s; default 50 keeps cases 1-3.
- README: the new parameter, fields and the cap.
- Done: `uv run pytest` passes.

### Step 6: frontend

- **Durations:** one formatter in `src/lib/format.ts` ("45 min", "10 h 12 min", "24 h"); used by today's recommendation and the plan table.
- **Trigger picker** (next to the soil picker, same style): "Irrigate when the bucket falls below": Half (50%, default) / Crop value (`crop_trigger_pct`%) / Custom % (1-99). Page URL `?trigger_pct=`. If the value used is outside 30-70: a warning, "Outside the usual range (30-70%). Recommended for <crop>: <crop_trigger_pct>%."
- **Setup notice:** "Your drip system gives <drip_mm_per_hour> mm per hour. Refilling from <trigger>% to full takes about <h> today." (today's `bucket_capacity_mm x (100 - trigger_pct) / 100 / drip_mm_per_hour`). If any day is `capped`: "Some days need more than 24 h of watering, so the plan spreads it over the following days."
- **Start time:** "Start watering at" time input, page URL `?start=HH:MM`, default 06:00. An invalid value falls back to 06:00 with a short note. Frontend only; the planner doesn't know clock times.
- **Timeline bar:** one horizontal bar across the plan's days, each day an equal-width 00:00-24:00 slice with day labels. Blue (the water token) where watering runs, grey elsewhere. Each watering day starts at the start time and runs `run_minutes`; a run that passes midnight continues into the next day; if the previous run is still going, the next day's run starts when it ends. Under the bar, the same windows as text ("Sun 06:00 - Mon 06:00, 24 h"), so it is readable without colour.
- Must stay usable at 375 px. Today's recommendation stays first.
- Done: `npm run build` and `npm run lint` pass; live check of a capped plot and a trigger outside 30-70 if the services are running.

## Left to the main agent (not the builder)

- `DECISIONS.md`: a new O# that supersedes O76 (O76 marked, not deleted); the O80 rejection of the Israeli sources.
- `docs/judgment-log.md`: entries in the owner's words.

## Not in scope

- Storing the grower's answer.
- Sensor readings (tensiometer centibars), which would need each soil's water retention curve.
