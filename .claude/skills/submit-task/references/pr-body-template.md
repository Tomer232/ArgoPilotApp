<!--
  Template for docs/pr/<task>.md. Replace every {{...}}; keep only the sections the task's
  "Submit" section asks for, plus "Checks" and "Not done". No emojis. Short sentences.
-->

## What we built

{{3-6 lines: each service or page added or changed in this task, one line each, with its port.}}

## NFR numbers

| NFR | Requirement | Measured | Where it comes from |
| --- | --- | --- | --- |
| {{NFR-x.y}} | {{p95 <= 100 ms at 10 req/s}} | {{p95 5.7 ms, 600 requests, 0 errors}} | {{service README "Latency", date, re-measured or reused}} |
| {{NFR-x.y}} | {{a check no script can do}} | {{how it was checked, or "not checked"}} | {{QA report / browser device toolbar}} |

Test machine: {{CPU, OS, Python/Node version, one worker}}.

## Skills used

- {{skill name}}: {{what it did in this task, one line}}

## What I would change in `irrigation-calc-reference`

{{The owner's points. Ask for them; don't invent them. Facts that may help: rules changed during the task (decision ids), QA findings that traced back to the skill.}}

## Checks

- Tests: {{registry N passed, weather N, planner N, frontend N}}; lint {{clean}}; build {{passed}}.
- Requirements: {{N met, N partly, N not met, N can't tell}}; page `docs/requirements/{{date}}-{{task}}.html`.
- Decisions: `DECISIONS.md`; extras outside the spec: `docs/extras.md`.

## Not done

- {{Each Not met / Partly / Can't tell the owner chose to submit with, one line, with the reason.}}

Generated with [Claude Code](https://claude.com/claude-code)
