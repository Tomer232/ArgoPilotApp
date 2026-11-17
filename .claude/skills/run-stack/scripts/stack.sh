#!/usr/bin/env bash
# Start, stop or check the whole AgroPilot system on this machine.
#   bash stack.sh start            registry (on 'registry'), weather, planner, frontend; wait until each answers
#   bash stack.sh start qa         the same, but the registry runs on 'registry_qa', wiped and seeded first
#   bash stack.sh stop [service]   stop everything this script started, or one service
#   bash stack.sh restart service  start one stopped service again, in the mode the stack runs in
#   bash stack.sh status           show which services answer, and the mode
# Logs, process ids and the mode go to $STACK_DIR (default /tmp/agropilot-stack).

set -u

REPO="$(cd "$(dirname "$0")/../../../.." && pwd)"
SCRIPTS="$(cd "$(dirname "$0")" && pwd)"
STACK_DIR="${STACK_DIR:-/tmp/agropilot-stack}"
MODE_FILE="$STACK_DIR/mode"
WAIT_SECONDS=60

# The QA database. No password here: PostgreSQL reads it from ~/.pgpass, so no script or agent sees it.
QA_DATABASE_URL="${QA_DATABASE_URL:-postgresql+psycopg://registry@localhost:5432/registry_qa?connect_timeout=3&options=-c%20statement_timeout%3D5000}"

# name | folder | port | start command | url that must answer 200
SERVICES=(
  "registry|services/registry-service|8000|uv run uvicorn main:app --port 8000|http://127.0.0.1:8000/health"
  "weather|services/weather-service|8001|uv run uvicorn main:app --port 8001|http://127.0.0.1:8001/health"
  "planner|services/planner-service|8002|uv run uvicorn main:app --port 8002|http://127.0.0.1:8002/health"
  "frontend|services/frontend|3000|npm run dev -- --port 3000|http://127.0.0.1:3000/"
)

# Print one line and stop the script with exit code 1.
fail() {
  echo "FAILED: $1" >&2
  exit 1
}

# True if the url answers with HTTP 200.
answers() {
  [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$1")" = "200" ]
}

# The mode the stack was started in: "normal" or "qa" (normal when nothing was started).
current_mode() {
  cat "$MODE_FILE" 2>/dev/null || echo normal
}

# True if any of the four services answers.
any_up() {
  local entry url
  for entry in "${SERVICES[@]}"; do
    url="${entry##*|}"
    answers "$url" && return 0
  done
  return 1
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

# Wipe registry_qa and seed it again (the Python script refuses any name not ending in _qa).
reset_qa_database() {
  (cd "$REPO/services/registry-service" && DATABASE_URL="$QA_DATABASE_URL" uv run python "$SCRIPTS/reset_qa_db.py") \
    || fail "could not reset the QA database (message above)"
}

# Start one service in the background, in its own process group so stop can end all its children.
# In qa mode the registry gets DATABASE_URL from the environment, which wins over its .env.
start_one() {
  local name="$1" folder="$2" port="$3" command="$4" url="$5"
  if answers "$url"; then
    echo "$name: already running on port $port, left as is"
    return
  fi
  if ss -ltn "sport = :$port" | grep -q LISTEN; then
    fail "$name: port $port is taken by something that is not $name. Free it and try again."
  fi
  (
    cd "$REPO/$folder" || exit 1
    if [ "$name" = registry ] && [ "$(current_mode)" = qa ]; then
      export DATABASE_URL="$QA_DATABASE_URL"
    fi
    # The new shell writes its own id ($$) after setsid, so the saved id is the process group stop must end.
    setsid bash -c 'echo $$ > "$1"; exec $2' _ "$STACK_DIR/$name.pid" "$command" \
      > "$STACK_DIR/$name.log" 2>&1 < /dev/null &
  )
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
  [ "$code" = "200" ] || fail "registry is up but GET /v1/farms gave $code. Is its database created and seeded?"
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
  echo "Mode:         $(current_mode)"
  echo "Frontend:     http://localhost:3000/"
  [ -n "$plot_id" ] && echo "A plot page:  http://localhost:3000/plots/$plot_id"
  echo "Registry API: http://localhost:8000/docs   demo UI: http://localhost:8000/ui"
  echo "Planner API:  http://localhost:8002/docs"
}

# Start everything in order (the planner needs registry and weather), then check it all.
start_all() {
  local mode="${1:-normal}"
  [ "$mode" = normal ] || [ "$mode" = qa ] || fail "unknown mode '$mode' (use: start, or start qa)"
  mkdir -p "$STACK_DIR"
  if any_up && [ ! -f "$MODE_FILE" ]; then
    fail "services are already running, not started by this script (or still shutting down). Check 'status', then stop them first."
  fi
  if any_up && [ "$mode" != "$(current_mode)" ]; then
    fail "services are already running in $(current_mode) mode. Run 'bash .claude/skills/run-stack/scripts/stack.sh stop' first."
  fi
  if [ "$mode" = qa ] && any_up; then
    fail "QA starts from a fresh database, so nothing may be running. Run 'bash .claude/skills/run-stack/scripts/stack.sh stop' first."
  fi
  check_postgres
  check_env_files
  echo "$mode" > "$MODE_FILE"
  if [ "$mode" = qa ]; then
    reset_qa_database
  fi
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

# Stop one service this script started (by its saved process id), and wait until its port is free,
# so a start right after it doesn't find the old process still answering.
stop_one() {
  local name="$1" port="$2" pid waited=0
  if [ ! -f "$STACK_DIR/$name.pid" ]; then
    echo "$name: not started by this script"
    return
  fi
  pid="$(cat "$STACK_DIR/$name.pid")"
  rm -f "$STACK_DIR/$name.pid"
  if ! kill -- "-$pid" 2>/dev/null; then
    echo "$name: was not running"
    return
  fi
  while ss -ltn "sport = :$port" | grep -q LISTEN; do
    sleep 0.5
    waited=$((waited + 1))
    [ "$waited" -lt 30 ] || fail "$name: still listening on port $port 15 s after stop"
  done
  echo "$name: stopped"
}

# Stop every service, or only the one named.
stop_services() {
  local only="${1:-}" entry name folder port command url
  [ -z "$only" ] || service_entry "$only" > /dev/null
  for entry in "${SERVICES[@]}"; do
    IFS='|' read -r name folder port command url <<< "$entry"
    if [ -z "$only" ] || [ "$only" = "$name" ]; then
      stop_one "$name" "$port"
    fi
  done
  [ -n "$only" ] || rm -f "$MODE_FILE"
}

# The SERVICES line for a name, or fail if there is no such service.
service_entry() {
  local entry
  for entry in "${SERVICES[@]}"; do
    [ "${entry%%|*}" = "$1" ] && { echo "$entry"; return; }
  done
  fail "no service '$1' (registry, weather, planner, frontend)"
}

# Start one service again (after stop <service>), in the mode the stack runs in.
restart_service() {
  local name folder port command url
  [ -n "${1:-}" ] || fail "restart needs a service: registry, weather, planner or frontend"
  service_entry "$1" > /dev/null  # fails here, in this shell, on an unknown name
  IFS='|' read -r name folder port command url <<< "$(service_entry "$1")"
  start_one "$name" "$folder" "$port" "$command" "$url"
  wait_for "$name" "$url"
}

# Show which services answer right now, and the mode.
status_all() {
  local entry name folder port command url
  for entry in "${SERVICES[@]}"; do
    IFS='|' read -r name folder port command url <<< "$entry"
    if answers "$url"; then echo "$name: up ($url)"; else echo "$name: down"; fi
  done
  echo "mode: $(current_mode)"
}

case "${1:-}" in
  start) start_all "${2:-normal}" ;;
  stop) stop_services "${2:-}" ;;
  restart) restart_service "${2:-}" ;;
  status) status_all ;;
  *) echo "usage: bash stack.sh start [qa] | stop [service] | restart <service> | status"; exit 2 ;;
esac
