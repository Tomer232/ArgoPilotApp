#!/usr/bin/env bash
# One-time server setup, safe to run on every deploy: each step checks first and
# does nothing when it is already done. Run as root by update.sh, with the
# database password in the environment variable DB_PASSWORD.

set -euo pipefail

APP=/opt/agropilot/app
REPO=https://github.com/Tomer232/ArgoPilotApp.git
NODE_INDEX=https://nodejs.org/dist/latest-v22.x

# Run a command as the service account.
as_agropilot() {
  sudo -u agropilot -H env HOME=/opt/agropilot NEXT_TELEMETRY_DISABLED=1 "$@"
}

# Install the packages that are missing.
install_packages() {
  local missing=()
  for package in postgresql git curl xz-utils sqlite3; do
    dpkg -s "$package" > /dev/null 2>&1 || missing+=("$package")
  done
  if [ "${#missing[@]}" -gt 0 ]; then
    apt-get update -q
    DEBIAN_FRONTEND=noninteractive apt-get install -y -q "${missing[@]}"
  fi
  systemctl enable --now postgresql
}

# Install Node.js 22 from nodejs.org into /usr/local, checked with SHASUMS256.txt, unless v22 is there.
install_node() {
  if command -v node > /dev/null && [[ "$(node -v)" == v22.* ]]; then
    return
  fi
  local folder file
  folder="$(mktemp -d)"
  curl -fsSL -o "$folder/SHASUMS256.txt" "$NODE_INDEX/SHASUMS256.txt"
  file="$(grep -o 'node-v22[0-9.]*-linux-x64\.tar\.xz' "$folder/SHASUMS256.txt" | head -n 1)"
  curl -fsSL -o "$folder/$file" "$NODE_INDEX/$file"
  (cd "$folder" && grep " $file\$" SHASUMS256.txt | sha256sum -c -)
  tar -xJf "$folder/$file" -C /usr/local --strip-components=1
  rm -rf "$folder"
}

# Install uv into /usr/local/bin unless it is there.
install_uv() {
  if command -v uv > /dev/null; then
    return
  fi
  curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin UV_NO_MODIFY_PATH=1 sh
}

# Create the service account unless it exists.
create_account() {
  if id agropilot > /dev/null 2>&1; then
    return
  fi
  useradd --system --create-home --home-dir /opt/agropilot --shell /usr/sbin/nologin agropilot
}

# Clone the code unless it is already there.
clone_code() {
  if [ -d "$APP/.git" ]; then
    return
  fi
  as_agropilot git clone -q "$REPO" "$APP"
}

# Create the role and the database if missing, and set the role's password every run.
# The SQL goes to psql on stdin (printf is a builtin), so the password is never in a command line.
setup_database() {
  {
    printf "\\\\set pw '%s'\n" "$DB_PASSWORD"
    cat <<'SQL'
SELECT 'CREATE ROLE registry LOGIN'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'registry') \gexec
ALTER ROLE registry PASSWORD :'pw';
SELECT 'CREATE DATABASE registry OWNER registry'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'registry') \gexec
SQL
  } | sudo -u postgres psql -X -q -v ON_ERROR_STOP=1 -d postgres
}

# Fill the empty registry database with the demo rows; leave a database that has tables alone.
seed_if_empty() {
  local tables
  tables="$(sudo -u postgres psql -X -tA -d registry \
    -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")"
  [ "$tables" = "0" ] || return 0
  as_agropilot sh -c "cd $APP/services/registry-service && uv sync --frozen --no-dev -q"
  # The URL goes through the environment (sudo keeps only this name), not a command line.
  export DATABASE_URL="postgresql+psycopg://registry:$DB_PASSWORD@localhost:5432/registry"
  sudo -u agropilot -H --preserve-env=DATABASE_URL sh -c \
    "cd $APP/services/registry-service && .venv/bin/python seed.py"
}

[ -n "${DB_PASSWORD:-}" ] || { echo "DB_PASSWORD is not set."; exit 1; }

install_packages
install_node
install_uv
create_account
clone_code
setup_database
seed_if_empty
echo "Setup done."
