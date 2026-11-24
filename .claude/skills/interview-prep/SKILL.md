---
name: interview-prep
description: Prepare the owner for the interview on a finished course task. Checks that the task is really done (requirements, qa, test and submit-task have all left fresh output), drafts the story from the repo, interviews the owner on the main problem and the "why" of each part, then writes two things on an interview/<task> branch - a short English slide deck in the fixed AgroPilot style (diagrams, flows, bars, real screenshots, little text) and a detailed Hebrew study guide that explains every part in depth with what to say on each slide and the questions the interviewers may ask. Use whenever the user says "/interview-prep", "prep me for the interview", "make the interview presentation", "build the slides for the review", "I need a study guide for the task", "the interview is tomorrow", or says the task is complete and asks what's next, even if they only say "get me ready".
---

# interview-prep

The interview is 15-30 minutes: the owner presents for about half of it, sharing their screen, then answers questions while the interviewers play with the live system. This skill makes the two things that help most:

1. **The deck** (`slides.html`, English): what the interviewers see while the owner talks. Fast, visual, one idea per slide, around 10-14 slides for 7-15 minutes of talk. Nobody reads it; the owner talks over it.
2. **The study guide** (`study-guide.html`, Hebrew, right to left): everything the owner needs to explain any line, decision or number in depth. All the text the deck leaves out lives here.

The owner is interviewed on this code and must be able to defend every claim, so every fact in both files comes from the repo (code, tests, `DECISIONS.md`, docs) and points to where it lives. Don't invent problems, reasons or numbers to make the story nicer.

## 1. Check the task is finished

Work out the task from the branch name (`p2` is `tasks/p2.md`), or from what the user named. Then check, in this order:

- **A clean tree.** `git status --short` shows nothing. The skill switches branches, so uncommitted work would travel with it.
- **The other skills have left fresh output.** "Fresh" means dated on or after the last commit that touched `services/` (`git log -1 --format=%cs -- services`):
  - `requirements`: `docs/requirements/<date>-<task>.html`, the newest one fresh, with nothing Not met.
  - `qa`: every report in `docs/qa/` for this task fresh enough, and every finding has a `**Status:**` line that is fixed or closed.
  - `test`: `docs/test-plan.md` last committed on or after that date.
  - `submit-task`: the PR body `docs/pr/<task>.md` exists.

If anything fails, **stop**. List each failure in one line with the skill that fixes it (for example "qa report is older than the last frontend commit: run /qa on the frontend"), and wait. Those skills start the stack and write code, so the owner runs them and watches; don't run them from here.

When all is green, create the side branch from the task branch: `git switch -c interview/<task>`. The deck and guide never go into the task's PR to main.

## 2. Read everything and draft the story

Read, in this order, and take notes as you go:

- The task file from the course repo (`curl -s https://raw.githubusercontent.com/alonitac/OzVeruach26/main/tasks/<task>.md`): what we were asked, in business terms first (who is the user, what problem), then the FR/NFR list.
- The previous task's file, only enough for one recap slide.
- `AGENTS.md`, each service's README, `DECISIONS.md` (the Y/O/A decisions added on this task: `git diff main...HEAD -- DECISIONS.md`), `docs/judgment-log.md`, `docs/extras.md`, the requirements page, the QA reports, `docs/test-plan.md`, `docs/pr/<task>.md`.
- `git log main..HEAD --oneline` for the order things happened in and where the effort went.
- The code of each part, enough to explain its main flow, and the test files, to pick the key test.

Then cut the work into **parts**: one per service, page or area a grower or grader would recognise (for P2: weather-service, planner-service, frontend, the registry changes). Split each part's content into **required** (an FR/NFR asks for it) and **add-on** (in `docs/extras.md` or an owner decision outside the spec).

For each part, draft:

- **What it does**, in one line a grower would understand.
- **The main problem we faced**: the hardest or most interesting thing, judged by the evidence: the decisions it produced, QA findings, commits spent on it. One problem, not a list.
- **How we solved it**, in one or two lines, with the decision id.
- **Why**: the reason behind the main choice, tagged **Business** (the grower, cost, trust, the task's rules) or **Tech** (correctness, speed, simplicity, testability). Take the reason from `DECISIONS.md` or the judgment log; for owner decisions (`Y#`), quote the owner's reason, never write one for them.
- **The key test**: the one test (file and name) that best proves the part works, and what it proves in one line. Get the test counts by collecting, not guessing: `uv run pytest --collect-only -q | tail -1` per Python service, `npm test` for the frontend.
- **The visual**: the one picture that explains it fastest (see section 4).

Also draft: the skills we used (from `.claude/skills/` and the PR body's skills section): what each did on this task, in one line each, and the end-to-end flow (what happens, service by service, when a grower opens a plot).

## 3. Interview the owner

Show the draft in the chat as one table per part (problem / solution / why / key test / visual), plus the list of add-ons and the skills. Ask the owner to confirm or replace, part by part:

- Is this the main problem, or was something else harder?
- Is the "why" right, and is it business or tech? If the reason is theirs (`Y#`), how would they say it?
- Anything to emphasise, cut or keep for the questions?
- The interview length, if it changes the slide count.

Ask with AskUserQuestion when the choice is between a few clear options; ask in plain text when you need their words. Keep their answers word for word in your notes: they go into the study guide as "in your words". Build nothing until the owner says the story is right.

## 4. Build the deck

Copy `references/deck-template.html` to `docs/interview/<task>/slides.html` and fill it. The template fixes the colours, type, layout and navigation so every task's deck looks the same; change content, never the CSS. Read the comments in the template: each layout has one example to copy.

The slides, in this order:

1. **Title**: task, one line on AgroPilot, date.
2. **What we were asked**: the business problem in one sentence, then 3-4 short bullets of what the task asked for.
3. **What we built**: big numbers (services, endpoints, tests, decisions) and a bar of required vs add-on.
4. **Architecture**: the services, their ports and who calls whom (inline SVG).
5. **One slide per part, required parts first**: the part layout, with the visual on the left and problem, solution, why and key test on the right.
6. **Add-ons**: one slide listing them, each with its why tag. Give an add-on its own part slide only if it's big (a whole page or service).
7. **Tests**: a bar per suite with its count, and the one test that says the most about the system.
8. **Skills**: a card per skill used: when it ran, what it gave.
9. **All together**: the end-to-end flow, numbered steps across the architecture.
10. **Live**: the links to the running system, "questions".

Rules for the text, because the owner talks and the slides only anchor:

- At most about 30 words on a slide, not counting diagram labels. A line is a phrase, not a sentence. If it needs explaining, the explaining goes to the study guide.
- Every number is real and checked today. Every "why" carries its tag (Business or Tech) and a decision id in small type.
- No emojis, no exclamation marks.

Choosing the visual, per part: pick what shows the mechanism, not decoration.

- A request moving between services: a **flow** (boxes and arrows).
- A calculation or rule (the irrigation bucket, a cache key): a **diagram** of the quantity with real example numbers.
- Sizes, counts, timings (tests per suite, p95 per endpoint): **bars**.
- Something the grower sees: a **real screenshot** of the page.

Screenshots: the stack must be running (`bash .claude/skills/run-stack/scripts/stack.sh status`; start it with the `run-stack` skill if not). Take them with `scripts/screenshot.sh` (next step: it drives the Windows Chrome in headless mode), into `docs/interview/<task>/screenshots/`. Show 2-3, not more: the interviewers will see the live system anyway.

## 5. Build the study guide

(Template and structure: next step.)

## 6. Check and hand over

- Open both files' text again and check: every number against its source, every decision id exists, slide count 10-14, no slide over about 30 words.
- Tell the owner the two paths and how to present: open `slides.html` in the browser, press F for full screen, arrow keys to move, Home to restart.
- Don't commit until the owner says so. Then commit on `interview/<task>` only, and say which branch they're on.
