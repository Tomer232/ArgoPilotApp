---
name: test
description: Write the tests that make the section we just built bulletproof, then update the whole-system test plan (docs/test-plan.md) and the cross-service e2e suite (tests/e2e). Covers every service (registry, weather, planner) and the frontend's src/lib logic (Vitest). Prints a short list of what it will add and writes it without waiting for approval. Use whenever the user says "test this", "write tests", "/test", "make it bulletproof", "cover this section", "are we tested enough", or finishes a feature or step and wants it locked down, even if they don't say which files.
---

# test

Your job: make the section we just built impossible to break silently, the way the best senior developer you can imagine would. That person doesn't add tests to raise a number. They ask "what would a real user, a bad input, a slow upstream or a future change do to this?" and pin each answer down with a test that fails for exactly one reason.

The owner is interviewed on this code and must be able to explain every test. So each test is small, has a name that reads as a sentence, and a one-line docstring saying what it proves.

## 1. Find the section

Unless the user names a target ("test the timeline"), the section is everything changed on this branch plus uncommitted work:

```bash
git diff --stat main...HEAD     # committed on this branch
git status --short              # uncommitted, including new files
```

When the user names a target, the section is that code plus what it relies on: the modules it imports and the helpers its callers pass its output through (e.g. the timeline plus the `format.ts` functions that display it).

Read the changed code, not only the diff: a changed function's callers and the existing tests around it matter too. Then gather what the code must obey:

- The task's requirements (FR/NFR). The current task file is in the course repo, e.g. `curl -s https://raw.githubusercontent.com/alonitac/OzVeruach26/main/tasks/p2.md`. Find the requirements this section touches.
- `DECISIONS.md`: owner and agent decisions often define the exact behaviour (status codes, rounding, edge rules). A decision with no test is a gap.
- Project skills for the area: `registry-api` (registry endpoints), `irrigation-calc-reference` (any planner number). Load them; they define the expected values.
- The service's README (settings, error codes) and its `tests/helpers.py` and `conftest.py` (reuse fixtures and helpers instead of writing new ones).

## 2. Print the plan, then build

Print a short list (aim for under 12 lines) grouped by file: which behaviours you will test and why each matters. Mark which are e2e. Then **start writing immediately; don't wait for approval.** The owner asked for this skill to work this way; it is a deliberate exception to the "ask first" rule in AGENTS.md. The list is there so they can stop you, not so you wait.

## 3. What to cover

Walk this list for the section. Skip what truly doesn't apply; don't skip what's merely tedious.

- **Each requirement and decision:** one test per rule, named after it (`test_capped_day_uses_24_hour_amount`), with the FR/decision number in the docstring.
- **Boundaries:** the minimum, the maximum, just inside, just outside. Exactly-equal cases (`A62`: equal to the cap is *not* capped) are where bugs hide.
- **Bad input:** wrong type, missing, `null`, empty string, whitespace, very long, unicode and NUL, nan/inf, negative, zero, extra unknown fields, unknown query parameters.
- **Errors:** the exact status and the problem+json `code` (use `assert_problem` where it exists). A wrong 500 is a bug; so is a 200 with nonsense.
- **Upstream failure:** for code that calls another service or provider: timeout, connection refused, 5xx, 404, malformed JSON, right JSON with wrong types or out-of-range values, missing days. Use the existing fakes (`httpx.MockTransport`); service suites never call a real service.
- **Time:** midnight, the last day of a month or year, leap day, the `Time-Zone` header (UTC-12 and UTC+14 extremes), DST changes, a stale forecast. In frontend tests, run date code under several machine zones by setting `process.env.TZ` (e.g. `Pacific/Kiritimati`, `Etc/GMT+12`, `Asia/Jerusalem`) inside the test and restoring it afterwards.
- **Numbers:** rounding (half up, the decimals the response promises), unit conversions, very small and very large values that could turn into 0 or infinity.
- **State and concurrency:** for writes: duplicates (409), delete-while-referenced, two requests at once, PATCH with `{}`. Mark database-specific tests with `@sqlite_only` / `@postgres_only`.
- **Contracts between services:** the fields and types a consumer reads (planner reads registry and weather; the frontend reads all three) must match what the producer really returns. A test that builds a fake from the producer's response model catches drift.
- **Regressions:** every bug fixed in this section gets a test that would have caught it.

Good tests: one behaviour each; arrange-act-assert; exact expected values computed by hand (and the calculation in a comment when it's not obvious), never copied from the code's output; no sleeps; no dependence on test order or today's real date (inject or freeze the clock as the existing tests do). Don't test private helpers when the public behaviour covers them, and don't mock the thing you're testing.

## 4. Where tests go

| Area | Location | Run |
| --- | --- | --- |
| registry / weather / planner | `services/<service>/tests/test_*.py` (extend the right file) | `uv run pytest` in the service folder |
| frontend logic | `services/frontend/src/lib/<module>.test.ts` (Vitest) | `npm test` in `services/frontend` |
| across services | `tests/e2e/test_*.py` at the repo root | `uv run pytest` in `tests/e2e`, with the stack running |

Only pure logic in `src/lib` gets frontend tests; pages and clicks belong to the `qa` skill. When real logic (calculations, clipping, text building) sits in private functions inside a component, don't test the component: list it under **Gaps left** and suggest moving it into `src/lib`. Moving it is a production change, so it's the owner's call.

**Setup** (Vitest is already set up in `services/frontend`: `npm test`, config in `vitest.config.mts`, Vitest 4 because Vitest 5 needs `@types/node` 22+ and the frontend pins 20). Only if something is missing:
- Vitest: `npm install -D vitest@^4`, add `"test": "vitest run"` to `package.json` scripts, and a `vitest.config.mts` (`.mts`, since `package.json` has no `"type": "module"`) that maps `@/` to `./src` and includes `src/**/*.test.ts`.
- e2e: copy `references/e2e-setup.md`'s files into `tests/e2e/`.
- Any first-time setup is tooling outside the requirements: add an entry to `docs/extras.md` (what, why, where, run), as AGENTS.md asks.

**e2e rules.** e2e runs against the real services started by the `run-stack` skill (`bash .claude/skills/run-stack/scripts/stack.sh start`), and that registry is the real `registry` database. So e2e tests only create their own rows (names start with `e2e-`), delete them afterwards, and never change or delete seed rows. Keep e2e few and about the *flow* (create a plot in the registry, the planner plans it, the frontend page renders it); edge cases belong in the service suites. The suite skips itself when the stack is down. If the stack isn't running, start it with `run-stack`; if that fails, pass on its message and run only the service suites.

## 5. Run everything you touched

Run every suite you added to, the whole suite, not just the new tests (`bash .claude/skills/test/scripts/run-all.sh` runs all of them at once). On PostgreSQL too when you touched registry database code and `TEST_DATABASE_URL` is set (never point it at `registry`).

All green is the goal, with one exception: **when a new test exposes a real bug in the code, don't fix the code.** Keep the failing test as it is (no `xfail`, no skip), and stop to report it. The owner decides the fix. Do fix your own mistakes: a test that fails because the test is wrong gets corrected.

## 6. Update the test plan

`docs/test-plan.md` is the map of the whole system's tests. Create it from `references/test-plan-template.md` if missing, filling in only the area you tested; for the others list the existing test files and write "not reviewed by the test skill yet" (no full audit of code you weren't asked to test). Otherwise update only the parts this section changed: what is covered and where, the e2e flows, and the **Known gaps** list (add what you saw but didn't cover, remove what you just covered). Keep it short: a reader should see in a minute what's protected and what isn't.

## 7. Report

Other sessions may edit the repo while you work. Before reporting, run `git status --short` again: list only files you changed, and if your target changed under you, check whether your tests still match it.

End with:

- **Plan:** the list from step 2 (repeated here, since a caller may see only the report).
- **Added:** per file, how many tests and what they cover (one line each).
- **Results:** each suite's command and pass/fail counts, quoted from the real output.
- **Bugs found:** for each, the failing test, the failing output (short), and what the code does vs what the requirement says. Or "none".
- **Setup done:** Vitest or e2e set up for the first time, if so.
- **Gaps left:** what's still untested and why.

Don't commit; the owner reviews first.
