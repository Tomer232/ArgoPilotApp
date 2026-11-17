# TODO: new skills to build (later)

Noted 2026-11-17. Not started. Build each one with `skill-creator`, one at a time, and review it before the next.

## 1. `test` skill: make the section we just built bulletproof

- [ ] Scope: the section we just worked on (the current diff or branch), plus an update to the system-wide test plan based on what was added.
- [ ] Mindset: write tests the way a top senior developer would, covering every aspect: happy path, edge cases, bad input, errors, concurrency, contracts between services, and regressions.
- [ ] Flow: first print a short list of the tests it will add, then write them **without waiting for approval** (an explicit exception to the "ask first" rule in AGENTS.md).
- [ ] Output: new or updated tests in each service's `tests/`, all passing, plus the updated overall test plan.
- Open questions: where the system-wide test plan lives (new `docs/test-plan.md`?); whether frontend tests are in scope (there is no frontend test runner yet).

## 2. `qa` skill: try to break a "complete" section

- [ ] When: run once we call a section complete.
- [ ] Job: try to break what we built and find gaps from every angle: frontend, backend, UX/UI, API, service-to-service, bad data, slow or down upstreams.
- [ ] Output: a findings list (what broke, how to reproduce it, how bad it is). It reports; it does not fix.
- Open questions: does it run the real app (servers plus a browser) or only read code; where findings are saved (`docs/qa/<section>.md`?).

## 3. `requirements` skill: are we inside the FR and NFR?

- [ ] Job: check what we built against the task's FR and NFR (the task file in the course repo, e.g. `tasks/p2.md`).
- [ ] Lists everything built or done that is **out of spec**, and in what form (extra endpoint, extra UI, behaviour change, tooling), cross-checked with `DECISIONS.md` and `docs/extras.md`.
- [ ] Output: one visual page of bullet points (in spec / missing / out of spec), with a diagram where it helps.
- Open questions: output format (HTML page, artifact, or Markdown in `docs/`); whether it should also flag requirements not yet met.

## 4. `run-stack` skill: start the whole system

- [ ] Job: start all four services with the right environment (registry 8000, weather 8001, planner 8002, frontend), check each `/health`, then open the plot page.
- [ ] Use for: "run it", "show me it works", demos. The built-in `run` skill looks for a project skill like this first, and the `qa` skill needs it.
- Open questions: one script that starts everything vs step-by-step commands; how to stop everything cleanly; whether registry runs on SQLite or PostgreSQL by default.

## 5. `submit-task` skill: end-of-task checklist before the PR

- [ ] Job: measure the NFR numbers with the `scripts/` tooling, check that `docs/extras.md` and `docs/judgment-log.md` are up to date, write the PR body, push from WSL through `gh.exe` with the right co-author line.
- [ ] Use for: a course task (P2 and later) that is ready for a PR.
- Overlaps the `requirements` skill (3); it can call it instead of repeating the FR/NFR check.
- Open questions: which NFRs each task needs measured; whether it opens the PR itself or stops at a draft for review.
