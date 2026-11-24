# QA: frontend changes since 2026-11-18 (plot cards and maps, overview headline, plan chart axis, production 404, upstream reason)

Date: 2026-11-24. Branch: main at 5321464, plus uncommitted work: yes (tests and docs only, no app code).
Stack: QA mode (`registry_qa`), frontend under `next dev` on 3000. The production 404 (O116) and the registry-list failures were checked on a separate copy of the frontend, built with `next build` and run with `next start` on port 3010 (in the scratchpad, stopped afterwards). Faults were injected with a small forwarding proxy put in front of the registry (8090), the provider (8091) or weather (8092). Browser: none (the Playwright headless shell on this machine lacks `libnspr4.so`): HTML only, layout and clicks not checked.

Section: Y36/Y37/O134 (plot cards with OSM maps on `/` and `/plots`), O105/O125 (overview headline), O131 (chart axis and full-bucket line), O116 (production 404), O127 (planner passes the upstream `detail`).

## Summary

| Severity | Count |
| --- | --- |
| critical | 0 |
| high | 0 |
| medium | 1 |
| low | 6 |

Top findings: the overview drops every plot and blames "the farms" when only the crop list fails, while `/plots` still shows them (QA-1); a card for a capped day reads like any normal "Water today", though 24 h of drip leaves the soil below the trigger (QA-3); the planner passes any upstream `detail` through unbounded, so a 20,000-character detail fills the overview 30 times and a detail ending in "." shows ".." (QA-2).

`fault.py` in the steps is a throwaway 25-line forwarder (`python3 fault.py <port> <target> <mode.json>`): it forwards every GET to the target, unless `mode.json` names a path prefix, which then gets the canned `status` and `body` (or a `sleep` in seconds first). It was kept in the session's scratchpad, not in the repo.

## Findings

### QA-1 The overview fails whole when only the crop names fail, and says "the farms" can't be loaded (medium, UI)

**Status: fixed** (DECISIONS O135): the overview needs only farms and plots; with the crop list failing the cards show the crop id, as on `/plots`. Headline in `src/lib/overview.ts`, tested in `overview.test.ts`.

- **Steps:**
  ```bash
  # a proxy in front of the registry that answers 503 on /v1/crops only, everything else forwarded
  python3 fault.py 8090 http://127.0.0.1:8000 mode.json   # mode.json: {"paths":["/v1/crops"],"status":503,"body":"{\"detail\":\"Database unavailable\"}"}
  cd <copy of services/frontend> && REGISTRY_URL=http://127.0.0.1:8090 npx next start -p 3010
  curl -s localhost:3010/        # overview
  curl -s localhost:3010/plots   # plot list
  ```
- **Expected:** FR-2.15/FR-2.16: today's answers are still shown when the plots and plans are available; FR-2.18: the message says what really failed. `/plots` already treats crop names as a nice-to-have and falls back to the id.
- **Actual:** `/` shows only "The farms can't be loaded right now / Database unavailable." and no cards, though farms, plots and every plan were available. `/plots` at the same moment shows all 51 cards with "Crop tomato" (the id). The overview requires `crops` in `if (!farms.ok || !plots.ok || !crops.ok)` (`src/app/page.tsx`), and the title names the farms whatever failed.
- **Notes:** a crop list failing alone is rare (same database), so the impact is small, but the two pages disagree on the same failure and the overview's title is wrong.

### QA-2 The planner passes an upstream `detail` through unbounded; a trailing period shows "..", (low, services)

**Status: fixed** (DECISIONS O136): the planner cuts a detail after 200 characters plus "..." (`test_a_very_long_upstream_reason_is_cut_to_200_characters`); the pages end it with one full stop (`asSentence`, `format.test.ts`).

- **Steps:**
  ```bash
  python3 fault.py 8090 http://127.0.0.1:8000 mode.json
  bash .claude/skills/run-stack/scripts/stack.sh stop planner
  REGISTRY_URL=http://127.0.0.1:8090 bash .claude/skills/run-stack/scripts/stack.sh restart planner
  # mode.json: soils answer 503 with detail = "A" * 20000
  curl -s localhost:8002/v1/plots/c8f3d1b0-4d2e-5a1b-8b22-1d6e3f702002/plan | wc -c
  curl -s -o r.html -w "%{size_download}\n" localhost:3000/
  # mode.json: soils answer 503 with detail "Database unavailable."
  curl -s localhost:3000/ ; curl -s localhost:3000/plots/c8f3d1b0-4d2e-5a1b-8b22-1d6e3f702002
  ```
- **Expected:** O127: the grower sees what happened, in a sentence. The planner checks every upstream answer before using it (`upstream.py` docstring).
- **Actual:** the planner's 503 is 20,125 bytes; the overview grows to 814,449 bytes with the 20,000 A's in it 30 times (headline, each card, the RSC payload); the text wraps (O107), so the layout holds. With "Database unavailable." the headline reads "No plan right now: registry-service: Database unavailable.." and the plot page "registry-service: Database unavailable.." (`ProblemNotice` and `todaySummary` add a period). Newlines and a right-to-left override (U+202E) in the detail are passed through too; `<script>` is escaped and never runs.
- **Notes:** our own registry and weather never send a detail ending in "." or longer than a line today, so this needs a broken or changed upstream. No fix suggested.

### QA-3 A card for a capped day looks like a normal "Water today" (low, UX)

**Status: fixed** (DECISIONS O137): a capped day's card adds "Most in 24 h: the soil ends the day below full".

- **Steps:**
  ```bash
  # a plot whose drip gives only 0.02 mm/h (O132 allows it)
  curl -s -X POST localhost:8000/v1/plots -H 'Content-Type: application/json' -d '{"farm_id":"b7e2c0a0-3c1d-4f0a-9a11-0c5d2e6f1001","name":"Tiny","area_m2":1,"crop_id":"tomato","planting_date":"2026-03-01","soil_id":"loam","row_spacing_m":10,"emitter_spacing_m":5,"emitter_id":"dripnet-pc-1.0","lat":31.25,"lon":34.79}'
  # a fake weather in front of the planner (8092) answering 7 days of ET0 80 mm; then open the overview
  curl -s localhost:3000/
  ```
- **Expected:** the overview card is the grower's answer for the day (Y36). O110: a capped day means the drip runs all 24 hours and the soil still ends the day below full.
- **Actual:** the card shows the blue "Water today" pill and "Water 24 h / 0.5 L", like any normal day. The planner says `capped: true`, `bucket_end_mm: 58.98` below `trigger_mm: 61.25`. Only the plot page says "That is the most the drip system gives in 24 hours, so the soil en[ds below full]".
- **Notes:** with real weather this needs a very slow drip or a very large deficit; "24 h" is a hint, but nothing on the card says the soil stays dry after it.

### QA-4 The chart's mm axis does not have round ticks for usual bucket sizes (low, UI)

**Status: fixed** (DECISIONS O138): round steps from `mmAxis` (`src/lib/chart-axis.ts`): the seed plot's axis is 0, 25, 50, 75, 100, 125 mm (`chart-axis.test.ts`).

- **Steps:**
  ```bash
  cd services/frontend
  node -e 'const {getNiceTickValues}=require("./node_modules/recharts/lib/util/scale/getNiceTickValues.js"); for (const taw of [61.25,122.5,175,210]) { const top=Math.ceil(taw/20)*20; console.log(taw, top, getNiceTickValues([0,top],5,true)); }'
  ```
  Then open http://localhost:3000/plots/c8f3d1b0-4d2e-5a1b-8b22-1d6e3f702002?view=chart (North block, TAW 122.5 mm).
- **Expected:** O131 and `axisTop` in `plan-chart.tsx`: the top is "rounded up to a multiple of 20 so the ticks are round".
- **Actual:** Recharts' 5 ticks for the seed plot are 0, 35, 70, 105, 140 mm; for TAW 175: 0, 45, 90, 135, 180; for 210: 0, 55, 110, 165, 220. Round only when the top happens to be a multiple of 80 (e.g. 80: 0, 20, 40, 60, 80).
- **Notes:** computed with Recharts' own tick function (3.8.0), not seen on screen (no browser). Cosmetic; the unit and the full line are right.

### QA-5 Screen reader: every card link is "Open plan", and the map credit link is inside `role="img"` (low, UI)

**Status: fixed** (DECISIONS O139): the link reads "Open plan for North block" to a screen reader (checked in the overview's HTML); the OSM credit is outside `role="img"` and a larger target.

- **Steps:** `curl -s localhost:3000/ | grep -o '<a[^>]*href="/plots/[^"]*"[^>]*>[^<]*'` and look at the map `div`.
- **Expected:** each link can be told apart out of context (WCAG 2.4.4); no focusable element inside an element whose children are presentational (`role="img"`).
- **Actual:** with 51 plots the overview has 51 links named "Open plan" (the plot name is not in the link). The "© OpenStreetMap" link sits inside `<div role="img" aria-label="Map of the area around ...">`: it can be focused with Tab, but screen readers drop it with the image's children. On a phone it is a 10 px text target in the map's corner, right next to the whole-card link, so a tap there opens OSM in a new tab instead of the plot.
- **Notes:** from the markup only.

### QA-6 `/plots` shows a raw farm UUID when the farm list fails (low, UI)

**Status: fixed** (DECISIONS O140): the farm line is left out when the farm list fails.

- **Steps:** as QA-1, with `mode.json` failing `/v1/farms`; `curl -s localhost:3010/plots`.
- **Expected:** words the grower understands (FR-2.18).
- **Actual:** under each plot name: "North block / b7e2c0a0-3c1d-4f0a-9a11-0c5d2e6f1001". (The overview, same failure, says "The farms can't be loaded right now".)
- **Notes:** the fallback to the id is written on purpose (`farmNames.get(...) ?? plot.farm_id`); listed so the owner can choose between the id and leaving the line out.

### QA-7 While the weather provider is down, every overview load takes about 7.6 s (low, NFR)

**Status: closed, won't fix** (DECISIONS O141).

- **Steps:**
  ```bash
  python3 fault.py 8091 https://api.open-meteo.com pmode.json      # forwarding at first
  bash .claude/skills/run-stack/scripts/stack.sh stop weather
  PROVIDER_BASE_URL=http://127.0.0.1:8091/v1/forecast FRESH_HOURS=0.005 bash .claude/skills/run-stack/scripts/stack.sh restart weather
  curl -s -o /dev/null -w "%{time_total}\n" localhost:3000/          # 1.0 s
  # switch pmode.json to {"paths":["/v1/forecast"],"status":503,"body":"{}"}, wait 22 s
  curl -s -o /dev/null -w "%{time_total}\n" localhost:3000/          # 7.6 s, again 7.7 s, 7.6 s
  ```
- **Expected:** no page-time NFR exists (O128); stale forecasts are shown (FR-2.13, FR-2.17), which they are.
- **Actual:** 7.65 s, 7.74 s and 7.57 s on three loads in a row (14 plots, 6 weather cells); the plot page 1.4 s. Normal is 0.9 s. Weather tries the provider again (with retries and pauses) for every cell on every request, because it does not remember that the provider just failed.
- **Notes:** outside the frontend; listed because a grower in a provider outage waits this long on every open. The stale labels themselves were right (see Tried and held).

## Tried and held

- Cards and maps (Y36, Y37, O134): plot names `<script>alert(1)</script>`, `"><img src=x onerror=alert(2)>`, Hebrew, a 200-character unbroken word and a farm named `<b>Empty</b> farm` with RTL marks are all escaped in the HTML, in the map's `aria-label` and in the RSC payload; nothing runs. The map centres on the plot: North block's 6 tiles (19549-19551 x 13386-13387 at zoom 15) cover -426..342 px across and -266..246 px down, more than the 640 x 160 box. Lat 90 and -90 give one row (row 0 and row 32767, nothing outside the world); lon 180 and -180 wrap to columns 32766, 32767, 0, 1 with unique keys; coordinates read "90.00° S, 0.00° E", "0.00° N, 180.00° W". Tile URLs answer 200. With 51 plots the overview has 306 lazy `img`s for 36 distinct tiles. Status pill, Today box and details agree on every card; farm with no plots says "0 plots / No plots on this farm yet."; `/plots` names the farm on each card.
- Overview headline (O105, O125): all plans: "0 of 14 plots need water today, with the default choices."; all with water: "15 of 15 plots need water today"; one failed: "0 of 13 plots need water today, with the default choices. 1 plot has no plan right now: registry-service: Database unavailable."; two failed: "2 plots have no plan right now"; none (weather or planner down): "No plan right now: weather-service is not reachable." / "planner-service is not reachable." Never "0 of N" above failed cards.
- Upstream reason (O127): registry 503 with detail gives "registry-service: Database unavailable" on the cards, the headline and the plot page; HTML 500, blank detail, an array body and a list `detail` fall back to "answered with status N"; a 410 on the plot gives "registry-service: Gone"; a slow registry gives "registry-service did not answer in time".
- Production 404 (O116), on `next start` and on `next dev`: unknown UUID, `not-a-uuid`, `%20`, `..%2f..%2fv1%2ffarms`, `/plots/<id>/extra`, `/plot-not-found`, `/plots/plot-not-found` and `/nope` all answer 404 with "Not found / There is no plot or page at this address" and `noindex`; HEAD is 404 too; an uppercase UUID of a real plot is 200; a trailing slash is a 308; `/plots/%2e%2e` normalises to the overview. With the registry slow or answering 503 for the plot, the page renders 200 with the planner's reason (the designed fallback), in about 4 s when slow.
- Between services: weather, planner and registry each stopped: every page answers 200 in under 0.6 s, the status line names the service, cards say "No plan / Plan unavailable" with the reason, the overview and `/plots` say "can't be loaded" when the registry is down; all recover after `restart`. Soil list down: cards show the soil id, plans stay.
- Stale forecast (FR-2.17): with the provider failing, every card shows the "Stale forecast" pill and "From an older weather update" under the answer, on `/` and `/plots`; the plot page keeps its stale label; gone again on the real provider.
- End-to-end number (irrigation-calc-reference): "Young sand" (sand 83 mm/m, tomato initial, 2,500 m², rows 1.5 m, emitters 0.4 m, 1.0 L/h) with ET0 30: need 0.6 x 30 = 18 mm > TAW 17.79, so Dr = TAW and irrigation = 17.7857 mm (unrounded TAW); litres 17.7857 x 2,500 = 44,464.3; run = ceil(17.7857 x 1.5 x 0.4 / 1.0 x 60) = 641 min. The planner, the card ("Water 10 h 41 min, 44,464 L") and the plot page ("Water for 10 h 41 min, 44,464 L, 17.79 mm") agree. ET0 12, day 2: Dr carried 7.2 + 7.2 = 14.4 mm irrigated into a grown 18.38 mm bucket (step 7: new soil is full), 36,000 L, 519 min: matches.
- Load: 51 plots: overview 1.9 s, `/plots` 2.0 s (O128 accepts this).

## Not checked

- No browser: the cards' layout at 375 px, 768 px and 1280 px, the tiles actually drawing, the grey fallback when tiles fail, the chart's dotted full-bucket line and "mm" ticks on screen, keyboard order, and zoom 200%. From the code: the card is `overflow-hidden` and its "Open plan" link touches the card's left, right and bottom edges with no focus style of its own, so the browser's focus outline may be clipped to its top edge only; worth a look in a real browser.
- Colour without colour: the pills carry words ("Water today", "Soil OK", "Stale forecast", "No plan"), so the answer is not only in colour; the chart lines were not seen.
- The "Water today" card with real weather: in late November every plot's default plan (start 100%) is "No irrigation", so the water state was reached only with a fake weather in front of the planner.
- `next dev` and `next start` were compared for the 404 only; the other pages were checked under `next dev`.
