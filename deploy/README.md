# Deploy: AgroPilot on AWS EC2

The whole system runs on one EC2 instance in us-east-1, from the course tutorial `tutorials/aws_intro.md` (which deploys only the registry; here all four services run, Y29).

```
 Browser ──:3000──▶ agropilot-frontend (Next.js, next start)
                         │ server-side only
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
 :8000 registry    127.0.0.1:8002   127.0.0.1:8001
 (public, as in    planner ───────▶ weather ──▶ Open-Meteo
  the tutorial)       │
          ▼           └──▶ registry
 PostgreSQL 127.0.0.1:5432, database "registry"
```

| | |
| --- | --- |
| Instance | `i-02119bbbf95e78e0c` (`agropilot-dev-registry`), t3.medium, Ubuntu 24.04 |
| Security group | `agropilot-dev-registry-sg`: 22 and 8000 from my laptop IP only (Y32), 3000 and ICMP from anywhere |
| App URL | `http://<public-ip>:3000` (the IP changes on every stop/start, O115) |
| Registry API | `http://<public-ip>:8000/v1/...`, docs at `/docs` |
| Code | `/opt/agropilot/app`, a clone of `main`, owned by `agropilot` |
| Service account | `agropilot`: system user, no login shell, home `/opt/agropilot` (Y31) |
| Units | `deploy/systemd/agropilot-{registry,weather,planner,frontend}.service` |
| Settings | each service's `.env` (frontend `.env.local`), mode 600, from `.env.example`; the registry's has the generated database password (A69) |

## First-time setup (done by hand on 2026-11-22; `setup.sh` now does it)

`setup.sh` does steps 1-4, 7 and 8 and is safe to run on every deploy (it checks each step first); `update.sh` runs it. The steps stay here as the explanation. By hand, run on the instance as `ubuntu`. `as` is `sudo -u agropilot -H env HOME=/opt/agropilot`.

1. Packages: `sudo apt install -y postgresql sqlite3 git curl xz-utils`; Node.js 22 LTS from the nodejs.org tarball into `/usr/local` (check it with `SHASUMS256.txt`); uv with `curl -LsSf https://astral.sh/uv/install.sh | sudo env UV_INSTALL_DIR=/usr/local/bin UV_NO_MODIFY_PATH=1 sh`.
2. Account: `sudo useradd --system --create-home --home-dir /opt/agropilot --shell /usr/sbin/nologin agropilot`.
3. Code: `as git clone https://github.com/Tomer232/ArgoPilotApp.git /opt/agropilot/app`.
4. Database: a password from `openssl rand -hex 24`, then as `postgres`: `CREATE ROLE registry LOGIN PASSWORD '...'` and `CREATE DATABASE registry OWNER registry`. Write `DATABASE_URL=postgresql+psycopg://registry:<password>@localhost:5432/registry?connect_timeout=3&options=-c%20statement_timeout%3D5000` to `services/registry-service/.env`. Never print it.
5. Settings: copy `.env.example` to `.env` for weather and planner, and to `.env.local` for the frontend (the defaults point at 127.0.0.1). `chmod 600` all four.
6. Dependencies: `uv sync --frozen --no-dev` in each Python service; `npm ci && npm run build` in `services/frontend`.
7. Demo data: `.venv/bin/python seed.py` in `services/registry-service` (refuses if any table exists).
8. Units: copy `deploy/systemd/*.service` to `/etc/systemd/system/`, `sudo systemctl daemon-reload`, `sudo systemctl enable --now agropilot-registry agropilot-weather agropilot-planner agropilot-frontend`. The tutorial's old `registry.service` was disabled and removed (A70).

## Deploy a new version of main

Merging a pull request into `main` deploys it: the `deploy` workflow (`.github/workflows/deploy.yaml`) runs on every push to `main`.

```
merge PR into main
  -> GitHub Actions "deploy" (runner)
       1. checkout the merged commit
       2. AWS: describe the instance by id; start it if stopped; wait for running; read its public IP
       3. AWS: open port 22 for the runner's IP /32 (description github-deploy-<run id>), keep the rule id
       4. wait for SSH (ssh-keyscan, retry)
       5. scp deploy/setup.sh and deploy/update.sh to /tmp/agropilot-deploy/
       6. ssh: pipe DB_PASSWORD into  sudo bash /tmp/agropilot-deploy/update.sh <sha>
            update.sh: read the password from stdin -> setup.sh (idempotent) -> git reset to the sha
                       -> write the 4 settings files -> dependencies -> build -> restart -> health checks
                       -> check the live commit equals the sha
       7. always (also on failure or cancel): revoke the port 22 rule by its id
```

The port 22 rule for the runner exists only during a run. The workflow never stops the instance.

Names set in the repository settings (values are never written here):

| Kind | Name | Holds |
| --- | --- | --- |
| Secret | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | key of the IAM user `tomer.k-github-deploy` (describe and start our instance, open and close rules on our security group, nothing else) |
| Secret | `EC2_SSH_KEY` | the `.pem` for user `ubuntu` |
| Secret | `DB_PASSWORD` | the password of the PostgreSQL role `registry`; `setup.sh` sets the role's password to it on every run |
| Variable | `EC2_INSTANCE_ID`, `EC2_SG_ID`, `AWS_REGION` | the instance, its security group, `us-east-1` |

- **Deploy:** merge the pull request.
- **Deploy by hand, without a merge:** Actions tab, workflow `deploy`, "Run workflow" (or `gh workflow run deploy.yaml --ref main`).
- **Roll back:** re-run an older successful `deploy` run (`gh run rerun <run id>`). Only commits that already contain this `update.sh` and `setup.sh` can be rolled back to, because the scripts come from the commit being deployed.
- **Emergency, GitHub Actions down:** on the server, `sudo cp /opt/agropilot/app/deploy/setup.sh /opt/agropilot/app/deploy/update.sh /tmp/ && sudo sed -n 's#^DATABASE_URL=.*://[^:]*:\([^@]*\)@.*#\1#p' /opt/agropilot/app/services/registry-service/.env | sudo bash /tmp/update.sh <sha>` (the password never leaves the server; the scripts run from `/tmp` because `update.sh` resets the clone).

`update.sh` resets the code to the commit, writes the four settings files from scratch, installs the locked dependencies, rebuilds the frontend, restarts the four units, waits until each answers 200 (up to about a minute) and checks that the live commit is the one it was given.

## Operate

```bash
systemctl status 'agropilot-*'                 # all four
journalctl -fu agropilot-planner               # one service's log, live
sudo systemctl restart agropilot-frontend      # one service
sudo ss -ltnp | grep -E ':(3000|800[0-2]|5432)' # who listens where
```

Start and stop the instance from the console (filter by the instance id, never by name: the account is shared). After a start, copy the new public IP; the services start by themselves. The course also stops the instance automatically 3 times a day, so it may be stopped at any time, and after each start it has a new public IP (O145). If SSH or port 8000 times out, your laptop's IP changed (new network): update the port 22 and 8000 rules to your current IP.

## Found on the first deploy

An unknown plot showed the "Plot not found" page with HTTP 200 in production (404 under `next dev`): the production build prerenders the page, and a rewrite's own `status` is lost. Fixed in O116: the proxy rewrites to an address with no page, and Next.js serves `src/app/not-found.tsx` with 404. Lesson: check HTTP behaviour on `npm run build && npm start`, not only on `npm run dev`.
