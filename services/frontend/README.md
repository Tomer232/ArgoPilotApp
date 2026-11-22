# Frontend

The grower's web page for AgroPilot (port 3000). It lists every farm with its plots, and for one plot shows today's answer first ("Water for 38 min" or "No irrigation today"), then the 7-day plan as a watering timeline and a table or chart. Read-only list pages show the rest of the registry (farms, plots, crops, soils, emitters). A status card says whether each of the three services is up. Next.js 16 (App Router), React 19, Tailwind 4 and shadcn/ui components, styled like the P1 registry dashboard.

The browser never calls the services. Every call to `registry-service`, `weather-service` and `planner-service` is made by the Next.js server while it renders the page, fresh on every load (`cache: "no-store"`). The grower's choices (soil level, trigger, start time) live in the page address, so a plain link or GET form changes them and there is no client-side state.

## Run it

Run these from this folder. You need Node.js (v26 is what this was built with) and the three services running: registry on 8000, weather on 8001, planner on 8002. From the repo root, `bash .claude/skills/run-stack/scripts/stack.sh start` starts all four.

```bash
npm install                     # once
cp .env.example .env.local      # the settings file; .env.local is never committed
npm run dev                     # http://localhost:3000
```

Other commands:

```bash
npm run build                   # production build (also type-checks)
npm run start                   # serve the production build on port 3000
npm run lint                    # ESLint
npm test                        # Vitest, for the logic in src/lib
```

**Settings.** All of them are required and live in `.env.local` (the environment wins). If one is missing, the server stops at startup with a line naming it (`src/instrumentation.ts`).

| Variable | Example | Meaning |
| --- | --- | --- |
| `REGISTRY_URL` | `http://127.0.0.1:8000` | Where `registry-service` answers |
| `WEATHER_URL` | `http://127.0.0.1:8001` | Where `weather-service` answers (only its `/health` is called) |
| `PLANNER_URL` | `http://127.0.0.1:8002` | Where `planner-service` answers |
| `REGISTRY_TIMEOUT_SECONDS` | `2` | Wait this long for each registry answer |
| `PLANNER_TIMEOUT_SECONDS` | `20` | Wait this long for a plan. Longer than the planner's own worst case, so its 503 still arrives |
| `HEALTH_TIMEOUT_SECONDS` | `2` | Wait this long for each `/health` |

## Pages

| Address | What it shows |
| --- | --- |
| `/` | Every farm as a card, with its plots: name, crop, area and today's answer; the header counts the plots that need water today (FR-2.15, Y22) |
| `/plots/{id}` | Today's answer, today's soil water as an upright column, the soil-level and trigger pickers; then the 7-day watering timeline (with a "now" line and notes, Y18-Y19) and the days as a table or a chart (FR-2.16, Y24, Y26) |
| `/plots/{id}?start_pct=37.5&trigger_pct=60&start=05:30&view=chart` | The same, with the grower's choices: soil level today (0-100), trigger (1-99), watering start time (HH:MM, default 06:00; "Now" sets the current time), and `view=chart` for the chart (default: table) |
| `/farms`, `/plots`, `/crops`, `/soils`, `/emitters` | Read-only tables from the registry, linked from the sidebar with row counts; a plot row opens its page (Y20, not in the spec) |

What the pages do when something goes wrong:

- **Unknown plot:** `src/proxy.ts` asks the registry before the page renders. A 404 from the registry gives our "Plot not found" page with HTTP 404. Any other answer lets the page render and handle it.
- **A service down or slow:** the page says what could not be done, in the service's own words, for example "planner-service is not reachable." (FR-2.18). With choices in the address, a "Plan with the default choices" link is offered. The status card marks that service down (FR-2.19).
- **Old forecast:** each day calculated from a stale forecast carries an amber "Stale forecast" label, and today's card says when the weather is from (FR-2.17).

## Files

| Path | What it is |
| --- | --- |
| `src/app/layout.tsx` | The shell: sidebar (phone: top bar) with the name and the status card, and the page panel |
| `src/app/page.tsx` | The overview: every farm with its plots |
| `src/app/{farms,plots,crops,soils,emitters}/page.tsx` | The list pages (Y20) |
| `src/app/plots/[id]/page.tsx` | The plot page |
| `src/app/plot-not-found/page.tsx` | Where `proxy.ts` sends an unknown plot, with status 404 |
| `src/proxy.ts` | The unknown-plot check before `/plots/{id}` renders |
| `src/components/` | One file per part of the page (`today-recommendation`, `soil-column`, `week-plan`, `timeline-bar`, `run-list`, `plan-chart`, `plan-controls` with the pickers, the Table/Chart switch and the "Updating" spinner, ...), the navigation (`app-nav`, `mobile-nav`, `plot-switcher`) and the shared `panel`, `pill`, `page-header`, `simple-table` |
| `src/components/ui/` | shadcn/ui components (`button`, `card`, `alert`, `badge`, `input`, `table`, `select`, `sheet`, `separator`, `chart`), added with `npx shadcn add`; `chart` brings `recharts` |
| `src/lib/http.ts` | The only code that sends requests: `getJson` never throws, it returns the data or a Problem that names the service |
| `src/lib/registry.ts`, `planner.ts`, `health.ts` | One function per service call, with the answer's types |
| `src/lib/config.ts` | Reads and checks the settings |
| `src/lib/format.ts`, `timeline.ts`, `plan-query.ts`, `soil-feel.ts` | Display helpers, the timeline's windows and notes, the address with the grower's choices, the soil-feel rows per soil |
| `src/lib/use-now.ts` | The phone's clock on the timeline, read in the browser every minute (Y18) |
| `src/app/globals.css` | The colors: one meaning each (water blue, leaf green, soil brown, stale amber, alarm red) plus the brand green |
