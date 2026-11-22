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
| Security group | `agropilot-dev-registry-sg`: 22 (my IP), ICMP, 8000, 3000 |
| App URL | `http://<public-ip>:3000` (the IP changes on every stop/start, O115) |
| Registry API | `http://<public-ip>:8000/v1/...`, docs at `/docs` |
| Code | `/opt/agropilot/app`, a clone of `main`, owned by `agropilot` |
| Service account | `agropilot`: system user, no login shell, home `/opt/agropilot` (Y31) |
| Units | `deploy/systemd/agropilot-{registry,weather,planner,frontend}.service` |
| Settings | each service's `.env` (frontend `.env.local`), mode 600, from `.env.example`; the registry's has the generated database password (A69) |

## First-time setup (already done, 2026-11-22)

Run on the instance as `ubuntu`. `as` is `sudo -u agropilot -H env HOME=/opt/agropilot`.

1. Packages: `sudo apt install -y postgresql sqlite3 git curl xz-utils`; Node.js 22 LTS from the nodejs.org tarball into `/usr/local` (check it with `SHASUMS256.txt`); uv with `curl -LsSf https://astral.sh/uv/install.sh | sudo env UV_INSTALL_DIR=/usr/local/bin UV_NO_MODIFY_PATH=1 sh`.
2. Account: `sudo useradd --system --create-home --home-dir /opt/agropilot --shell /usr/sbin/nologin agropilot`.
3. Code: `as git clone https://github.com/Tomer232/ArgoPilotApp.git /opt/agropilot/app`.
4. Database: a password from `openssl rand -hex 24`, then as `postgres`: `CREATE ROLE registry LOGIN PASSWORD '...'` and `CREATE DATABASE registry OWNER registry`. Write `DATABASE_URL=postgresql+psycopg://registry:<password>@localhost:5432/registry?connect_timeout=3&options=-c%20statement_timeout%3D5000` to `services/registry-service/.env`. Never print it.
5. Settings: copy `.env.example` to `.env` for weather and planner, and to `.env.local` for the frontend (the defaults point at 127.0.0.1). `chmod 600` all four.
6. Dependencies: `uv sync --frozen --no-dev` in each Python service; `npm ci && npm run build` in `services/frontend`.
7. Demo data: `.venv/bin/python seed.py` in `services/registry-service` (refuses if any table exists).
8. Units: copy `deploy/systemd/*.service` to `/etc/systemd/system/`, `sudo systemctl daemon-reload`, `sudo systemctl enable --now agropilot-registry agropilot-weather agropilot-planner agropilot-frontend`. The tutorial's old `registry.service` was disabled and removed (A70).

## Deploy a new version of main

```bash
ssh -i ~/.ssh/tomer-us-east-1.pem ubuntu@<public-ip>
sudo bash /opt/agropilot/app/deploy/update.sh
```

It pulls `main`, installs the locked dependencies, rebuilds the frontend, restarts the four units and checks each one answers 200.

## Operate

```bash
systemctl status 'agropilot-*'                 # all four
journalctl -fu agropilot-planner               # one service's log, live
sudo systemctl restart agropilot-frontend      # one service
sudo ss -ltnp | grep -E ':(3000|800[0-2]|5432)' # who listens where
```

Start and stop the instance from the console (filter by the instance id, never by name: the account is shared). After a start, copy the new public IP; the services start by themselves. If SSH times out, update the security group's port 22 rule to your current IP.

## Found on the first deploy

An unknown plot showed the "Plot not found" page with HTTP 200 in production (404 under `next dev`): the production build prerenders the page, and a rewrite's own `status` is lost. Fixed in O116: the proxy rewrites to an address with no page, and Next.js serves `src/app/not-found.tsx` with 404. Lesson: check HTTP behaviour on `npm run build && npm start`, not only on `npm run dev`.
