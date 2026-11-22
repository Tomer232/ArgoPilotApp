---
name: submit-task
description: Get a finished course task (P2 and later) ready for its pull request into main. Checks the tree is clean, runs build, lint, every test suite and the requirements skill, collects the NFR numbers (re-measuring only stale ones), checks docs/extras.md and docs/judgment-log.md, and drafts the PR body the task's "Submit" section asks for. It stops for the owner's go before it pushes and opens the PR with the Windows gh.exe. Use whenever the user says "/submit-task", "submit", "open the PR", "prepare the PR", "we're done with P2", "ready to hand in", or asks what's left before submitting, even if they only say "wrap it up".
---

# submit-task

A pull request is what the grader reads. Its job here: make sure what's committed is the finished task, then write a PR description a reviewer can trust. Every number in it is measured, and every claim points somewhere.

There are two stop points, and both are the owner's call: whether to continue when a check fails, and the go to push and open the PR. Pushing and opening a PR are visible to others and hard to take back.

## 1. The task and the tree

- **The task.** It comes from the branch name (`p2` is `tasks/p2.md`). Fetch it with `curl -s https://raw.githubusercontent.com/alonitac/OzVeruach26/main/tasks/<task>.md` and read its **Submit** section: that's the PR's required content.
- **A clean tree.** Run `git status --short`. If anything is uncommitted or untracked (other than ignored files), **stop**. List it, grouped by folder, and tell the owner that a PR only carries commits. Don't commit, stash or discard work you didn't write: another session may own it. Continue when the owner says the tree is clean.

## 2. Checks

Run every suite with the shared script, and keep its summary for the PR body:

```bash
bash .claude/skills/test/scripts/run-all.sh
```

It runs the three pytest suites and the frontend's tests, lint and build, prints one PASS/FAIL line per suite with its log file, and exits 1 if any failed. It skips the build when the frontend runs on :3000 (`npm run build` rewrites `.next`); ask the owner to stop it, then run the script again.

Then run the `requirements` skill. It writes `docs/requirements/<date>-<task>.html`.

If any test, the lint or the build fails, or `requirements` has anything **Not met**, **Partly**, **Can't tell** or an **unrecorded** extra, list them in one line each and ask whether to continue. Don't fix them inside this skill; fixing is a separate step the owner chooses.

## 3. NFR numbers

The task asks for the measured number of each NFR in the PR. For each NFR:

1. Find its number in the service README (e.g. the "Latency" sections).
2. **Stale check.** Find the commit that wrote the number: `git log -1 --format='%h %cs' -S'<the number, e.g. 5.7 ms>' -- <README>`. Then list the code changes since then: `git log --oneline <that commit>..HEAD -- services/<service> ':!*.md' ':!services/<service>/tests'`. Any commit listed means the number is stale.
3. Re-measure only stale numbers, with the service's own script (`services/<service>/scripts/measure_latency.py`; the README says how to run it). Start what it needs with `run-stack`. Then update the README's number in its own commit, after showing the owner the new number.
4. An NFR that can't be measured by a script (e.g. NFR-2.8, a phone screen) gets how it was checked, or "not checked" if it wasn't. Never put a number nobody measured into the PR.

## 4. Records

- **`docs/extras.md`.** Every out-of-spec item in the requirements page must be here or in `DECISIONS.md`. List anything missing.
- **`docs/judgment-log.md`.** It holds the decisions where the agent's suggestion and the owner's choice differed, **in the owner's words**. Find candidates: owner decisions (`Y#`) added on this branch (`git diff main...HEAD -- DECISIONS.md`) that aren't in the log yet. List them and ask the owner which ones belong, and how they'd say it. Never write the owner's reasons for them.

## 5. The PR body

Write it to `docs/pr/<task>.md` from `references/pr-body-template.md`, filling every section the task's Submit section asks for (for P2: what was built, the NFR numbers, the skills used, and what you'd change in `irrigation-calc-reference`).

- Plain words, short. A reviewer reads it before the diff.
- NFR numbers with where they come from (README section, date, machine).
- What's known not to be done, from step 2, stated plainly. A reviewer finding a gap the PR hid is worse than reading it in the PR.
- No emojis. The last line is `Generated with [Claude Code](https://claude.com/claude-code)`.

Show the owner the body and the checks summary, and **stop**. Ask: push and open the PR?

## 6. Push and open (only after the owner's go)

WSL has no GitHub login; the Windows GitHub CLI has one. Use it as the credential helper for this one command, without changing git config:

```bash
git -c credential.helper= -c credential.helper='!"/mnt/c/Program Files/GitHub CLI/gh.exe" auth git-credential' push -u origin <task>
"/mnt/c/Program Files/GitHub CLI/gh.exe" pr create --repo Tomer232/ArgoPilotApp --base main --head <task> --title "<Task>: <one line>" --body "$(cat docs/pr/<task>.md)"
```

If a PR from this branch already exists (`gh.exe pr list --repo Tomer232/ArgoPilotApp --head <task>`), update its body with `gh.exe pr edit <number> --body "$(cat docs/pr/<task>.md)"` instead of opening a second one. Never merge, never force-push.

Give the owner the PR link, and remind them of the task's last step: read the whole diff on GitHub before asking for a review.
