---
name: deploy
description: Deploy the current main of AgroPilot to our EC2 instance (i-02119bbbf95e78e0c) in the shared course AWS account. Checks the work is merged (clean tree, local main equals origin/main), runs every test suite with the test skill's run-all.sh and, if one fails, says which and why and reruns the failed tests once, then deploys through the GitHub Actions `deploy` workflow (merge to main, or a manual run) and checks the server runs origin/main. Touches no other AWS resource, ever. Use whenever the user says "/deploy", "deploy", "ship it", "push it to AWS", "update the server", "put main on EC2", or asks to get the latest version live, even if they only say "release".
---

# deploy

Put the merged `main` on our server, and only when it is tested. Every step below is a gate: when one fails, say what failed and why, and stop. Don't fix code inside this skill; fixing is a separate step the owner chooses.

## The shared account (read first)

The AWS account belongs to the course; classmates' instances run in it. We own exactly one instance and one security group:

| | |
| --- | --- |
| Instance | `i-02119bbbf95e78e0c` (us-east-1) |
| Security group | `sg-0bfad4ab93434f856` |

- Every AWS call names the instance by id (`InstanceIds=["i-02119bbbf95e78e0c"]`). Never by name, tag or filter, never a call without an id, never "all instances".
- The only AWS calls this skill makes itself are `DescribeInstances` and, when the instance is stopped, `StartInstances` on that id. Never stop, reboot, terminate or modify anything, and never touch the security group. The `deploy` workflow opens port 22 for its own runner for the length of a run and always removes that rule; it is the only thing that does. If the emergency SSH path below times out because the owner's IP changed, tell the owner to update the port 22 rule in the console.
- Use the AWS MCP tool (`aws___run_script`, region `us-east-1`); there is no AWS CLI in WSL.

## 1. Merged

```bash
git fetch origin
git status --short
git rev-parse --abbrev-ref HEAD
git rev-parse main origin/main
git log --oneline origin/main..HEAD
```

- **Uncommitted or untracked files:** stop, list them grouped by folder. The server pulls `origin/main`, so they would not be deployed anyway; the owner decides what to do with them. Don't commit, stash or discard them.
- **Commits on the current branch that are not on `origin/main`** (the last command lists them): stop and list them. They are not merged, so they would not be deployed.
- **Local `main` differs from `origin/main`:** stop and say which is ahead. If `main` is only behind, offer `git switch main && git pull --ff-only`.
- All clear: the deploy target is `origin/main`'s commit. Say it (short hash and subject).

Run the tests on that commit: if you are not on `main`, `git switch main` first (the tree is clean, so this is safe), and switch back at the end.

## 2. Tests

```bash
bash .claude/skills/test/scripts/run-all.sh
```

It prints one `PASS`/`FAIL`/`SKIP` line per suite with its log file and exits 1 if any did not pass.

- `SKIP frontend-build` means the frontend dev server runs on :3000. Ask the owner whether to stop it (`bash .claude/skills/run-stack/scripts/stack.sh stop frontend`), then run the script again.
- For each `FAIL`: read its log and say **what** failed (test name, or lint rule, or build error) and **why** (the assertion or error message, quoted, and the file and line). One short block per failure.
- Then run only the failed tests once more, to tell a flaky test from a real failure:
  - pytest suites: `(cd services/<service> && uv run pytest -q --lf)`
  - frontend tests: `(cd services/frontend && npx vitest run <failed test file>)`
  - lint or build: run the same command again (`npm run lint`, `npm run build`).
- Report the rerun: **passed on rerun** (flaky: name it, it's still a finding) or **failed again** (real). Either way, **stop** and ask the owner whether to deploy anyway. A real failure means don't deploy, unless the owner says so in plain words.

## 3. The instance

The workflow finds the instance by id and starts it when it is stopped. To look yourself (read-only):

```python
r = await call_boto3(service_name="ec2", operation_name="DescribeInstances", region_name="us-east-1",
                     params={"InstanceIds": ["i-02119bbbf95e78e0c"]})
i = r["Reservations"][0]["Instances"][0]
result = {"state": i["State"]["Name"], "ip": i.get("PublicIpAddress")}
result
```

The public IP is new on every start; say so.

## 4. Deploy

Merging into `main` deploys by itself: the `deploy` workflow (`.github/workflows/deploy.yaml`) runs on every push to `main`. It copies `deploy/setup.sh` and `deploy/update.sh` from the runner's checkout of the merged commit to the server and runs them over SSH, with the database password piped on stdin.

1. Merge the PR once its required checks pass (the owner merges; Claude never does).
2. Watch the run: `gh.exe run watch $(gh.exe run list --workflow deploy.yaml --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status`.
3. Deploy without a merge (for example after the course stopped and restarted the instance): `gh.exe workflow run deploy.yaml --ref main`, then watch it as above.
4. Roll back: re-run an older successful `deploy` run, `gh.exe run rerun <run id>`. It works only for commits that already contain these scripts.

If a run fails, read its log (`gh.exe run view <run id> --log-failed`), quote the last lines and report. Stop.

### Emergency fallback (only if GitHub Actions is down)

Run it on the server, so the password never leaves it. SSH in (the owner opens port 22 to their IP first), then:

```bash
sudo sed -n 's#^DATABASE_URL=.*://[^:]*:\([^@]*\)@.*#\1#p' /opt/agropilot/app/services/registry-service/.env | sudo bash /opt/agropilot/app/deploy/update.sh <sha>
```

## 5. Check

The run's summary shows the commit and the link. Then:

```bash
curl -s -o /dev/null -w '%{http_code}\n' --max-time 10 http://<ip>:3000/
```

Done means: the `deploy` run is green, its commit equals `origin/main`'s (`update.sh` itself checks that the server's `HEAD` equals the sha it was given), and the app answers 200 on port 3000 from this machine. The security group should have no `github-deploy-*` rule afterwards.

## Report

- Target commit (hash and subject) and what was on the server before.
- Tests: the summary lines, and any rerun result.
- Instance: state found, whether it was started, the public IP.
- Result: deployed or stopped at step N, and why.
- Links: `http://<ip>:3000`.
- Suggest running `/qa-live` against the new deploy. Don't run it yourself.
- Last line: remind the owner that the instance costs about $1 a day while it runs (the course pays), and to stop it from the console (by its id) when nobody needs it; the next deploy starts it again. The course may also stop it by itself at any time (O145).
