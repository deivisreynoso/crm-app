#!/usr/bin/env bash
# Production deploy for VPS (Docker). Run from repo root on the server.
set -euo pipefail

cd /var/www/crm-app

git fetch origin
git checkout main
git pull origin main

docker compose build --no-cache app
docker compose up -d app

echo "Deploy complete."
