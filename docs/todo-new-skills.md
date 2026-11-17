# New skills (done)

Noted 2026-11-17 and built the same day, one at a time with an owner review between each, in the order run-stack, test, qa, requirements, submit-task (DECISIONS O92). Each lives in `.claude/skills/<name>/` and has an entry in `docs/extras.md`.

## 1. `test` skill: make the section we just built bulletproof

- [x] Scope: the branch since `main` plus uncommitted work, or a target the owner names, plus an update to the system-wide test plan.
- [x] Prints a short plan, then writes the tests without waiting for approval. Tests that expose a bug stay failing and are reported, not fixed.
- [x] Output: tests in each service's `tests/`, frontend `src/lib/*.test.ts` (Vitest 4), a cross-service `tests/e2e` suite, and `docs/test-plan.md`.
- Answered: the plan lives in `docs/test-plan.md`; frontend logic is tested in `src/lib` (O94, O95).
- Tested: first run covered the timeline and format helpers (63 tests at the time).

## 2. `qa` skill: try to break a "complete" section

- [x] Runs the real system on the throwaway `registry_qa` database (`run-stack start qa`), as a hostile tester, a grower and a flaky network.
- [x] Reports to `docs/qa/<date>-<section>.md` with steps to reproduce and a severity; fixes nothing.
- Answered: real stack, browser if one can reach localhost, else server HTML via curl (O100, A67).
- Tested: first run on the watering timeline found QA-1 to QA-8. QA-1 and QA-2 are fixed (O99, FR-2.17); QA-3 and QA-4 are decided (Y18, Y19) with code waiting for the frontend redesign; QA-5 to QA-8 are open.

## 3. `requirements` skill: are we inside the FR and NFR?

- [x] Every FR/NFR of the current task gets met / partly / not met / can't tell, with evidence; everything out of spec is listed with its form and where it is recorded.
- [x] Output: one self-contained HTML page in `docs/requirements/<date>-<task>.html`, with a diagram when it helps.
- Answered: HTML in the repo, coverage with evidence, static checks only (O101). It notes uncommitted work and never runs `npm run build`.
- Tested: first run on P2 (`docs/requirements/2026-11-17-p2.html`): 33 met, 4 partly, 2 not met, 2 can't tell; 2 unrecorded extras.

## 4. `run-stack` skill: start the whole system

- [x] One script, `scripts/stack.sh`: `start [qa] | stop [service] | restart <service> | status`; waits for each service and prints the links.
- Answered: one bundled script; registry on PostgreSQL by default, checked without reading `.env` (O93, A64).
- Tested: used by every QA run and stop/restart of single services.

## 5. `submit-task` skill: end-of-task checklist before the PR

- [x] Stops on uncommitted work; runs build, lint, all tests and `requirements`, and asks before going on past a gap; reuses README NFR numbers and re-measures only stale ones; lists judgment-log candidates for the owner to word; drafts the PR body in `docs/pr/<task>.md`.
- [x] Pushes and opens the PR with the Windows `gh.exe` only after the owner's go.
- Answered: draft then ask; reuse or re-measure; warn and ask; stop on a dirty tree (O102).
- Tested only in parts (the stale-number check, `gh.exe` access). Its first full run is the P2 PR.

## Before the P2 PR

- [ ] The other session's frontend redesign is committed, and its extra pages are recorded or removed.
- [ ] The registry `.env` points at the `registry` PostgreSQL database, so NFR-2.2 can be re-measured (its number is older than 3 registry code commits).
- [ ] Y18 and Y19 built (timeline "now" line and notes).
- [ ] NFR-2.8 checked at 375 px in the browser.
- [ ] Then `/submit-task`.
