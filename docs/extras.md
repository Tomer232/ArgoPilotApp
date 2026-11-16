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
