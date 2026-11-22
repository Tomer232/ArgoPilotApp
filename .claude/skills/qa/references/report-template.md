# QA: <section>

Date: <YYYY-MM-DD>. Branch: <branch> at <short commit>, plus uncommitted work: <yes/no>.
Stack: QA mode (`registry_qa`). Browser: <which, or "none: HTML only, layout and clicks not checked">.

## Summary

| Severity | Count |
| --- | --- |
| critical | 0 |
| high | 0 |
| medium | 0 |
| low | 0 |

Top findings: <one line each, at most three>.

## Findings

### QA-1 <short title> (<severity>, <area: API / services / UI / UX / NFR / security>)

- **Steps:**
  ```bash
  <exact commands, or numbered clicks with the URL>
  ```
- **Expected:** <what should happen, citing FR/NFR/decision number>
- **Actual:** <quoted output, status, or screenshot path>
- **Notes:** <why it matters, suspected cause if obvious; no fix>

## Tried and held

What was attacked and behaved correctly, one line each, grouped by area. This shows what the section survived, not only where it failed.

- API: <...>
- Between services: <...>
- Frontend: <...>
- UX: <...>

## Not checked

<what this run couldn't cover and why: no browser, provider limit, ...>
