---
name: run-stack
description: Start, check or stop the whole AgroPilot system on this machine (registry-service 8000 on PostgreSQL, weather-service 8001, planner-service 8002, the Next.js frontend 3000) with one bundled script that waits for every service and prints the links. Use whenever the user wants to run, start, launch, restart or stop the app or "the services", see a change working in the real app, prepare a demo, take a screenshot, or before any QA, manual check or measurement that needs live services, even if they only say "run it" or "show me".
---

# run-stack

One script starts the four services in the right order, checks that each one really answers, and prints where to click. Use it instead of typing the start commands by hand, so every run is the same.

## Commands

Run from the repo root:

```bash
bash .claude/skills/run-stack/scripts/stack.sh start              # start all four, wait for each, print links
bash .claude/skills/run-stack/scripts/stack.sh start qa           # the same on the throwaway 'registry_qa' database
bash .claude/skills/run-stack/scripts/stack.sh status             # which ones answer now, and the mode
bash .claude/skills/run-stack/scripts/stack.sh stop               # stop what start started
bash .claude/skills/run-stack/scripts/stack.sh stop weather       # stop one service (to see how the rest copes)
bash .claude/skills/run-stack/scripts/stack.sh restart weather    # start it again, in the same mode
```

**Normal mode** is the real `registry` database: for demos and looking around. **QA mode** (`start qa`) is for anything that writes junk or tries to break things, which is what the `qa` skill does. It wipes and re-seeds `registry_qa` first, then starts the registry on it; the other services are the same. The QA URL holds no password: PostgreSQL takes it from `~/.pgpass`, so neither the script nor the agent ever sees it. The owner sets that up once:

```bash
sudo -u postgres createdb -O registry registry_qa
echo 'localhost:5432:registry_qa:registry:<the registry password>' >> ~/.pgpass && chmod 600 ~/.pgpass
```

`stop` waits until each port is free, so `start` can follow at once. `restart` passes the shell's environment on, so a variable set in front of it (e.g. `FRESH_HOURS=0.005 ... restart weather`) overrides that service's `.env` for one run. The script refuses to switch modes while services run (`stop` first), and the reset refuses any database whose name doesn't end in `_qa`.

If services are already running and this session didn't start them, someone else may be using them: ask before `stop`.

Logs are in `/tmp/agropilot-stack/<service>.log` (set `STACK_DIR` to change the folder). When something misbehaves, read the log before guessing.

## What `start` does

1. Checks that PostgreSQL answers on localhost:5432 (`pg_isready`).
2. Checks that each service has its settings file (`.env`, or `.env.local` for the frontend). It checks only that the file exists. Neither the script nor the agent reads `.env` files.
3. Starts registry, weather, planner, frontend, in that order (the planner calls the first two, the frontend calls all three), each in the background, and waits up to 60 s for it to answer.
4. Calls `GET /v1/farms`, because the registry's `/health` never touches the database: this proves the database is reachable and seeded.
5. Checks that the registry process holds a connection to port 5432. This proves it runs on PostgreSQL and not SQLite, without reading its `.env`.
6. Prints the frontend link, a link to the first plot's page, and the `/docs` pages.

A service that already answers on its port is left alone. A port taken by something else stops the script.

## When it fails

The script prints one `FAILED:` line that says what to do. Pass that on to the user; don't work around it. In particular:

- PostgreSQL down: the user starts it (`sudo service postgresql start`). Don't run sudo yourself.
- A missing `.env`: the user copies `.env.example` and fills it in. Don't create or read it.
- `GET /v1/farms` not 200: the `registry` database is missing or not seeded. Tell the user; seeding production is their call.

## After starting

Tell the user what is up and give them the links. Leave the services running unless they asked for a one-off check; when the work is done, offer to `stop`.
