#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

run_migration() {
  local env_name="$1"
  local env_var="$2"
  local url="${!env_var:-}"

  if [[ -z "$url" ]]; then
    echo "[SKIP] ${env_name}: ${env_var} is not set"
    return 0
  fi

  echo "[RUN] ${env_name}: running migrations"
  (
    cd "$ROOT_DIR"
    DATABASE_URL="$url" npm run migration:run
  )
  echo "[DONE] ${env_name}: migrations complete"
}

run_migration "development" "DATABASE_URL"
run_migration "staging" "DATABASE_URL_STAGING"
run_migration "production" "DATABASE_URL_PRODUCTION"

echo "Migration execution finished."
