# GW2LOGS

A Guild Wars 2 combat log platform prototype — upload arcdps logs, browse encounter leaderboards, compare parses, and track player/guild progression.

Implements the design at `claude.ai/design` (`GW2 Logs.dc.html`), built with React, TypeScript, React Router, and Vite. Data is currently mocked (`src/data/gw2-data.ts`) so every page renders realistic, internally-consistent numbers.

## Pages

- **Encounters** (`/encounters/:bossName`) — hero banner, boss stats, profession filters, per-fight leaderboard
- **Leaderboards** (`/leaderboards`) — global dense leaderboard table
- **Player profile** (`/players/:name`) — best parses, profession breakdown, recent uploads
- **Guilds** (`/guilds/:tag`) — roster, guild stats, CM progression
- **Compare** (`/compare`) — head-to-head log comparison
- **Log detail** (`/logs/:id`) — DPS breakdown, boon uptime heatmap, mechanics, fight timeline
- **Upload** (`/upload`) — drop zone + processing queue
- **Search** (`/search`) — grouped results across players, guilds, bosses
- **Login** (`/login`) — Discord OAuth / anonymous upload

## Development

```bash
npm install
npm run dev
```

```bash
npm run build   # type-check + production build
```
