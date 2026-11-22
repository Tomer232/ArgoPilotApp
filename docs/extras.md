# Extras

> **NOT PART OF THE REQUIREMENTS.** Everything listed here was built for our own
> learning, testing or measuring, not because a task asked for it. It is kept so we
> know later what we tried, why, and where to find it.

Each entry: what it is, why we made it, where it lives, and how to run it.

## Measurement scripts (P1)

- **What:** `measure_latency.py` measures NFR-1.1 (p95 of every GET at 10 req/s). `hammer.py` pushes rate, table size and a read/write mix until p95 passes 100 ms.
- **Why:** to show NFR-1.1 holds with numbers, and to find where it breaks. `hammer.py` found the ~13,000-plot limit (DECISIONS O48, still open). P2 needs the same kind of numbers (NFR-2.2, NFR-2.3).
- **Where:** `services/registry-service/scripts/`, on `main` (DECISIONS Y12).
- **Run:** from `services/registry-service`. For `measure_latency.py`, start the service first (`uv run uvicorn main:app --port 8000`), then `uv run python scripts/measure_latency.py`. `uv run python scripts/hammer.py` starts its own servers and scratch databases (about 15 minutes; `--only rate|size|mixed` for one test).

## Weather latency script (P2)

- **What:** `measure_latency.py` measures NFR-2.3 (p95 of a fresh forecast at 10 req/s). It fails the run if any measured request called the provider.
- **Why:** to show NFR-2.3 holds with a number (p95 5.7 ms, in the service README).
- **Where:** `services/weather-service/scripts/` (DECISIONS Y12).
- **Run:** from `services/weather-service`, start the service (`uv run uvicorn main:app --port 8001`), then `uv run python scripts/measure_latency.py`.

## Ollama terminal agent (lesson 12)

- **What:** a 47-line chat agent: `qwen3:1.7b` on Ollama, with one tool, `current_date()`.
- **Why:** lesson 12 exercise, to see the agent loop (model asks for a tool, we run it, send the result back).
- **Where:** `experiments/ollama-agent/agent.py`, on `main`.
- **Run:** start Ollama, then `uv run experiments/ollama-agent/agent.py`. Type `exit` to quit.

## `POST /v1/irrigation/volume` (lesson 12)

- **What:** a registry endpoint: `{area_m2, depth_mm}` in, `{volume_liters}` out (DECISIONS O52).
- **Why:** the lesson 12 test prompt for the rule file `.claude/rules/registry-service.md`, and then the code for trying `/code-review`.
- **Where:** branch `exp/irrigation-volume` only. **Never merged**: it would add an unlisted endpoint to the registry, and in P2 irrigation math belongs in the planner.
- **What we learned:** the agent followed the rule but read `gt=0` as "bounded". `/code-review` found that huge inputs returned `200 {"volume_liters": null}` and tiny ones `0.0`. We fixed it with realistic ranges, and sharpened the rule to "a realistic minimum **and** maximum".
- **Run:** `git switch exp/irrigation-volume`, then start the registry and `curl -X POST localhost:8000/v1/irrigation/volume -H 'Content-Type: application/json' -d '{"area_m2": 100, "depth_mm": 5}'`.

## `registry-api` skill (lesson 13)

- **What:** a project skill with our API conventions: `/v1` routes, JSON-array lists, only the spec's fields, PATCH sends only changed fields, problem+json errors with stable codes (405 has none on purpose), tests for every outcome, `uv run pytest` before "done", ask when the spec is silent.
- **Why:** lesson 13 exercise, written with `/skill-creator`, so every agent that touches an endpoint follows the same conventions without being told.
- **Where:** `.claude/skills/registry-api/SKILL.md`. Eval runs go in `.claude/skills/registry-api-workspace/` (not committed).
- **Run:** loads on its own when an agent works on a registry endpoint, or type `/registry-api`.

## `run-stack` skill (P2)

- **What:** a project skill with one script that starts the whole system (registry 8000 on PostgreSQL, weather 8001, planner 8002, frontend 3000), waits for each, checks the registry really reaches PostgreSQL, and prints the links; also `status` and `stop`.
- **Why:** every run, demo and QA pass starts the four services the same way, instead of four terminals typed by hand (DECISIONS O92, O93, A64).
- **Where:** `.claude/skills/run-stack/`. Logs and process ids in `/tmp/agropilot-stack/`.
- **Run:** from the repo root, `bash .claude/skills/run-stack/scripts/stack.sh start` (or `status`, `stop`), or ask Claude to "run the app".

## Frontend unit tests (P2)

- **What:** Vitest for the pure logic in `services/frontend/src/lib` (first suites: `timeline.test.ts`, `format.test.ts`), set up by the `test` skill.
- **Why:** the watering timeline's windows and dates (Y16, A63) are easy to break silently; the pages show the result, not the rule.
- **Where:** `services/frontend/vitest.config.mts`, the `test` script and the `vitest` dev dependency in `package.json` (Vitest 4: Vitest 5 needs `@types/node` 22+, and the frontend pins ^20).
- **Run:** from `services/frontend`, `npm test`.

## `test` and `qa` skills, QA mode (P2)

- **What:** `test` writes the tests for a section and keeps `docs/test-plan.md`; `qa` tries to break a finished section through the running system and writes a report to `docs/qa/`. `run-stack start qa` runs the registry on the throwaway database `registry_qa`.
- **Why:** to find gaps before the reviewer does, without risking the real `registry` data (DECISIONS O94, O100, A67). The first QA run found the bucket going below empty (QA-1).
- **Where:** `.claude/skills/test/`, `.claude/skills/qa/`, `.claude/skills/run-stack/scripts/reset_qa_db.py`; reports in `docs/qa/`.
- **Run:** ask Claude to "test this" or "QA this", or `/test`, `/qa`. QA mode needs `registry_qa` created once and its password in `~/.pgpass` (see the run-stack skill).

## `requirements` skill (P2)

- **What:** a project skill that checks the build against the task's FR/NFR (status and evidence for each) and lists what we built outside the spec, with its form and where it is recorded.
- **Why:** the task says to build only what the spec lists; this shows both gaps and extras on one page before a PR (DECISIONS O101).
- **Where:** `.claude/skills/requirements/` (the page template is in `references/`); its reports go to `docs/requirements/<date>-<task>.html`.
- **Run:** ask Claude Code "/requirements" or "are we in spec?".

## `submit-task` skill (P2)

- **What:** a project skill for the end of a course task: clean-tree check, build, lint, tests, the `requirements` page, NFR numbers (re-measured when stale), judgment-log candidates, and the PR body; it pushes and opens the PR only after the owner's go.
- **Why:** the PR is what gets graded; this makes every number and claim in it checked (DECISIONS O102).
- **Where:** `.claude/skills/submit-task/` (PR body template in `references/`); the body goes to `docs/pr/<task>.md`.
- **Run:** ask Claude Code "/submit-task" or "prepare the PR".

## Frontend extras (P2)

- **What:** a "Table / Chart" switch for the plot page's 7 days (Y26, adds `recharts`); five read-only list pages (`/farms`, `/plots`, `/crops`, `/soils`, `/emitters`) linked from the sidebar with row counts; a plot dropdown in the plot page's title; today's answer for every plot on the home page, with "N of M plots need water today".
- **Why:** the grower should see the whole registry from the app (DECISIONS Y20-Y22). The frontend prompt says "No other pages or features"; the lecturer allows functionality we see fit and need, within reason, so these are a recorded, small deviation.
- **Where:** `services/frontend/src/app/{farms,plots,crops,soils,emitters}/page.tsx`, `src/components/app-nav.tsx`, `list-page.tsx`, `simple-table.tsx`, `plot-switcher.tsx`; the home summary in `src/app/page.tsx`; the chart in `src/components/plan-chart.tsx` and `src/components/ui/chart.tsx`.
- **Run:** start the stack, open http://localhost:3000 and use the sidebar, or the plot name on a plot page.

## VS Code debug launcher (P1)

- **What:** one launch configuration that starts registry-service under the Python debugger (uvicorn on 127.0.0.1:8000).
- **Why:** to step through a request in VS Code; it has been tracked since the first commit and changes nothing in the product.
- **Where:** `.vscode/launch.json`.
- **Run:** VS Code, Run and Debug, "registry-service".
