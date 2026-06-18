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

echo ""
echo "Tip: if build dies with 'signal: killed', add 2GB swap:  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile"
echo ""

if ! docker compose --env-file "$ENV_FILE" build "${NO_CACHE[@]}" app; then
  echo "Build failed. On small VPS this is often OOM — add swap (see tip above) and retry." >&2
  exit 1
fi

docker compose --env-file "$ENV_FILE" up -d --remove-orphans app

sleep 3
if ! docker ps --format '{{.Names}}' | grep -qE '^crm-app$'; then
  echo "Container crm-app is not running. Logs:" >&2
  docker logs crm-app --tail 40 2>&1 || true
  exit 1
fi

echo "Deploy complete. Run ./scripts/diagnose-vps.sh if the site still errors."
