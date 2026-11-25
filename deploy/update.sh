#!/usr/bin/env bash
# Deploy one commit of main on the EC2 instance. Run it there:
#   printf '%s' "<db password>" | sudo bash update.sh <commit sha>
# The password comes on stdin (never as an argument). The script runs setup.sh
# from its own folder, resets the code to the commit, writes the settings
# files, installs the locked dependencies, rebuilds the frontend, restarts the
# four services and checks that each one answers and that the commit is live.

set -euo pipefail

APP=/opt/agropilot/app
UNITS="agropilot-registry agropilot-weather agropilot-planner agropilot-frontend"
HERE="$(cd "$(dirname "$0")" && pwd)"

# Run a command as the service account, in a given folder.
as_agropilot() {
  local folder="$1"; shift
  sudo -u agropilot -H env HOME=/opt/agropilot NEXT_TELEMETRY_DISABLED=1 sh -c "cd $folder && $*"
}

# Stop with a one-line message unless we are root and got a 40-character sha.
check_arguments() {
  [ "$(id -u)" = "0" ] || { echo "Run as root: sudo bash update.sh <sha>"; exit 1; }
  [ "$#" -eq 1 ] || { echo "Usage: printf '%s' <password> | sudo bash update.sh <sha>"; exit 1; }
  [[ "$1" =~ ^[0-9a-f]{40}$ ]] || { echo "Not a full commit sha: $1"; exit 1; }
}

# Read the database password from stdin into DB_PASSWORD (the last line may have no newline).
read_password() {
  DB_PASSWORD=""
  read -r DB_PASSWORD || true
  [ -n "$DB_PASSWORD" ] || { echo "No database password on stdin."; exit 1; }
  export DB_PASSWORD
}

# Write the four settings files from scratch, mode 600, owned by agropilot.
# printf is a shell builtin, so the password never shows in a process list.
write_settings() {
  local services="$APP/services"
  local url="postgresql+psycopg://registry:%s@localhost:5432/registry?connect_timeout=3&options=-c%%20statement_timeout%%3D5000"
  (
    umask 077
    printf "DATABASE_URL=$url\n" "$DB_PASSWORD" |
      install -m 600 -o agropilot -g agropilot /dev/stdin "$services/registry-service/.env"
  )
  install -m 600 -o agropilot -g agropilot "$services/weather-service/.env.example" "$services/weather-service/.env"
  install -m 600 -o agropilot -g agropilot "$services/planner-service/.env.example" "$services/planner-service/.env"
  install -m 600 -o agropilot -g agropilot "$services/frontend/.env.example" "$services/frontend/.env.local"
}

# Wait up to about 60 seconds for a url to answer 200, printing the last status.
wait_for() {
  local code="000"
  for _ in $(seq 1 30); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$1" || true)"
    [ "$code" = "200" ] && break
    sleep 2
  done
  echo "$1 -> $code"
  [ "$code" = "200" ]
}

check_arguments "$@"
SHA="$1"
read_password

bash "$HERE/setup.sh"

as_agropilot "$APP" git fetch -q origin main
as_agropilot "$APP" git reset -q --hard "$SHA"
as_agropilot "$APP" git log --oneline -1

write_settings

for service in registry-service weather-service planner-service; do
  as_agropilot "$APP/services/$service" uv sync --frozen --no-dev -q
done
as_agropilot "$APP/services/frontend" "npm ci --no-audit --no-fund --loglevel=error && npm run build"

install -m 644 -o root -g root "$APP"/deploy/systemd/agropilot-*.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable -q $UNITS
systemctl restart $UNITS

wait_for http://127.0.0.1:8000/v1/farms
wait_for http://127.0.0.1:8001/health
wait_for http://127.0.0.1:8002/health
wait_for http://127.0.0.1:3000/

LIVE="$(as_agropilot "$APP" git rev-parse HEAD)"
[ "$LIVE" = "$SHA" ] || { echo "Live commit is $LIVE, expected $SHA"; exit 1; }
echo "Deployed ${SHA:0:7}"
