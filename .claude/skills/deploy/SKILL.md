---
name: deploy
description: Deploy the current main of AgroPilot to our EC2 instance (i-02119bbbf95e78e0c) in the shared course AWS account. Checks the work is merged (clean tree, local main equals origin/main), runs every test suite with the test skill's run-all.sh and, if one fails, says which and why and reruns the failed tests once, then finds the instance by id (starting it if stopped), runs deploy/update.sh over SSH and checks the server runs origin/main. Touches no other AWS resource, ever. Use whenever the user says "/deploy", "deploy", "ship it", "push it to AWS", "update the server", "put main on EC2", or asks to get the latest version live, even if they only say "release".
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
- The only AWS calls this skill makes are `DescribeInstances` and, when the instance is stopped, `StartInstances` on that id. Never stop, reboot, terminate or modify anything, and never touch the security group. If SSH times out because the owner's IP changed, tell the owner to update the port 22 rule in the console.
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

Find it by id:

```python
r = await call_boto3(service_name="ec2", operation_name="DescribeInstances", region_name="us-east-1",
                     params={"InstanceIds": ["i-02119bbbf95e78e0c"]})
i = r["Reservations"][0]["Instances"][0]
result = {"state": i["State"]["Name"], "ip": i.get("PublicIpAddress")}
result
```

- `running`: use the IP.
- `stopped`: start it, by id only: `StartInstances` with `{"InstanceIds": ["i-02119bbbf95e78e0c"]}`. Then call `DescribeInstances` again every ~15 s (up to 3 minutes) until it is `running` with a public IP. The IP is new on every start; say so. The services start by themselves.
- `pending` / `stopping` / anything else: wait as above for `running` or `stopped`; if it doesn't settle in 3 minutes, stop and report the state.

## 4. Deploy

```bash
ssh -i ~/.ssh/tomer-us-east-1.pem -o ConnectTimeout=10 -o BatchMode=yes ubuntu@<ip> 'sudo bash /opt/agropilot/app/deploy/update.sh'
```

After a fresh start, SSH may need a few tries (~30 s) and will ask to accept the new host key: add `-o StrictHostKeyChecking=accept-new`.

`update.sh` pulls `main`, installs the locked dependencies, rebuilds the frontend, restarts the four units, and checks each answers 200. It runs a few minutes (the frontend build is the slow part); give the command a 10-minute timeout.

If it fails, quote the last lines of its output and read the failing unit's log: `ssh ... 'journalctl -u agropilot-<service> -n 40 --no-pager'`. Report and stop.

## 5. Check

```bash
ssh -i ~/.ssh/tomer-us-east-1.pem -o BatchMode=yes ubuntu@<ip> 'sudo -u agropilot git -C /opt/agropilot/app rev-parse --short HEAD; systemctl is-active agropilot-registry agropilot-weather agropilot-planner agropilot-frontend'
curl -s -o /dev/null -w '%{http_code}\n' --max-time 10 http://<ip>:3000/
```

Done means: the server's commit equals `origin/main`'s, all four units are `active`, and the app answers 200 on port 3000 from this machine.

## Report

- Target commit (hash and subject) and what was on the server before.
- Tests: the summary lines, and any rerun result.
- Instance: state found, whether it was started, the public IP.
- Result: deployed or stopped at step N, and why.
- Links: `http://<ip>:3000`.
- Last line: suggest running `/qa-live` against the new deploy. Don't run it yourself.
