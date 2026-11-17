#!/usr/bin/env bash
# Start, stop or check the whole AgroPilot system on this machine.
#   bash stack.sh start    start registry, weather, planner and the frontend, wait until each answers
#   bash stack.sh stop     stop everything this script started
#   bash stack.sh status   show which services answer
# Logs and process ids go to $STACK_DIR (default /tmp/agropilot-stack), one file per service.

set -u

REPO="$(cd "$(dirname "$0")/../../../.." && pwd)"
STACK_DIR="${STACK_DIR:-/tmp/agropilot-stack}"
WAIT_SECONDS=60

# name | folder | port | start command | url that must answer 200
SERVICES=(
  "registry|services/registry-service|8000|uv run uvicorn main:app --port 8000|http://127.0.0.1:8000/health"
  "weather|services/weather-service|8001|uv run uvicorn main:app --port 8001|http://127.0.0.1:8001/health"
  "planner|services/planner-service|8002|uv run uvicorn main:app --port 8002|http://127.0.0.1:8002/health"
  "frontend|services/frontend|3000|npm run dev -- --port 3000|http://127.0.0.1:3000/"
)

# Print one line and stop the script with exit code 1.
fail() {
  echo "FAILED: $1"
  exit 1
}

# True if the url answers with HTTP 200.
answers() {
  [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$1")" = "200" ]
}

# Stop unless PostgreSQL answers on localhost:5432.
check_postgres() {
  pg_isready -h localhost -p 5432 -q \
    || fail "PostgreSQL is not answering on localhost:5432. Start it with: sudo service postgresql start"
}

# Stop unless every service has its settings file. Only checks that the file exists, never reads it.
check_env_files() {
  local f
  for f in services/registry-service/.env services/weather-service/.env services/planner-service/.env services/frontend/.env.local; do
    [ -f "$REPO/$f" ] || fail "$f is missing. Copy the .env.example next to it."
  done
}

# Start one service in the background, in its own process group so stop can end all its children.
start_one() {
  local name="$1" folder="$2" port="$3" command="$4" url="$5"
  if answers "$url"; then
    echo "$name: already running on port $port, left as is"
    return
  fi
  if ss -ltn "sport = :$port" | grep -q LISTEN; then
    fail "$name: port $port is taken by something that is not $name. Free it and try again."
  fi
  # The new shell writes its own id ($$) after setsid, so the saved id is the process group stop must end.
  (cd "$REPO/$folder" && setsid bash -c 'echo $$ > "$1"; exec $2' _ "$STACK_DIR/$name.pid" "$command" \
    > "$STACK_DIR/$name.log" 2>&1 < /dev/null &)
  echo "$name: starting on port $port (log: $STACK_DIR/$name.log)"
}

# Wait until the url answers 200, or fail and show the end of the service's log.
wait_for() {
  local name="$1" url="$2" waited=0
  until answers "$url"; do
    sleep 1
    waited=$((waited + 1))
    if [ "$waited" -ge "$WAIT_SECONDS" ]; then
      echo "--- last lines of $STACK_DIR/$name.log ---"
      tail -n 15 "$STACK_DIR/$name.log" 2>/dev/null
      fail "$name did not answer $url within $WAIT_SECONDS s"
    fi
  done
  echo "$name: up ($url)"
}

# Prove the registry really reads its database: /health alone never touches it.
check_registry_database() {
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:8000/v1/farms)"
  [ "$code" = "200" ] || fail "registry is up but GET /v1/farms gave $code. Is the 'registry' database created and seeded?"
  echo "registry: database answers (GET /v1/farms 200)"
}

# Prove the registry uses PostgreSQL, not SQLite, without reading its .env:
# after a database request, the process listening on 8000 keeps a pooled connection open to port 5432.
check_registry_on_postgres() {
  local pid
  pid="$(ss -ltnpH 'sport = :8000' | grep -oE 'pid=[0-9]+' | head -n 1 | cut -d= -f2)"
  [ -n "$pid" ] || fail "could not find the process listening on port 8000"
  ss -tnpH state established '( dport = :5432 )' | grep -q "pid=$pid," \
    || fail "registry answers but has no connection to PostgreSQL: its DATABASE_URL is probably SQLite. Point services/registry-service/.env at the 'registry' database, then run: bash .claude/skills/run-stack/scripts/stack.sh stop"
  echo "registry: connected to PostgreSQL (port 5432)"
}

# Print the first plot's page, so there is one link to open.
print_links() {
  local plot_id
  plot_id="$(curl -s --max-time 5 http://127.0.0.1:8000/v1/plots \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0]["id"] if d else "")' 2>/dev/null)"
  echo
  echo "Frontend:     http://localhost:3000/"
  [ -n "$plot_id" ] && echo "A plot page:  http://localhost:3000/plots/$plot_id"
  echo "Registry API: http://localhost:8000/docs   demo UI: http://localhost:8000/ui"
  echo "Planner API:  http://localhost:8002/docs"
}

# Start everything in order (the planner needs registry and weather), then check it all.
start_all() {
  mkdir -p "$STACK_DIR"
  check_postgres
  check_env_files
  local entry name folder port command url
  for entry in "${SERVICES[@]}"; do
    IFS='|' read -r name folder port command url <<< "$entry"
    start_one "$name" "$folder" "$port" "$command" "$url"
    wait_for "$name" "$url"
  done
  check_registry_database
  check_registry_on_postgres
  print_links
}

# Stop every service this script started (by its saved process id).
stop_all() {
  local entry name pid
  for entry in "${SERVICES[@]}"; do
    name="${entry%%|*}"
    if [ -f "$STACK_DIR/$name.pid" ]; then
      pid="$(cat "$STACK_DIR/$name.pid")"
      kill -- "-$pid" 2>/dev/null && echo "$name: stopped" || echo "$name: was not running"
      rm -f "$STACK_DIR/$name.pid"
    else
      echo "$name: not started by this script"
    fi
  done
}

# Show which services answer right now.
status_all() {
  local entry name folder port command url
  for entry in "${SERVICES[@]}"; do
    IFS='|' read -r name folder port command url <<< "$entry"
    if answers "$url"; then echo "$name: up ($url)"; else echo "$name: down"; fi
  done
}

case "${1:-}" in
  start) start_all ;;
  stop) stop_all ;;
  status) status_all ;;
  *) echo "usage: bash stack.sh start|stop|status"; exit 2 ;;
esac
