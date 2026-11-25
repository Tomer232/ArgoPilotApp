#!/usr/bin/env bash
# Run every test suite in the repo and print one line per suite.
#   bash .claude/skills/test/scripts/run-all.sh
# Suites: registry, weather and planner (pytest), frontend (vitest, lint, build).
# Each suite's full output goes to $LOG_DIR/<suite>.log (default /tmp/agropilot-tests).
# Exit code 0 only when every suite passed. Used by the deploy and submit-task skills.

set -u

REPO="$(cd "$(dirname "$0")/../../../.." && pwd)"
LOG_DIR="${LOG_DIR:-/tmp/agropilot-tests}"
FAILED=0

# Run one suite in a folder, save its output, print "PASS|FAIL <suite>  (log)".
run_suite() {
  local name="$1" folder="$2"; shift 2
  local log="$LOG_DIR/$name.log"
  if (cd "$REPO/$folder" && "$@") > "$log" 2>&1; then
    echo "PASS  $name  ($log)"
  else
    echo "FAIL  $name  ($log)"
    FAILED=1
  fi
}

# True if the frontend dev server answers on port 3000.
frontend_running() {
  [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 http://127.0.0.1:3000/)" != "000" ]
}

mkdir -p "$LOG_DIR"

run_suite registry services/registry-service uv run pytest -q --cov
run_suite weather  services/weather-service  uv run pytest -q --cov
run_suite planner  services/planner-service  uv run pytest -q --cov
run_suite frontend-test services/frontend npm run coverage
run_suite frontend-lint services/frontend npm run lint

# npm run build rewrites .next, which breaks a running dev server.
if frontend_running; then
  echo "SKIP  frontend-build  (the frontend runs on :3000; stop it to build)"
  FAILED=1
else
  run_suite frontend-build services/frontend npm run build
fi

exit "$FAILED"
