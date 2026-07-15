import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const logsRouter = Router();

// Only "Raid" (wing is set, from the verified BOSS_WING table) vs "Other" is
// reliably derivable from the data we have. A Strikes/Fractals-CM split
// would need either a hardcoded boss-name list or arcdps triggerID ranges
// neither of which I could verify against a live source — guessing that
// badly once already caused real damage this session (the profession
// mapping mess), so this stays a two-way split rather than a guessed one.
logsRouter.get('/', asyncHandler(async (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const killsOnly = req.query.killsOnly === 'true';
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Math.max(Number(req.query.offset ?? 0), 0);

  const where = {
    ...(category === 'raid' ? { wing: { not: null } } : category === 'other' ? { wing: null } : {}),
    ...(killsOnly ? { success: true } : {}),
  };

  const logs = await prisma.log.findMany({
    where,
    select: {
      id: true,
      fightName: true,
      wing: true,
      isCm: true,
      success: true,
      durationMs: true,
      squadDps: true,
      // Sorted and displayed by when the fight actually happened, not when
      // it was uploaded to our server — same convention the leaderboard and
      // log-detail routes already use. Sorting by uploadedAt instead breaks
      // down badly for anyone using the dps.report bulk-import feature: a
      // whole history of old logs all get uploadedAt ~= import time, so
      // they'd all cluster at "today" regardless of when they were played.
      encounterTime: true,
      _count: { select: { players: true } },
    },
    orderBy: { encounterTime: 'desc' },
    take: limit,
    skip: offset,
  });

  const fightNames = [...new Set(logs.map((l) => l.fightName))];
  const logIds = logs.map((l) => l.id);

  // Each log's "parse" badge is its top performer's percentile against the
  // GLOBAL population for that exact boss+CM — same convention the
  // leaderboard uses. Computed for the whole page in one query (window
  // function scoped to just the fight names on this page) rather than one
  // query per row.
  // PERCENT_RANK() is 0 for a partition with only one row (there's nothing
  // below it to rank against) — without correcting for that, a boss+CM
  // with a single parse ever logged would show its only performer at the
  // 0th percentile instead of the 100th. Same fix as the leaderboard
  // route's `total <= 1 ? 100 : ...` special case, expressed in SQL here.
  const percentiles = logIds.length
    ? await prisma.$queryRaw<{ logId: string; pct: number }[]>`
        WITH ranked AS (
          SELECT lp."logId",
            CASE WHEN COUNT(*) OVER (PARTITION BY l."fightName", l."isCm") <= 1 THEN 1.0
                 ELSE PERCENT_RANK() OVER (PARTITION BY l."fightName", l."isCm" ORDER BY lp."totalDps")
            END AS pct_rank
          FROM "LogPlayer" lp
          JOIN "Log" l ON lp."logId" = l.id
          WHERE l."fightName" = ANY(${fightNames})
        )
        SELECT "logId", ROUND(MAX(pct_rank) * 100) AS pct
        FROM ranked
        WHERE "logId" = ANY(${logIds})
        GROUP BY "logId"
      `
    : [];
  const pctByLogId = new Map(percentiles.map((p) => [p.logId, Number(p.pct)]));

  res.json(
    logs.map((l) => ({
      id: l.id,
      boss: l.fightName,
      wing: l.wing,
      category: l.wing ? 'raid' : 'other',
      isCm: l.isCm,
      success: l.success,
      durationMs: l.durationMs,
      squadDps: l.squadDps,
      playerCount: l._count.players,
      date: l.encounterTime,
      parsePct: pctByLogId.get(l.id) ?? null,
    })),
  );
}));

logsRouter.get('/:id', asyncHandler(async (req, res) => {
  const log = await prisma.log.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      fightName: true,
      wing: true,
      isCm: true,
      success: true,
      durationMs: true,
      squadDps: true,
      encounterTime: true,
      players: {
        orderBy: { totalDps: 'desc' },
        select: {
          characterName: true,
          profession: true,
          spec: true,
          subgroup: true,
          totalDps: true,
          powerDps: true,
          condiDps: true,
          damageTaken: true,
          downCount: true,
          deadCount: true,
          boons: true,
          mechanics: true,
          squadRole: true,
          player: { select: { account: true } },
        },
      },
      mechanicEvents: {
        orderBy: { timeMs: 'asc' },
        select: { timeMs: true, name: true, actor: true, severity: true },
      },
      deathEvents: {
        orderBy: { timeMs: 'asc' },
        select: { timeMs: true, actor: true, killedBy: true },
      },
    },
  });

  if (!log) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }

  // Same convention as the leaderboard/list routes: each player's parse
  // badge is their percentile against the global population for this exact
  // boss+CM, computed via one window-function query rather than N lookups.
  // Scoped by logId (not just characterName) so a character that has
  // played this same boss in other logs doesn't leak its best-ever
  // percentile onto this specific log's row. Single-row populations are
  // forced to the 100th percentile (see the /:id list route above for why
  // PERCENT_RANK() alone would wrongly give the only performer a 0).
  const playerPercentiles = await prisma.$queryRaw<{ characterName: string; pct: number }[]>`
    WITH ranked AS (
      SELECT lp."logId", lp."characterName",
        CASE WHEN COUNT(*) OVER (PARTITION BY l."fightName", l."isCm") <= 1 THEN 1.0
             ELSE PERCENT_RANK() OVER (PARTITION BY l."fightName", l."isCm" ORDER BY lp."totalDps")
        END AS pct_rank
      FROM "LogPlayer" lp
      JOIN "Log" l ON lp."logId" = l.id
      WHERE l."fightName" = ${log.fightName} AND l."isCm" = ${log.isCm}
    )
    SELECT "characterName", ROUND(pct_rank * 100) AS pct
    FROM ranked
    WHERE "logId" = ${log.id}
  `;
  const pctByName = new Map(playerPercentiles.map((p) => [p.characterName, Number(p.pct)]));

  res.json({
    id: log.id,
    boss: log.fightName,
    wing: log.wing,
    isCm: log.isCm,
    success: log.success,
    durationMs: log.durationMs,
    squadDps: log.squadDps,
    date: log.encounterTime,
    // The raw Elite Insights JSON this was ever derived from is no longer
    // persisted (see Log.rawJson's old spot in schema.prisma) — nothing to
    // extract a per-second breakdown from anymore.
    dpsChart: null,
    players: log.players.map((p) => ({
      name: p.characterName,
      account: p.player.account,
      profession: p.profession,
      spec: p.spec,
      subgroup: p.subgroup,
      role: p.powerDps >= p.condiDps ? 'power' : 'condi',
      // Boon-support/healer classification, distinct from the power/condi
      // damage-type split above — see LogPlayer.squadRole in the schema for
      // how this is computed (subgroup boon generation + real healing
      // output, never DPS magnitude).
      squadRole: p.squadRole,
      parsePct: pctByName.get(p.characterName) ?? null,
      total: p.totalDps,
      power: p.powerDps,
      condi: p.condiDps,
      powerPct: p.totalDps ? Math.round((p.powerDps / p.totalDps) * 100) : 0,
      condiPct: p.totalDps ? Math.round((p.condiDps / p.totalDps) * 100) : 0,
      damageTaken: p.damageTaken,
      downs: p.downCount,
      deaths: p.deadCount,
      boons: p.boons,
      mechanics: p.mechanics,
    })),
    mechanicEvents: log.mechanicEvents.map((e) => ({
      timeMs: e.timeMs,
      name: e.name,
      actor: e.actor,
      severity: e.severity,
    })),
    deathEvents: log.deathEvents.map((e) => ({
      timeMs: e.timeMs,
      actor: e.actor,
      killedBy: e.killedBy,
    })),
  });
}));
