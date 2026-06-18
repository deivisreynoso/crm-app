#!/usr/bin/env bash
# Quick production diagnostics — run on the VPS from repo root.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== Memory / swap ==="
free -h || true
echo ""

echo "=== Docker containers (crm + caddy) ==="
docker ps -a --filter "name=crm-app" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' || true
docker ps -a --filter "name=caddy" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' || true
echo ""

echo "=== Listening on 80 / 443 ==="
if command -v ss >/dev/null 2>&1; then
  ss -tlnp | grep -E ':80 |:443 ' || echo "Nothing listening on 80/443"
else
  echo "(ss not available)"
fi
echo ""

CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E '^crm-app$' | head -1 || true)
if [[ -z "$CONTAINER" ]]; then
  CONTAINER=$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E 'crm-app' | head -1 || true)
fi

if [[ -n "$CONTAINER" ]]; then
  echo "=== Last 80 log lines: $CONTAINER ==="
  docker logs "$CONTAINER" --tail 80 2>&1 || true
  echo ""
  echo "=== Health (inside container) ==="
  docker exec "$CONTAINER" node -e \
    "fetch('http://127.0.0.1:3000/api/health').then(async (r)=>{console.log(r.status, await r.text())}).catch((e)=>{console.error(e);process.exit(1)})" \
    2>&1 || true
else
  echo "No running crm-app container."
fi

echo ""
echo "=== Host health (127.0.0.1:3000) ==="
if command -v curl >/dev/null 2>&1; then
  curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3000/api/health || echo "curl failed — is port 3000 published?"
else
  echo "(install curl to test from host)"
fi

echo ""
if [[ -f .env.local ]]; then
  echo "=== Env check ==="
  chmod +x scripts/check-env-local.sh 2>/dev/null || true
  ./scripts/check-env-local.sh .env.local --container || true
else
  echo "Missing .env.local"
fi
