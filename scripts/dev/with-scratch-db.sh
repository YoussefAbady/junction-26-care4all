#!/usr/bin/env bash
# Runs a command against a scratch PostgreSQL database inside the local care4all-db-1 container.
#   bash scripts/dev/with-scratch-db.sh <name> -- <command> [args...]   create care4all_<name> if missing, run the command
#   bash scripts/dev/with-scratch-db.sh <name> --drop                    drop care4all_<name>
# DATABASE_URL and CONTENT_TEST_DATABASE_URL point at the scratch database while the command runs. The password is read
# from .env.docker at run time and is never printed. This never touches the care4all database the app uses.
set -euo pipefail
name="${1:?usage: with-scratch-db.sh <name> -- <command> | <name> --drop}"; shift
case "$name" in care4all|postgres|template0|template1|*[!a-z0-9_]*) echo "name: lower-case letters, digits and _ only, and not a system database" >&2; exit 2;; esac
root="$(cd "$(dirname "$0")/../.." && pwd)"
read_var() { sed 's/^\xef\xbb\xbf//' "$root/.env.docker" | tr -d '\r' | grep -E "^$1=" | head -1 | cut -d= -f2-; }
pw="$(read_var POSTGRES_PASSWORD)"; port="$(read_var POSTGRES_PORT)"; port="${port:-5432}"
[ -n "$pw" ] || { echo "POSTGRES_PASSWORD is missing from .env.docker" >&2; exit 2; }
case "$pw" in *[!A-Za-z0-9_.~-]*) echo "the password has characters that need URL encoding" >&2; exit 2;; esac
db="care4all_${name}"
admin() { docker exec -i care4all-db-1 psql -U care4all -d postgres -v ON_ERROR_STOP=1 -qtA "$@"; }
if [ "${1:-}" = "--drop" ]; then admin -c "DROP DATABASE IF EXISTS \"$db\" WITH (FORCE)" >/dev/null; echo "dropped $db"; exit 0; fi
[ "${1:-}" = "--" ] || { echo "usage: with-scratch-db.sh <name> -- <command> | <name> --drop" >&2; exit 2; }
shift
[ "$(admin -c "SELECT 1 FROM pg_database WHERE datname='$db'")" = "1" ] || admin -c "CREATE DATABASE \"$db\"" >/dev/null
url="postgresql://care4all:${pw}@127.0.0.1:${port}/${db}"
DATABASE_URL="$url" CONTENT_TEST_DATABASE_URL="$url" exec "$@"
