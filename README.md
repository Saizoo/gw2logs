# GW2LOGS

A Guild Wars 2 combat log platform — upload arcdps logs, browse real encounter leaderboards, compare parses, and track player progression. Implements the design at `claude.ai/design` (`GW2 Logs.dc.html`).

Frontend: React + TypeScript + React Router + Vite.
Backend: Node.js + Express + Prisma + PostgreSQL, with log parsing handled by a self-hosted [Elite Insights](https://github.com/baaron4/GW2-Elite-Insights-Parser) (the same open-source parser dps.report itself wraps) — no third-party service dependency, logs never leave your own server.

## What's real vs. not yet built

- **Real**: uploads (parsed locally via Elite Insights), leaderboards, player profiles, log detail (DPS/boons/mechanics/timeline), search, global stats — all backed by Postgres, no mock data.
- **Not yet built**: accounts/Discord login (uploads work without one), and guild rosters (arcdps logs carry no guild membership, so this needs an accounts system first). Both pages say so in the UI rather than showing fake data.

## Pages

- **Encounters** (`/encounters`, `/encounters/:bossName`) — per-fight leaderboard, hero stats, profession filters
- **Leaderboards** (`/leaderboards`) — pick any uploaded encounter, see its ranked table
- **Player profile** (`/players/:account`) — best parses, profession breakdown, recent uploads
- **Compare** (`/compare?logIdA=&accountA=&logIdB=&accountB=`) — head-to-head log comparison
- **Log detail** (`/logs/:id`) — DPS breakdown, boon uptime heatmap, mechanics, fight timeline
- **Upload** (`/upload`) — drop zone + live processing queue, real local parsing
- **Search** (`/search`) — players and bosses
- **Login** (`/login`) — placeholder; Discord OAuth not wired up yet

## Project layout

```
src/            frontend (Vite + React)
server/         backend API (Express + Prisma)
  Dockerfile    multi-stage build: compiles Elite Insights from source (.NET 8),
                bundles it alongside the Node API
  ei-settings.conf   Elite Insights CLI config (JSON output only)
  prisma/       schema + migrations
  src/lib/      eliteInsights.ts (parser invocation), ingest.ts (EI-JSON → DB mapping)
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
```

Note: `npm run dev` runs the API directly on your machine, not in Docker — it won't have Elite Insights available unless you also have the .NET 8 SDK and a build of the parser locally (set `EI_COMMAND`/`EI_DLL_PATH`/`EI_CONFIG_PATH` env vars to point at it). For testing the full upload → parse → DB pipeline without that, use `docker compose up --build` instead, which bundles Elite Insights automatically, or `npm run seed:demo` to populate fixture data and work on everything downstream of parsing.

```bash
# 3. Frontend (separate terminal, repo root)
npm install
npm run dev              # http://localhost:5173, proxies /api to :4000
```

## Deploying to a VPS

See `deploy/setup.sh` — installs Docker, Node, Nginx, and Certbot; builds the frontend; starts Postgres + the API (with Elite Insights baked in) in Docker; wires up Nginx. Run from inside a clone of this repo on the VPS:

```bash
sudo ./deploy/setup.sh yourdomain.com
```

The first `docker compose up --build` will take a few minutes longer than before, since it now compiles Elite Insights from source as part of the API image build.
