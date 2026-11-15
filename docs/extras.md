# Extras

> **NOT PART OF THE REQUIREMENTS.** Everything listed here was built for our own
> learning, testing or measuring, not because a task asked for it. It is kept so we
> know later what we tried, why, and where to find it.

Each entry: what it is, why we made it, where it lives, and how to run it.

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
