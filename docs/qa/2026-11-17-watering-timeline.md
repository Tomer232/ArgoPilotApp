# QA: watering timeline ("When to water" on the plot page)

Date: 2026-11-17. Branch: p2 at c51f7c7, plus uncommitted work: yes (skill files only, nothing in the section).
Stack: QA mode (`registry_qa`). Browser: none: HTML only, layout and clicks not checked (Playwright's cached Chromium exists but cannot start: `libnss3`, `libnspr4`, `libasound` are missing, and installing them needs sudo).

Section: `services/frontend/src/components/watering-timeline.tsx`, `src/lib/timeline.ts`, the `start` query parameter, and the planner plan the timeline is built from. Requirements used: p2.md FR-2.9 to FR-2.18, NFR-2.8; DECISIONS.md Y16, O90, O91, A63; `irrigation-calc-reference`.

## Summary

| Severity | Count |
| --- | --- |
| critical | 0 |
| high | 1 |
| medium | 3 |
| low | 4 |

Top findings: the planner returns a negative soil-water level (bucket below empty) and the page shows "-1.46 of 21.34 mm" (QA-1); the timeline has no stale marker although every window comes from a stale day (QA-2); today's run is shown starting at 06:00 when it is already 11:55, with nothing saying it is late (QA-3).

## Findings

### QA-1 Soil water goes below empty: negative bucket level in the plan and on the page (high, services)

**Status: fixed** (DECISIONS O97): depletion now stops at TAW; test `test_bucket_never_goes_below_empty`.

- **Steps:**
  ```bash
  curl -s -X POST localhost:8000/v1/plots -H 'Content-Type: application/json' -d '{"farm_id":"b7e2c0a0-3c1d-4f0a-9a11-0c5d2e6f1001","name":"QA slow drip","area_m2":1000,"crop_id":"tomato","planting_date":"2026-11-10","soil_id":"sand","row_spacing_m":10,"emitter_spacing_m":10,"emitter_id":"dripnet-pc-0.6","lat":31.25,"lon":34.79}'
  # use the returned id as <id>
  curl -s "localhost:8002/v1/plots/<id>/plan?start_pct=0"
  # then open http://localhost:3000/plots/<id>?start_pct=0
  ```
- **Expected:** the bucket level stays between 0 and TAW. FAO-56 Ch. 8 bounds the root-zone depletion to 0 <= Dr <= TAW (the soil cannot hold less than wilting point). FR-2.11 says every number follows the skill; the skill (step 7) only clamps the lower side, `max(0, ...)`, so this is a gap in the skill as much as in `engine.py`.
- **Actual:** `bucket_end_mm` per day: `-1.46, -2.28, -3.31, -4.41, -5.46, -6.08, -6.86` (TAW 21.34 to 24.9, drip 0.01 mm/h, every day capped at 1440 min). The page shows "Soil water at end of day -1.46 of 21.34 mm" and the table's "Soil water mm" column is negative every day.
- **Notes:** any plot whose drip rate is below the crop's daily need, starting dry, reaches this; registry accepts the spacings (no upper limit, which is per spec). The irrigation advice itself (24 h every day) is still right, which is why this is high and not critical, but a negative level is a number that cannot exist and the grower sees it.

### QA-2 The timeline does not show that its windows come from a stale forecast (medium, UI)

- **Steps:** make the weather provider fail after one good fetch, then open the plot page.
  ```bash
  # proxy.py: forwards to Open-Meteo until a file named 'fail' exists next to it, then answers 500
  python3 -I proxy.py &                                   # listens on 127.0.0.1:9999
  bash .claude/skills/run-stack/scripts/stack.sh stop weather
  PROVIDER_BASE_URL=http://127.0.0.1:9999/v1/forecast FRESH_HOURS=0.005 bash .claude/skills/run-stack/scripts/stack.sh restart weather
  curl -s "localhost:8002/v1/plots/c8f3d1b0-4d2e-5a1b-8b22-1d6e3f702002/plan?start_pct=30" > /dev/null
  touch fail; sleep 20
  curl -s "localhost:3000/plots/c8f3d1b0-4d2e-5a1b-8b22-1d6e3f702002?start_pct=30"
  ```
- **Expected:** FR-2.17: "When the forecast is stale, the user sees it, next to the numbers it affects." The timeline's run times are such numbers.
- **Actual:** plan days all `stale: true`. Today's card shows "Stale forecast, Weather from 17 Nov, 09:57 UTC", each table row shows "Stale forecast", but the "When to water" panel shows only "Tue 06:00 - Wed 06:00, 24 h" with no stale mark (`watering-timeline.tsx` never reads `day.stale`).
- **Notes:** on a phone the timeline is a separate card far below the table, so the stale label in the table is not "next to" it.

### QA-3 Today's run is shown at a time that has already passed, with no "now" (medium, UX)

- **Steps:**
  ```bash
  # at 11:55 local time (Asia/Jerusalem, the plot's zone)
  curl -s "localhost:3000/plots/c8f3d1b0-4d2e-5a1b-8b22-1d6e3f702002?start_pct=30"
  ```
- **Expected:** a grower opening the page at noon can tell what to do now (qa skill UX check "what to do today, in five seconds"; Y16 gives the start time to the grower, default 06:00).
- **Actual:** "Tue 06:00 - Wed 06:00, 24 h" for today, while it is Tue 11:55. Nothing on the bar or in the text says the start time has passed or where "now" is. Today's card says "Water for 24 h", so read together the grower either thinks they are six hours late on a 24-hour run, or starts now and runs past the next run's 06:00 start.
- **Notes:** the page knows the plot's today (day 1's date) but not the current time; whether to show "now" or start today's run from the current time is the owner's call.

### QA-4 A run that passes midnight moves most of a day's water into the next day, unlike the plan (medium, UX)

- **Steps:**
  ```bash
  curl -s "localhost:3000/plots/c8f3d1b0-4d2e-5a1b-8b22-1d6e3f702002?start_pct=30&start=23:59"
  # and the slow-drip plot from QA-1:
  curl -s "localhost:3000/plots/<slow-drip id>?start_pct=0&start=23:59"
  ```
- **Expected:** the timeline and the table describe the same watering. The planner (O79, O90) puts each day's `irrigation_mm` into that day's bucket.
- **Actual:** "Tue 23:59 - Wed 23:59, 24 h": 1 minute of today's 40 mm falls on today, 1439 minutes on Wednesday, while the table and today's card say the 40 mm is today's and the bucket ends today at 74.61 mm. For the slow-drip plot every window is "X 23:59 - next day 23:59", so the whole week runs one day later than the plan, and the last window ends on Tue 24 Nov, outside the 7 shown days (the bar shows a 0.0099 % sliver for it).
- **Notes:** Y16 chose "a run that passes midnight continues into the next day", so this follows the decision; reported because the two views now contradict each other for any start after about 00:00 on a capped day. The owner decides whether that is acceptable.

### QA-5 Very short runs are invisible on the bar (low, UI)

- **Steps:**
  ```bash
  curl -s -X POST localhost:8000/v1/plots -H 'Content-Type: application/json' -d '{"farm_id":"b7e2c0a0-3c1d-4f0a-9a11-0c5d2e6f1001","name":"QA fast drip","area_m2":0.5,"crop_id":"tomato","planting_date":"2026-11-10","soil_id":"loam","row_spacing_m":0.05,"emitter_spacing_m":0.05,"emitter_id":"dripnet-pc-2.0","lat":31.25,"lon":34.79}'
  curl -s "localhost:3000/plots/<id>?start_pct=0"
  ```
- **Expected:** a watering window on the bar can be seen (Y16: "blue while watering").
- **Actual:** the 4-minute run gets `width:0.03968%`, about 0.1 px on a 375 px screen. The text list below does say "Tue 06:00 - Tue 06:04, 4 min", so no information is lost, only the bar looks empty. A normal 38-minute run is 0.38 %, about 1 px.
- **Notes:** a 7-day bar of 10,080 minutes cannot show runs under about an hour; no minimum width.

### QA-6 "Today" on the bar, "Tue" in the window text (low, UX)

- **Steps:** `curl -s "localhost:3000/plots/c8f3d1b0-4d2e-5a1b-8b22-1d6e3f702002?start_pct=30"`
- **Expected:** one name for one day on one card.
- **Actual:** day labels "Today | Wed | Thu ...", window text "Tue 06:00 - Wed 06:00, 24 h". The grower has to know that today is Tuesday.

### QA-7 The timeline's button says "Update plan" but only moves the clock times (low, UX)

- **Steps:** open `http://localhost:3000/plots/c8f3d1b0-4d2e-5a1b-8b22-1d6e3f702002?start_pct=30`, change "Start at", press "Update plan".
- **Expected:** a label that says what happens; the plan itself does not change with the start time (Y16: the start time lives only in the frontend).
- **Actual:** the same "Update plan" label as the two pickers above, which do change the plan. Also, the form has no `#timeline` anchor, so after submitting the page reloads at the top and the grower scrolls down again to the last card to see the result (not checked in a browser).

### QA-8 An invalid `start` sticks through the other pickers (low, UX)

- **Steps:** `curl -s "localhost:3000/plots/c8f3d1b0-4d2e-5a1b-8b22-1d6e3f702002?start_pct=30&start=abc" | grep -o 'href="?[^"]*"'`
- **Expected:** A63: an invalid `start` falls back to 06:00 with a note.
- **Actual:** it does, but every soil-level and trigger link and both hidden form fields carry `start=abc` on (`href="?start_pct=100&amp;start=abc"`), so the "not a time (HH:MM)" note keeps appearing after every other choice until the grower submits a time.

## Tried and held

- API (planner, the timeline's source): `run_minutes` is always an integer, rounded up (a 0.12-minute need gives 4 min, never 0 with water due); a capped day is exactly 1440; 24 h cap and litres checked by hand for North block at `start_pct=30` (TAW 175 x 0.7 = 122.5 mm, Dr 85.75 + 2.14 = 87.89, cap 1.0 / (1.5 x 0.4) x 24 = 40 mm, bucket end 74.61, 40,000 L, 1440 min): planner and page agree.
- `start` parameter: `23:59`, `00:00` work; `24:00`, `6:00`, `06:00:00`, empty, space, `abc`, `<script>`, fullwidth digits, `07:00%00` all fall back to 06:00 with the note; `06%3A00` decodes to 06:00; `start[]=07:00` is ignored; repeated `start` takes the first value (note shown if the first is bad); a 20,000-character query gives 431 from Node, no crash.
- Timeline logic: back-to-back capped days (7 x 24 h) give 7 contiguous windows; the bar is cut at the plan's end; no window starts beyond the bar; a plan with no watering shows "No watering in these days." with an empty grey bar.
- Between services: weather, registry and planner each stopped in turn: the page answers 200 in about 0.13 s, the status line shows which one is down, the notice names it ("weather-service is not reachable."), no timeline and no plan of zeros are shown; each recovered after `restart`. A stale forecast gives a plan with every day `stale: true` (FR-2.13).
- Frontend: unknown plot id and non-UUID id with `?start=07:00` give 404; a plot named `<script>alert(1)</script> "q"` plus Hebrew text is escaped on `/` and on the plot page; plot page loads in about 0.7 s.
- UX: the timeline's text list repeats every window, so nothing is only in blue vs grey; the bar has `role="img"` and a label pointing to the list; the time input is labelled "Start at".

## Not checked

- Layout, clicks, keyboard tab order, focus, 375 px width and 200 % zoom: no browser could start (see the header).
- Daylight-saving days (a 24 h run across a clock change): no DST change falls in the plan's 7 days in November for Israel.
- Every endpoint of the three services beyond what feeds the timeline (out of scope for this run).
