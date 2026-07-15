# GW2LOGS

A Guild Wars 2 combat log platform — upload arcdps logs, browse real encounter leaderboards, compare parses, and track player progression. Implements the design at `claude.ai/design` (`GW2 Logs.dc.html`).

Frontend: React + TypeScript + React Router + Vite.
Backend: Node.js + Express + Prisma + PostgreSQL, with real log parsing delegated to [dps.report](https://dps.report)'s API.

## What's real vs. not yet built

- **Real**: uploads (parsed via dps.report), leaderboards, player profiles, log detail (DPS/boons/mechanics/timeline), search, global stats — all backed by Postgres, no mock data.
- **Not yet built**: accounts/Discord login (uploads work without one), and guild rosters (arcdps logs carry no guild membership, so this needs an accounts system first). Both pages say so in the UI rather than showing fake data.

## Pages

- **Encounters** (`/encounters`, `/encounters/:bossName`) — per-fight leaderboard, hero stats, profession filters
- **Leaderboards** (`/leaderboards`) — pick any uploaded encounter, see its ranked table
- **Player profile** (`/players/:account`) — best parses, profession breakdown, recent uploads
- **Compare** (`/compare?logIdA=&accountA=&logIdB=&accountB=`) — head-to-head log comparison
- **Log detail** (`/logs/:id`) — DPS breakdown, boon uptime heatmap, mechanics, fight timeline
- **Upload** (`/upload`) — drop zone + live processing queue, real dps.report parsing
- **Search** (`/search`) — players and bosses
- **Login** (`/login`) — placeholder; Discord OAuth not wired up yet

## Project layout

```
src/            frontend (Vite + React)
server/         backend API (Express + Prisma)
  prisma/       schema + migrations
  src/lib/      dps.report client, EI-JSON → DB mapping
deploy/         docker-compose, Nginx config, VPS setup script
```

## Local development

Requires Node 22+, Docker (for Postgres), or a local Postgres install.

```bash
# 1. Database (either works)
docker run -d --name gw2logs-pg -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=gw2logs -p 5432:5432 postgres:16-alpine

# 2. Backend
cd server
cp .env.example .env   # edit DATABASE_URL to match your Postgres
npm install
npm run prisma:migrate:dev
npm run dev             # http://localhost:4000

# 3. Frontend (separate terminal, repo root)
npm install
npm run dev              # http://localhost:5173, proxies /api to :4000
```

Optional: `cd server && npm run seed:demo` populates a couple of demo logs so the UI isn't empty while developing.

## Deploying to a VPS

See `deploy/setup.sh` — installs Docker, Node, Nginx, and Certbot; builds the frontend; starts Postgres + the API in Docker; wires up Nginx. Run from inside a clone of this repo on the VPS:

```bash
sudo ./deploy/setup.sh yourdomain.com
```
