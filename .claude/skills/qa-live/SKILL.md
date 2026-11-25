---
name: qa-live
description: QA the deployed AgroPilot on our EC2 instance (i-02119bbbf95e78e0c) after a deploy - try to break the live API, website, service-to-service calls and the server itself (exposed ports, service account, secrets, a small load), without stopping anything, then delete its own test rows and report every gap with steps to reproduce in docs/qa/. Fixes nothing and touches no other AWS resource. Use whenever the user says "/qa-live", "QA the deploy", "QA production", "try to break the server", "check the live site", "is the deploy OK", or right after /deploy, even if they only say "test it on AWS".
context: fork
agent: general-purpose
---

# qa-live

The deploy is "done", and your job is to prove it isn't. This is the `qa` skill's mindset (hostile tester, confused grower, flaky network) pointed at the real server, plus what only a deploy can get wrong: what's open to the internet, who the processes run as, where the secrets are,.

The owner chose **safe only** (Y38): read anything, write only your own `QA-<date>-` rows, and one small flood per target. Never stop, kill or restart a service or PostgreSQL, never change a unit's config, never reboot. Attacks that need one of those go under "Not checked" with the reason "safe only (Y38)". Two more promises: you never touch anything else in the AWS account, and at the end your rows are gone and the seed rows are unchanged (step 6). You report; you don't fix.

## The shared account (read first)

| | |
| --- | --- |
| Instance | `i-02119bbbf95e78e0c` (us-east-1) |
| Security group | `sg-0bfad4ab93434f856` |

- AWS calls (AWS MCP tool `aws___run_script`; no AWS CLI in WSL) are read-only and always by id: `DescribeInstances` with `InstanceIds=["i-02119bbbf95e78e0c"]`, `DescribeSecurityGroups` with `GroupIds=["sg-0bfad4ab93434f856"]`. Never a call without an id, never a name or tag filter, never a write (no start, stop, reboot or rule change through AWS). If the instance is stopped, stop and suggest `/deploy`, which may start it.
- Everything else happens over SSH on our instance: `ssh -i ~/.ssh/tomer-us-east-1.pem -o BatchMode=yes ubuntu@<ip> '<command>'` (below: `ssh <ip>`).
- Never print a secret: no `cat` of a `.env`, no `DATABASE_URL`, no password in the report. Check permissions and owners with `stat`/`ls -l`, and secret presence with `grep -c`.
- Never drop or recreate the `registry` database, and never delete or change seed rows.

## 1. Know what is deployed

1. `DescribeInstances` by id: state and public IP.
2. `ssh <ip> 'sudo -u agropilot git -C /opt/agropilot/app rev-parse --short HEAD'` and compare with `git fetch origin && git rev-parse --short origin/main`. If they differ, say so in the report's header: you are testing what runs, not what's merged.
3. Read what "correct" means: the task file's FR/NFR (`curl -s https://raw.githubusercontent.com/alonitac/OzVeruach26/main/tasks/<task>.md`), `DECISIONS.md` (Y29-Y32, O114-O116 are the deploy's own rules), `deploy/README.md`, the services' READMEs, and the latest `docs/qa/` reports (old findings: are they still there in production?).

Create the report now: `docs/qa/<YYYY-MM-DD>-live.md` from the `qa` skill's `references/report-template.md`, with the header line `Live: EC2 i-02119bbbf95e78e0c at <ip>, commit <hash> (origin/main <hash>)` instead of the stack line. Add each finding and each attack that held as you go.

## 2. Safety net

Before the first write, take a backup on the server and a snapshot here:

```bash
ssh <ip> 'sudo -u postgres pg_dump -Fc registry | sudo tee /root/qa-live-<YYYY-MM-DD>.dump > /dev/null && sudo ls -l /root/qa-live-<YYYY-MM-DD>.dump'
for p in farms plots crops soils emitters; do curl -s http://<ip>:8000/v1/$p; echo; done > <scratchpad>/before.json
```

These five are every list the registry has. Everything you create is named `QA-<YYYY-MM-DD>-...`, so you can find and delete it at the end.

## 3. The outside view

From this machine, which is the owner's laptop and so is allowed on 8000 and 22 (Y32):

- **Ports.** `curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://<ip>:<port>/` for 3000, 8000, 8001, 8002, 5432 and `nc -zv -w 5 <ip> <port>` for good measure. Expected: 3000 and 8000 answer; 8001, 8002, 5432 time out (O114). Read the security group by id and compare its rules with Y32: only 3000 and ICMP (ping, as in the deploy README) open to `0.0.0.0/0`; 22 and 8000 only to one `/32`.
- **What the responses leak.** Headers (`curl -sI`): `Server`, `X-Powered-By`, versions. Error bodies: no traceback, no file path, no SQL, no stack in any 4xx/5xx. Is `/docs` meant to be public (Y13 says it came back for the frontend)? Does `/openapi.json` reveal anything it shouldn't?
- **Production build behaviour** (the lesson of O116: `npm run build` differs from `next dev`): every status code the frontend promises: an unknown plot and a non-UUID plot id answer 404, bad query values, a very long query string, `/_next/` paths that don't exist.
- Note what you can't check from here: port 8000 from a non-owner IP (it should time out). Put it under "Not checked".

## 4. Attack the system

Work through the `qa` skill's step 3 (read `.claude/skills/qa/SKILL.md`): the API, between-services, frontend and UX attack lists, against `http://<ip>:3000` and `http://<ip>:8000`. Differences on the live server:

- **Weather and planner are not public.** Reach them through an SSH tunnel: `ssh -i ~/.ssh/tomer-us-east-1.pem -N -L 18001:127.0.0.1:8001 -L 18002:127.0.0.1:8002 ubuntu@<ip> &`, save its PID, and use `http://127.0.0.1:18001` and `:18002`. Kill it by PID at the end.
- **Skip** every `qa` attack that stops or restarts a service or changes its settings (a dead service, the stale forecast): list each under "Not checked", "safe only (Y38)".
- **Weather provider:** keep requests that need new forecast locations under about 20 per run; Open-Meteo is shared by everyone.

Then the server itself:

- **Accounts and files.** `ps -o user=,cmd= -C uvicorn -C node` (or `systemctl show -p User agropilot-*`): every service runs as `agropilot`, none as root or ubuntu (Y31). `stat -c '%a %U %n'` on the four `.env`/`.env.local` files: mode 600, owner `agropilot`. `getent passwd agropilot`: no login shell. Does any file under `/opt/agropilot/app` belong to root or allow world writes?
- **What listens where.** `sudo ss -ltnp`: 8001, 8002 and 5432 on 127.0.0.1 only; nothing unexpected on `0.0.0.0`.
- **Restart settings, read only.** `systemctl show -p Restart,RestartUSec agropilot-*` and `systemctl is-enabled agropilot-* postgresql`: every unit restarts on failure and starts at boot. Crash recovery, a database outage and a reboot are not tried (Y38): list them under "Not checked".
- **Load (keep it small: the course pays for the instance).** One short flood per target, no more: 100 requests, 10 at a time, against the overview page, a plot page and `GET /v1/plots` (`yes <url> | head -100 | xargs -P 10 -n 1 curl -s -o /dev/null -w '%{http_code} %{time_total}\n'`). Never repeat a flood, never loop it, never more than a minute of load in total. Record the status mix and the slowest times. For the NFR latency numbers, measure on the server instead (`ssh <ip>` with a `curl` loop at 10 requests per second against `127.0.0.1`): from the laptop each request carries ~180 ms of round trip to us-east-1. Watch memory on the server (`free -m`) during it. Plot pages call the planner, which calls weather: pick plots whose forecast is already cached.
- **Logs.** `journalctl -u 'agropilot-*' --since '<start time>' -p warning --no-pager`: any traceback or error you didn't cause on purpose is a finding.

## 5. Severity

As in the `qa` skill (critical: wrong advice, data loss, security hole; high: requirement broken, crash/500, dead end, impossible number; medium: wrong code or message, confusing screen, decision not followed; low: polish), plus:

- **critical:** a secret readable or printed anywhere, a service running as root, a port open to the world that should not be, data lost or changed.
- **high:** a unit not set to restart on failure or not enabled at boot; a production status code different from what the decisions promise.

## 6. Put everything back (always, even after a failure halfway)

Go through this list and record each line's result in the report under "Restored":

1. `systemctl is-active` and `is-enabled` are `active`/`enabled` for all four units and for `postgresql`. You stopped nothing, so anything else is a finding; tell the owner and don't start it yourself.
2. Every `QA-<date>-` row is deleted (plots before farms). List by name through the API to check none are left.
3. The seed rows are unchanged: fetch the same lists as in step 2 and compare with `before.json` (ignoring nothing).
4. The SSH tunnel and any helper process you started are stopped, by PID. Never `pkill -f` a pattern.
5. The backup in `/root/` stays on the server; give its path in the report. If step 3 shows damage, **stop and tell the owner**, with the restore command (`sudo -u postgres pg_restore --clean --if-exists -d registry /root/qa-live-<date>.dump`); don't restore without their go.
6. `http://<ip>:3000` answers 200 and shows the plots.
7. **Cost check** (read-only, by id): the instance's CPU-credit mode (`DescribeInstanceCreditSpecifications` with `InstanceIds=["i-02119bbbf95e78e0c"]`) and the extra CPU charge for the last 6 hours (CloudWatch `GetMetricStatistics`, namespace `AWS/EC2`, metric `CPUSurplusCreditsCharged`, dimension `InstanceId=i-02119bbbf95e78e0c`, period 3600, `Sum`). Put both in the report. In "unlimited" mode, any charge above 0 is a finding for the owner.

## 7. Report

Finish `docs/qa/<YYYY-MM-DD>-live.md`: the summary counts, every finding with steps anyone can paste (commands with `<ip>`, never a secret), expected with the FR/NFR/decision it comes from, actual (quoted), and area (API / services / UI / UX / server / security / NFR); "Tried and held" grouped by area (add "Server" and "Outside view"); "Restored" from step 6; "Not checked".

In the chat: the counts by severity, the top three findings in one line each, whether everything was restored, the cost check, and the report's path. Don't fix anything and don't commit; the owner decides what happens to each finding.

Last line: remind the owner that the instance costs about $1 a day while it runs, and to stop it from the console (by its id, `i-02119bbbf95e78e0c`) when nobody needs it; `/deploy` starts it again.
