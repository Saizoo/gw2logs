#!/usr/bin/env bash
# One-time VPS bootstrap for GW2LOGS. Run as root (or with sudo) from inside
# the cloned repo, e.g.:
#   git clone <your-repo-url> gw2logs && cd gw2logs
#   sudo ./deploy/setup.sh yourdomain.com
#
# Safe to re-run — each step checks whether it's already done.
set -euo pipefail

DOMAIN="${1:-}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_ROOT=/var/www/gw2logs

echo "==> Repo: $REPO_DIR"

echo "==> Installing base packages (curl, nginx, certbot)"
apt-get update -qq
apt-get install -y -qq curl nginx certbot python3-certbot-nginx ca-certificates gnupg rsync

if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  echo "==> Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi

if ! command -v docker >/dev/null; then
  echo "==> Installing Docker"
  curl -fsSL https://get.docker.com | sh
fi

echo "==> Building frontend"
cd "$REPO_DIR"
npm ci
npm run build

echo "==> Publishing frontend build to $WEB_ROOT"
mkdir -p "$WEB_ROOT"
rsync -a --delete "$REPO_DIR/dist/" "$WEB_ROOT/"

if [ ! -f "$REPO_DIR/.env" ]; then
  echo "==> Generating $REPO_DIR/.env with a random Postgres password and encryption key"
  RANDOM_PW="$(openssl rand -hex 24)"
  ENCRYPTION_KEY="$(openssl rand -hex 32)"
  REDIRECT_URI="https://${DOMAIN:-yourdomain.com}/api/auth/discord/callback"
  cat > "$REPO_DIR/.env" <<EOF
POSTGRES_USER=gw2logs
POSTGRES_PASSWORD=$RANDOM_PW
POSTGRES_DB=gw2logs

# Fill these in from https://discord.com/developers/applications (OAuth2 tab)
# before starting the API — Discord login won't work without them.
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=$REDIRECT_URI

ENCRYPTION_KEY=$ENCRYPTION_KEY

# Comma-separated Discord user IDs (snowflakes, not usernames) that get
# auto-promoted to admin on login — see server/src/routes/auth.ts. Enable
# Developer Mode in Discord (User Settings > Advanced), then right-click
# your own username anywhere and "Copy User ID". Leave blank for none.
ADMIN_DISCORD_IDS=
EOF
fi

if ! grep -q '^DISCORD_CLIENT_ID=.\+' "$REPO_DIR/.env" || ! grep -q '^DISCORD_CLIENT_SECRET=.\+' "$REPO_DIR/.env"; then
  echo ""
  echo "==> DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET are not set in $REPO_DIR/.env"
  echo "    Create an application at https://discord.com/developers/applications, add an"
  echo "    OAuth2 redirect of $REPO_DIR/.env's DISCORD_REDIRECT_URI, fill in the two values,"
  echo "    then re-run this script (or just: docker compose up -d --build)."
  exit 1
fi

echo "==> Starting Postgres + API (docker compose)"
cd "$REPO_DIR"
docker compose up -d --build

echo "==> Waiting for API to come up"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:4000/api/health >/dev/null 2>&1; then
    echo "    API is healthy."
    break
  fi
  sleep 2
done

if [ -n "$DOMAIN" ]; then
  echo "==> Writing Nginx config for $DOMAIN"
  sed "s/__DOMAIN__/$DOMAIN/g" "$REPO_DIR/deploy/nginx.conf.template" > /etc/nginx/sites-available/gw2logs
  ln -sf /etc/nginx/sites-available/gw2logs /etc/nginx/sites-enabled/gw2logs
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl reload nginx

  echo ""
  echo "==> Done. Next steps:"
  echo "    1. Point $DOMAIN's DNS A record at this server's IP (if you haven't already)."
  echo "    2. Once DNS has propagated, run: certbot --nginx -d $DOMAIN"
else
  echo ""
  echo "==> No domain given, skipped Nginx/TLS setup."
  echo "    Re-run as: ./deploy/setup.sh yourdomain.com"
  echo "    Or write /etc/nginx/sites-available/gw2logs by hand from deploy/nginx.conf.template."
fi

echo ""
echo "==> Frontend: $WEB_ROOT (served by Nginx)"
echo "==> API:      http://127.0.0.1:4000 (proxied at /api by Nginx)"
echo "==> Logs:     docker compose logs -f api"
