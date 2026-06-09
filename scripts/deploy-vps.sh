#!/usr/bin/env bash
# Production deploy for VPS (Docker). Run from repo root on the server.
set -euo pipefail

cd /var/www/crm-app

git fetch origin
git checkout main
git pull origin main

ENV_FILE=".env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — create it with production secrets before deploying." >&2
  exit 1
fi

NO_CACHE=()
if [[ "${1:-}" == "--no-cache" ]]; then
  NO_CACHE=(--no-cache)
  echo "Building with --no-cache (full rebuild; expect 15–25 min on small VPS)."
else
  echo "Building with layer cache (typical code-only deploy: 2–8 min)."
fi

docker compose --env-file "$ENV_FILE" build "${NO_CACHE[@]}" app
docker compose --env-file "$ENV_FILE" up -d app

echo "Deploy complete."
