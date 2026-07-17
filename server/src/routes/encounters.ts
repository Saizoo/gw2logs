import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { BOSS_WING, canonicalFightName, categorizeFight } from '../lib/bossMeta.js';

export const encountersRouter = Router();

// Canonical ordering for the Encounters overview, derived from BOSS_WING's
// declaration order: wings appear in release order, bosses in wing order.
const BOSS_ORDER = new Map(Object.keys(BOSS_WING).map((name, i) => [name, i]));
const WING_ORDER = new Map<string, number>();
for (const wing of Object.values(BOSS_WING)) {
  if (!WING_ORDER.has(wing)) WING_ORDER.set(wing, WING_ORDER.size);
}

interface OverviewTopParse {
  dps: number;
  pct: number;
  spec: string;
  profession: string;
  account: string;
}

interface OverviewRecentLog {
  id: string;
  isCm: boolean;
  success: boolean;
  squadDps: number;
  durationMs: number;
  date: Date;
  topParse: OverviewTopParse | null;
}

interface OverviewBestParse {
  logId: string;
  dps: number;
  spec: string;
  profession: string;
  account: string;
  isCm: boolean;
}

interface OverviewEncounter {
  fightName: string;
  hasCm: boolean;
  logCount: number;
  kills: number;
  bestSquadDps: number;
  fastestKillMs: number | null;
  lastDate: Date;
  recent: OverviewRecentLog[];
  bestParse: OverviewBestParse | null;
}

// Recent logs regrouped wing → boss for the Encounters page. Wing labels
// are re-derived from fightName (not the stored `wing` column) so logs
// ingested before a mapping fix still land in the right wing; fractal CMs
// get their own bucket since they have no wing, and anything unmapped
// falls into "Other".
encountersRouter.get('/overview', asyncHandler(async (_req, res) => {
  const logs = await prisma.log.findMany({
    select: {
      id: true,
      fightName: true,
      isCm: true,
      success: true,
      durationMs: true,
      squadDps: true,
      encounterTime: true,
      wing: true,
      _count: { select: { players: true } },
    },
    orderBy: { encounterTime: 'desc' },
    take: 2000,
  });

  const RECENT_PER_BOSS = 3;
  const wings = new Map<string, Map<string, OverviewEncounter>>();
  for (const log of logs) {
    // Old rows may still carry a raw EI name ("Cairn CM", "Aetherblade
    // Hideout") — canonicalize on read so they merge with new clean rows
    // into one card instead of fragmenting into "Other".
    const fightName = canonicalFightName(log.fightName);
    const wing =
      categorizeFight(fightName, log._count.players) === 'fractal'
        ? 'Fractal CMs'
        : BOSS_WING[fightName] ?? log.wing ?? 'Other';
    let bosses = wings.get(wing);
    if (!bosses) wings.set(wing, (bosses = new Map()));
    let enc = bosses.get(fightName);
    if (!enc) {
      bosses.set(fightName, (enc = {
        fightName,
        hasCm: false,
        logCount: 0,
        kills: 0,
        bestSquadDps: 0,
        fastestKillMs: null,
        lastDate: log.encounterTime, // logs arrive newest-first
        recent: [],
        bestParse: null,
      }));
    }
    enc.logCount += 1;
    enc.hasCm ||= log.isCm;
    if (log.success) {
      enc.kills += 1;
      if (enc.fastestKillMs === null || log.durationMs < enc.fastestKillMs) enc.fastestKillMs = log.durationMs;
    }
    if (log.squadDps > enc.bestSquadDps) enc.bestSquadDps = log.squadDps;
    if (enc.recent.length < RECENT_PER_BOSS) {
      enc.recent.push({
        id: log.id,
        isCm: log.isCm,
        success: log.success,
        squadDps: log.squadDps,
        durationMs: log.durationMs,
        date: log.encounterTime,
        topParse: null,
      });
    }
  }

  // Parse enrichment: each recent log's top performer with their percentile
  // against the whole population for that boss+CM (same convention as the
  // All Logs badges), plus the single best individual parse ever recorded
  // on each boss (kills only).
  const allEncounters = [...wings.values()].flatMap((bosses) => [...bosses.values()]);
  const recentIds = allEncounters.flatMap((enc) => enc.recent.map((r) => r.id));
  const fightNames = allEncounters.map((enc) => enc.fightName);
  if (recentIds.length > 0) {
    const [topPlayers, population, bestRows] = await Promise.all([
      prisma.$queryRaw<{ logId: string; totalDps: number; spec: string; profession: string; account: string }[]>`
        SELECT DISTINCT ON (lp."logId") lp."logId", lp."totalDps", lp.spec, lp.profession, p.account
        FROM "LogPlayer" lp
        JOIN "Player" p ON lp."playerId" = p.id
        WHERE lp."logId" = ANY(${recentIds})
        ORDER BY lp."logId", lp."totalDps" DESC
      `,
      prisma.$queryRaw<{ fightName: string; isCm: boolean; totalDps: number }[]>`
        SELECT l."fightName", l."isCm", lp."totalDps"
        FROM "LogPlayer" lp
        JOIN "Log" l ON lp."logId" = l.id
        WHERE l."fightName" = ANY(${fightNames})
      `,
      prisma.$queryRaw<{ fightName: string; logId: string; totalDps: number; spec: string; profession: string; account: string; isCm: boolean }[]>`
        SELECT DISTINCT ON (l."fightName") l."fightName", lp."logId", lp."totalDps", lp.spec, lp.profession, p.account, l."isCm"
        FROM "LogPlayer" lp
        JOIN "Log" l ON lp."logId" = l.id
        JOIN "Player" p ON lp."playerId" = p.id
        WHERE l.success = true AND l."fightName" = ANY(${fightNames})
        ORDER BY l."fightName", lp."totalDps" DESC
      `,
    ]);

    const populationByKey = new Map<string, number[]>();
    for (const row of population) {
      const key = `${row.fightName}|${row.isCm}`;
      const list = populationByKey.get(key) ?? [];
      list.push(row.totalDps);
      populationByKey.set(key, list);
    }
    for (const list of populationByKey.values()) list.sort((a, b) => a - b);
    // Percentile of `dps` within its sorted population — matches the
    // PERCENT_RANK convention the All Logs route uses (single-row
    // populations read as 100th, not 0th).
    const pctOf = (key: string, dps: number): number => {
      const list = populationByKey.get(key);
      if (!list || list.length <= 1) return 100;
      let below = 0;
      while (below < list.length && list[below] < dps) below++;
      return Math.round((below / (list.length - 1)) * 100);
    };

    const topByLogId = new Map(topPlayers.map((t) => [t.logId, t]));
    const bestByFight = new Map(bestRows.map((b) => [b.fightName, b]));
    for (const enc of allEncounters) {
      const best = bestByFight.get(enc.fightName);
      if (best) {
        enc.bestParse = {
          logId: best.logId,
          dps: best.totalDps,
          spec: best.spec,
          profession: best.profession,
          account: best.account,
          isCm: best.isCm,
        };
      }
      for (const recent of enc.recent) {
        const top = topByLogId.get(recent.id);
        if (top) {
          recent.topParse = {
            dps: top.totalDps,
            pct: pctOf(`${enc.fightName}|${recent.isCm}`, top.totalDps),
            spec: top.spec,
            profession: top.profession,
            account: top.account,
          };
        }
      }
    }
  }

  const wingRank = (name: string) =>
    name === 'Fractal CMs' ? 1e6 : name === 'Other' ? 1e6 + 1 : WING_ORDER.get(name) ?? 1e5;
  const bossRank = (name: string) => BOSS_ORDER.get(name) ?? 1e5;

  res.json(
    [...wings.entries()]
      .sort((a, b) => wingRank(a[0]) - wingRank(b[0]))
      .map(([wing, bosses]) => ({
        wing,
        encounters: [...bosses.values()].sort((a, b) => bossRank(a.fightName) - bossRank(b.fightName)),
      })),
  );
}));

interface BenchmarkRawRow {
  logId: string;
  characterName: string;
  profession: string;
  spec: string;
  totalDps: number;
  powerDps: number;
  condiDps: number;
  squadRole: string;
  account: string;
  fightName: string;
  isCm: boolean;
  encounterTime: Date;
}

// Best parse ever logged on each elite specialization, kills only. Core
// builds are excluded (spec equals profession for those rows) — the
// Benchmarks page is explicitly an elite-spec ranking.
encountersRouter.get('/benchmarks', asyncHandler(async (_req, res) => {
  const rows = await prisma.$queryRaw<BenchmarkRawRow[]>`
    SELECT DISTINCT ON (lp.spec)
           lp."logId", lp."characterName", lp.profession, lp.spec, lp."totalDps", lp."powerDps", lp."condiDps",
           lp."squadRole", p.account, l."fightName", l."isCm", l."encounterTime"
    FROM "LogPlayer" lp
    JOIN "Log" l ON lp."logId" = l.id
    JOIN "Player" p ON lp."playerId" = p.id
    WHERE l.success = true AND lp.spec <> lp.profession
    ORDER BY lp.spec, lp."totalDps" DESC
  `;

  res.json(
    rows
      .sort((a, b) => b.totalDps - a.totalDps)
      .map((r, i) => ({
        rank: i + 1,
        logId: r.logId,
        name: r.characterName,
        account: r.account,
        profession: r.profession,
        spec: r.spec,
        dps: r.totalDps,
        role: r.powerDps >= r.condiDps ? 'power' : 'condi',
        squadRole: r.squadRole,
        fightName: r.fightName,
        isCm: r.isCm,
        date: r.encounterTime,
      })),
  );
}));

// Full DPS distribution per elite specialization (kills only, core builds
// excluded): the box-plot Benchmarks page needs the spread, not just the
// single best. Quantiles are computed here rather than in SQL so the exact
// method (linear interpolation) is one obvious piece of code.
encountersRouter.get('/benchmarks/distribution', asyncHandler(async (_req, res) => {
  const rows = await prisma.$queryRaw<{ spec: string; profession: string; totalDps: number }[]>`
    SELECT lp.spec, lp.profession, lp."totalDps"
    FROM "LogPlayer" lp
    JOIN "Log" l ON lp."logId" = l.id
    WHERE l.success = true AND lp.spec <> lp.profession
  `;
  const bestRows = await prisma.$queryRaw<
    { spec: string; logId: string; totalDps: number; characterName: string; account: string; fightName: string; isCm: boolean; encounterTime: Date }[]
  >`
    SELECT DISTINCT ON (lp.spec)
           lp.spec, lp."logId", lp."totalDps", lp."characterName", p.account, l."fightName", l."isCm", l."encounterTime"
    FROM "LogPlayer" lp
    JOIN "Log" l ON lp."logId" = l.id
    JOIN "Player" p ON lp."playerId" = p.id
    WHERE l.success = true AND lp.spec <> lp.profession
    ORDER BY lp.spec, lp."totalDps" DESC
  `;

  const bySpec = new Map<string, { profession: string; values: number[] }>();
  for (const row of rows) {
    let entry = bySpec.get(row.spec);
    if (!entry) bySpec.set(row.spec, (entry = { profession: row.profession, values: [] }));
    entry.values.push(row.totalDps);
  }
  const bestBySpec = new Map(bestRows.map((b) => [b.spec, b]));

  const quantile = (sorted: number[], q: number): number => {
    if (sorted.length === 1) return sorted[0];
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
  };

  res.json(
    [...bySpec.entries()]
      .map(([spec, { profession, values }]) => {
        values.sort((a, b) => a - b);
        const best = bestBySpec.get(spec);
        return {
          spec,
          profession,
          count: values.length,
          min: values[0],
          p5: quantile(values, 0.05),
          q1: quantile(values, 0.25),
          median: quantile(values, 0.5),
          q3: quantile(values, 0.75),
          p95: quantile(values, 0.95),
          max: values[values.length - 1],
          best: best
            ? {
                logId: best.logId,
                dps: best.totalDps,
                name: best.characterName,
                account: best.account,
                fightName: best.fightName,
                isCm: best.isCm,
                date: best.encounterTime,
              }
            : null,
        };
      })
      .sort((a, b) => b.median - a.median),
  );
}));

encountersRouter.get('/', asyncHandler(async (_req, res) => {
  const bosses = await prisma.log.groupBy({
    by: ['fightName', 'isCm', 'wing'],
    _count: { _all: true },
    _max: { encounterTime: true },
  });
  res.json(
    bosses
      .sort((a, b) => (b._max.encounterTime?.getTime() ?? 0) - (a._max.encounterTime?.getTime() ?? 0))
      .map((b) => ({
        fightName: b.fightName,
        isCm: b.isCm,
        wing: b.wing,
        logCount: b._count._all,
      })),
  );
}));

interface LeaderboardRawRow {
  logId: string;
  characterName: string;
  profession: string;
  spec: string;
  totalDps: number;
  powerDps: number;
  condiDps: number;
  squadRole: string;
  account: string;
  durationMs: number;
  encounterTime: Date;
}

encountersRouter.get('/:fightName/leaderboard', asyncHandler(async (req, res) => {
  const { fightName } = req.params;
  const isCm = req.query.cm === 'true';
  const profession = typeof req.query.profession === 'string' ? req.query.profession : undefined;
  const roleParam = req.query.role;
  // Role isn't stored — a player is classed "power" or "condi" by whichever
  // of their own powerDps/condiDps split is larger for that parse.
  const role = roleParam === 'power' || roleParam === 'condi' ? roleParam : undefined;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);

  const professionCondition = profession ? Prisma.sql`AND lp.profession = ${profession}` : Prisma.empty;
  const roleCondition =
    role === 'power'
      ? Prisma.sql`AND lp."powerDps" >= lp."condiDps"`
      : role === 'condi'
        ? Prisma.sql`AND lp."powerDps" < lp."condiDps"`
        : Prisma.empty;

  // Pull the total count separately so percentile rank stays correct against
  // the whole population — the row fetch itself is capped at `limit` so a
  // popular boss with thousands of parses doesn't pull every row (and every
  // row's nested log + player) into memory just to keep the top 50. Raw SQL
  // here (rather than Prisma's query builder) because filtering by role
  // means comparing two columns on the same row, which Prisma's `where`
  // can't express.
  const [totalRows, rows] = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count
      FROM "LogPlayer" lp
      JOIN "Log" l ON lp."logId" = l.id
      WHERE l."fightName" = ${fightName} AND l."isCm" = ${isCm} AND l.success = true
      ${professionCondition} ${roleCondition}
    `,
    prisma.$queryRaw<LeaderboardRawRow[]>`
      SELECT lp."logId", lp."characterName", lp.profession, lp.spec, lp."totalDps", lp."powerDps", lp."condiDps",
             lp."squadRole", p.account, l."durationMs", l."encounterTime"
      FROM "LogPlayer" lp
      JOIN "Log" l ON lp."logId" = l.id
      JOIN "Player" p ON lp."playerId" = p.id
      WHERE l."fightName" = ${fightName} AND l."isCm" = ${isCm} AND l.success = true
      ${professionCondition} ${roleCondition}
      ORDER BY lp."totalDps" DESC
      LIMIT ${limit}
    `,
  ]);
  const total = Number(totalRows[0]?.count ?? 0);

  res.json(
    rows.map((r, i) => ({
      rank: i + 1,
      pct: total <= 1 ? 100 : Math.round(((total - 1 - i) / (total - 1)) * 100),
      logId: r.logId,
      name: r.characterName,
      account: r.account,
      profession: r.profession,
      spec: r.spec,
      dps: r.totalDps,
      role: r.powerDps >= r.condiDps ? 'power' : 'condi',
      squadRole: r.squadRole,
      durationMs: r.durationMs,
      date: r.encounterTime,
    })),
  );
}));

encountersRouter.get('/:fightName/stats', asyncHandler(async (req, res) => {
  const { fightName } = req.params;
  const isCm = req.query.cm === 'true';

  const logs = await prisma.log.findMany({
    where: { fightName, isCm },
    select: {
      success: true,
      durationMs: true,
      encounterTime: true,
      players: {
        select: { totalDps: true, player: { select: { account: true } } },
        orderBy: { totalDps: 'desc' },
        take: 1,
      },
    },
    orderBy: { durationMs: 'asc' },
  });

  if (logs.length === 0) {
    res.json({ fastestKill: null, topDps: null, clearRate: null, totalLogs: 0 });
    return;
  }

  const successes = logs.filter((l) => l.success);
  const fastest = successes[0] ?? null;
  const topDpsRow = logs
    .flatMap((l) => l.players)
    .sort((a, b) => b.totalDps - a.totalDps)[0];

  res.json({
    fastestKill: fastest
      ? { durationMs: fastest.durationMs, date: fastest.encounterTime }
      : null,
    topDps: topDpsRow ? { dps: topDpsRow.totalDps, name: topDpsRow.player.account } : null,
    clearRate: Math.round((successes.length / logs.length) * 100),
    totalLogs: logs.length,
  });
}));
