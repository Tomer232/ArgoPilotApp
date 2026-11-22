#!/usr/bin/env bash
# Deploy the latest main on the EC2 instance. Run it there as ubuntu:
#   sudo bash /opt/agropilot/app/deploy/update.sh
# Pulls main, installs exactly the locked dependencies, rebuilds the frontend,
# restarts the four services and checks that each one answers.

set -euo pipefail

APP=/opt/agropilot/app
UNITS="agropilot-registry agropilot-weather agropilot-planner agropilot-frontend"

# Run a command as the service account, in a given folder.
as_agropilot() {
  local folder="$1"; shift
  sudo -u agropilot -H env HOME=/opt/agropilot NEXT_TELEMETRY_DISABLED=1 sh -c "cd $folder && $*"
}

# Print "<url> -> <status>" and fail unless the url answers 200.
check() {
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$1")"
  echo "$1 -> $code"
  [ "$code" = "200" ]
}

as_agropilot "$APP" git pull --ff-only -q origin main
as_agropilot "$APP" git log --oneline -1

for service in registry-service weather-service planner-service; do
  as_agropilot "$APP/services/$service" uv sync --frozen --no-dev -q
done
as_agropilot "$APP/services/frontend" "npm ci --no-audit --no-fund --loglevel=error && npm run build"

install -m 644 -o root -g root "$APP"/deploy/systemd/agropilot-*.service /etc/systemd/system/
systemctl daemon-reload
systemctl restart $UNITS
sleep 5

check http://127.0.0.1:8000/v1/farms
check http://127.0.0.1:8001/health
check http://127.0.0.1:8002/health
check http://127.0.0.1:3000/
echo "Deployed."
