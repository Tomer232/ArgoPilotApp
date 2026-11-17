---
name: requirements
description: Check what we built against the current task's functional and non-functional requirements (FR/NFR in the course repo's task file), give each one a status with evidence (code, test, decision), and list everything built that the spec didn't ask for and in what form. Writes one visual HTML page to docs/requirements/. Reads code and tests only; never starts the stack and fixes nothing. Use whenever the user says "/requirements", "are we in spec", "check the requirements", "what's out of spec", "are we done with the task", "is anything missing before the PR", or before submitting a task, even if they only ask "did we cover everything".
---

# requirements

Answer two questions about the current task, on one page the owner can read in two minutes:

1. **Is every requirement met?** Each FR and NFR gets a status and the evidence for it.
2. **What did we build that nobody asked for?** Everything outside the spec, in what form, and whether it was recorded as the owner's decision.

The task says to build only what the spec lists (AGENTS.md, "Project constraints"), so the second list matters as much as the first. You report; you don't fix and you don't commit. Each gap is the owner's decision.

## 1. Collect the spec

- **The task.** It comes from the branch name (`p2` is `tasks/p2.md`), or from the task the user named. Fetch it: `curl -s https://raw.githubusercontent.com/alonitac/OzVeruach26/main/tasks/<task>.md`. If the branch name doesn't say and the user didn't either, ask.
- **Every requirement in it.** These are the `FR-x.y` and `NFR-x.y` items under each service, plus the hard rules in the "Notes", "Global configurations" and "Submit" sections (for example, required settings, ports and the PR). A requirement that points back to an earlier one ("NFR-1.1 still holds") brings that one in too: fetch the earlier task file.
- **The owner's rules**, which say how a requirement was meant to be read: `DECISIONS.md`, `docs/extras.md`, the services' READMEs, and the project skills (`registry-api`, `irrigation-calc-reference`).

## 2. Check each requirement

Read the code and the tests; don't start the stack (that's the `qa` skill's job). Run the test suites once, so "a test covers it" means it passes today:

```bash
(cd services/registry-service && uv run pytest -q)
(cd services/weather-service && uv run pytest -q)
(cd services/planner-service && uv run pytest -q)
(cd services/frontend && npm test)
```

Never read `.env` files. A setting that only lives there can't be checked: say so.

For each requirement, pick one status:

- **Met**: code does it and a passing test (or a recorded measurement, e.g. a p95 in a README) shows it.
- **Partly**: part of it is done, or it's done without a test or measurement to show it. Say which part is missing.
- **Not met**: the code doesn't do it, or a test shows it failing.
- **Can't tell**: it can only be seen live or in a browser (a 375 px screen, a p95 under load with no recorded number). Name the check that would settle it (`qa`, a measurement script, the browser device toolbar).

Evidence is something the owner can open: `path/file.py:42`, a test name, a decision id (`O99`), a README section. "Looks fine" is not evidence. Open `docs/qa/` too: a QA finding that's still open on a requirement makes it Partly or Not met, whatever the code looks like.

## 3. Find what's out of spec

Go through the repo looking for anything no requirement asks for:

- **API:** routes, query parameters, response fields, status codes and headers beyond the spec (compare each service's routes with the task's endpoints).
- **UI:** pages, controls, panels and texts the frontend FRs don't list.
- **Behaviour:** rules the spec leaves open that we decided ourselves (defaults, limits, rounding, what happens at an edge).
- **Tooling and docs:** scripts, skills, experiments, extra test suites, research notes.

For each one, give: what it is, its **form** (API / UI / behaviour / tooling / docs), where it lives, and where it's **recorded**: a decision id in `DECISIONS.md`, an entry in `docs/extras.md`, or **unrecorded**. Unrecorded extras break the project rule, so list them first. Don't list every helper function: something counts when a user, a grader or another service could notice it.

## 4. Write the page

Write `docs/requirements/<YYYY-MM-DD>-<task>.html` from `references/page-template.html` (overwrite the same day's file). It's one self-contained page: no external scripts, no fonts, nothing fetched, so it opens from the file and goes with the PR.

- The top of the page: task, branch, commit, date, the test-suite results, and the counts by status.
- **Needs the owner**: Not met, Partly, Can't tell and unrecorded extras, each in one line with what decides it. Keep this short; it's the part that gets read.
- **Requirements**: one row per requirement, grouped by service, with a short paraphrase (not the full text), the status and the evidence.
- **Out of spec**: one row per extra, unrecorded first.
- **Diagram** (optional): add an inline SVG only when it says something the tables don't. For example, show which service each unmet requirement sits in, or how the extras spread over the system. Skip it otherwise.

Keep it to bullets and short rows. If the page needs scrolling past two screens, cut words, not rows.

## 5. Report

In the chat: the page's path, the counts (met / partly / not met / can't tell, and extras recorded vs unrecorded), and the top three items that need the owner, one line each. Don't fix anything and don't commit.
