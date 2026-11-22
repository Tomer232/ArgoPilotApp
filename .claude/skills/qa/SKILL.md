---
name: qa
description: Try to break a section we consider complete, the way a hostile tester, a confused grower and a flaky network would, across the API, the frontend pages, UX/UI, service-to-service calls and failure of each service. Runs the real system on the throwaway registry_qa database, reports every gap with steps to reproduce in docs/qa/, and fixes nothing. Use whenever the user says "QA this", "/qa", "try to break it", "find the gaps", "is this section done", "check it before the PR", or calls a section complete, even if they only say "look for problems".
context: fork
agent: general-purpose
---

# qa

The section is "complete", and your job is to prove it isn't. Think like three people at once:

- **A hostile tester** who sends every value the spec didn't think of, in every place a value goes.
- **A grower** who has never seen this app, on a phone, in a field, who reads the screen literally and gives up when it doesn't make sense.
- **The network**, which loses services, answers slowly and returns garbage.

You report; you don't fix. Every finding is something the owner decides about. A finding without steps to reproduce is a rumour: always give the exact request or clicks.

## 1. Scope and requirements

The section is everything changed on this branch plus uncommitted work (`git diff --stat main...HEAD`, `git status --short`), unless the user names one. Test the section through the **whole running system**, not just its own files: a planner change can break a frontend page. When the branch is large (a whole task's worth of services and pages) and the user named nothing, QA the most recently changed feature and name it in the report's header (you run as a background sub-agent and can't ask; the owner can run you again on another part); a run that tries to cover everything covers nothing deeply.

Before attacking, collect what "correct" means:

- The task file's FR/NFR (e.g. `curl -s https://raw.githubusercontent.com/alonitac/OzVeruach26/main/tasks/p2.md`).
- `DECISIONS.md` (the owner's exact rules), the services' READMEs (error codes, settings), and the project skills (`registry-api`, `irrigation-calc-reference` for any irrigation number).
- `docs/test-plan.md`'s **Known gaps**: untested areas are where bugs live, so start there.

## 2. Start the system in QA mode

```bash
bash .claude/skills/run-stack/scripts/stack.sh status    # anything running?
bash .claude/skills/run-stack/scripts/stack.sh start qa  # fresh registry_qa, all four services
```

If the stack already runs in qa mode, `stop` it and `start qa` again so you begin on a freshly seeded database. If services are already running in normal mode and this session didn't start them, don't stop them: someone may be using them. End the run with a one-line message saying the stack must be stopped first, and the owner will run you again. If `start qa` fails (no `registry_qa`, PostgreSQL down), pass its message on and stop: never run QA against the real `registry` database.

## 3. Attack

First create the report file (`mkdir -p docs/qa`, then `docs/qa/<YYYY-MM-DD>-<section>.md` from `references/report-template.md`), and add each finding and each attack that held to it as you go, not from memory at the end. Then work through each area below for the section, and keep going after the first bug.

Helper processes you start (a proxy, a load loop): save their PID and stop them by it. Never `pkill -f` a pattern; it can match your own shell.

**API** (registry 8000, weather 8001, planner 8002; use `curl -i` so you see status and headers):
- Every field: missing, `null`, wrong type, empty, whitespace, 10,000 characters, unicode, emoji, NUL, `<script>`, nan/inf, negative, zero, huge, just past each limit.
- Ids: not a UUID, uppercase UUID, unknown UUID, `../`, URL-encoded junk.
- Protocol: wrong method, wrong or missing `Content-Type`, broken JSON, an empty body, a body on GET, unknown query parameters, repeated parameters, a huge body.
- Every error must be problem+json with the right status and `code`. Any 500, traceback, or a 200 with nonsense is a finding.
- State: create twice (409?), delete what something points to, PATCH with `{}` and with `null`, two writes at once (`&` in the shell, or a short Python loop).

**Between services:**
- Stop one service and use the rest: `stack.sh stop weather`, then ask the planner for a plan and open the plot page; then `stack.sh restart weather`. Do the same for the registry and the planner. The rest must say clearly what is down, never show a wrong plan or a blank page, and recover when the service is back.
- A stale forecast (FR-2.13, FR-2.17). The weather cache lives in memory, so restarting weather empties it. Use a small local proxy in front of the real provider that you can switch to failing: `PROVIDER_BASE_URL=http://127.0.0.1:<proxy port>/v1/forecast FRESH_HOURS=0.005 bash .claude/skills/run-stack/scripts/stack.sh restart weather` (restart passes the shell's environment on), load the plan once, switch the proxy to fail, wait about 20 s, and load again: the forecast is now stale. Restart weather without the variables afterwards.
- Data the consumer can't handle: a plot with extreme but valid values (tiny area, huge flow, planting date far in the past) created in the registry, then planned and shown.
- One irrigation number checked by hand against `irrigation-calc-reference`, end to end: registry values in, planner number out, frontend shows the same.

**Frontend pages** (http://localhost:3000). Use a real browser only if this session has browser tools that can reach localhost; drive it and take a screenshot of each problem. Otherwise, which is the usual case, fetch pages with `curl` and check the server-rendered HTML, and list layout, clicks, keyboard, narrow screens and zoom under "Not checked". Don't spend time hunting for a browser.
- Every page, then odd addresses: unknown plot id, a non-UUID id, bad and repeated query values for each picker, a very long query string.
- Forms: empty, out-of-range and pasted values; submit twice; the back button.
- Names with `<script>alert(1)</script>`, `"`, RTL text and very long words, created through the API and then shown: nothing may execute, and the layout must not break.
- A 375 px wide screen, keyboard only (tab order, visible focus), zoom 200%, and the colours without colour (is information only in blue vs grey?).
- Empty states, the error and stale notices, and the loading time of each page.

**UX** (as the grower):
- Can you tell what to do today, and why, in five seconds?
- Are units, dates and times unambiguous?
- Does anything on screen contradict something else?
- Is any word our model's jargon instead of the field's language?
- Is there any path that ends in a dead end with no way back?

**Limits.** You may send floods and races against our services and stop and restart them with `stack.sh`. Never use sudo, never stop PostgreSQL itself, never touch the `registry` database, and don't hammer the real weather provider: keep requests that need *new* forecast locations under about 20 per run (repeated ones are cached).

## 4. Report

Finish the report you started in step 3.

Severity:
- **critical:** wrong irrigation advice, data loss or damage, a security hole.
- **high:** a requirement broken, a crash or 500, a dead end for the grower, or an impossible number on screen (a level below empty or above full, a negative amount) even when the advice itself is right.
- **medium:** a wrong error code or message, a confusing screen, a decision not followed.
- **low:** polish.

Every finding needs: steps anyone can paste, expected (citing the FR/NFR/decision), actual (quoted output or a screenshot path), and area.

Then stop the QA stack (`stack.sh stop`), unless the user wants to look at it. In the chat, give the counts by severity, the top three findings in one line each, and the report's path. Don't fix anything and don't commit; the owner decides what happens to each finding.
