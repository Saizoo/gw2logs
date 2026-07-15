#!/usr/bin/env bash
# Deploys the latest committed code to a VPS already set up by setup.sh.
# Run as root (or with sudo) from inside the cloned repo:
#   cd gw2logs && sudo ./deploy/update.sh [branch]
#
# Pulls the given branch (default: whatever's currently checked out),
# rebuilds the frontend, rebuilds+restarts the API container (which runs
# `prisma migrate deploy` on startup — see server/Dockerfile), and reloads
# Nginx to pick up the new static build. Safe to re-run.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_ROOT=/var/www/gw2logs
BRANCH="${1:-$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD)}"

echo "==> Repo: $REPO_DIR (branch: $BRANCH)"

cd "$REPO_DIR"
echo "==> Pulling latest $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "==> Building frontend"
npm ci
npm run build

echo "==> Publishing frontend build to $WEB_ROOT"
rsync -a --delete "$REPO_DIR/dist/" "$WEB_ROOT/"

echo "==> Rebuilding and restarting API (runs pending Prisma migrations on startup)"
docker compose up -d --build api

echo "==> Waiting for API to come back up"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:4000/api/health >/dev/null 2>&1; then
    echo "    API is healthy."
    break
  fi
  sleep 2
done

echo "==> Reloading Nginx"
nginx -t && systemctl reload nginx

echo ""
echo "==> Done. Recent API logs:"
docker compose logs --tail 20 api
