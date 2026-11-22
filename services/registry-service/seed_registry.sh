#!/usr/bin/env bash
# Build a small SQLite file for registry-service.
# Safe to run again: it deletes the file and writes a fresh one.
# The schema lives in tables.py and the rows in seed.py (which also seeds PostgreSQL).
#
# Usage, from services/registry-service:
#   bash seed_registry.sh
#   bash seed_registry.sh /path/to/registry.db

set -euo pipefail

db="${1:-registry.db}"
rm -f "$db"

# DATABASE_URL here wins over .env, so this works with or without a .env file.
DATABASE_URL="sqlite:///$(realpath -m "$db")" uv run python seed.py
