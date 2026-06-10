#!/usr/bin/env bash
# Production deploy for VPS (Docker). Run from repo root on the server.
set -euo pipefail

cd /var/www/crm-app

git fetch origin
git checkout main
git pull origin main

ENV_FILE=".env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy env.local.example and fill in Supabase keys." >&2
  exit 1
fi

chmod +x scripts/check-env-local.sh 2>/dev/null || true
./scripts/check-env-local.sh "$ENV_FILE" --container || {
  echo "Fix $ENV_FILE before deploying (see errors above)." >&2
  exit 1
}

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
