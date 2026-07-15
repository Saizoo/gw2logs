import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const playersRouter = Router();

playersRouter.get('/:account', asyncHandler(async (req, res) => {
  const { account } = req.params;
  const player = await prisma.player.findUnique({ where: { account } });
  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  const logPlayers = await prisma.logPlayer.findMany({
    where: { playerId: player.id },
    // `rawJson` on Log holds the full Elite Insights dump (can be many MB) —
    // `include: { log: true }` pulled that in for every row here, which is
    // what made this endpoint take 6+ seconds. Select only what's used.
    select: {
      id: true,
      logId: true,
      profession: true,
      spec: true,
      totalDps: true,
      log: { select: { fightName: true, isCm: true, uploadedAt: true, success: true } },
    },
    orderBy: { log: { uploadedAt: 'desc' } },
  });

  const professionCounts = new Map<string, number>();
  for (const lp of logPlayers) {
    professionCounts.set(lp.profession, (professionCounts.get(lp.profession) ?? 0) + 1);
  }
  const total = logPlayers.length || 1;
  const professionBreakdown = [...professionCounts.entries()]
    .map(([profession, count]) => ({ profession, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  // Overall score: how this player's DPS ranks, on average, against every
  // other parse of the same boss+CM combination (0-100, same percentile
  // convention as the leaderboard's rank pill). Consistency score: how
  // tightly clustered those percentiles are — always near the same
  // percentile scores higher than swinging between top and bottom. Both
  // `mine` (this player's own logs) and the reference population it's
  // ranked against are restricted to kills — a wipe's "final" DPS reflects
  // when the fight got cut off, not performance, and would otherwise drag
  // both scores around for reasons that have nothing to do with how well
  // anyone actually played. Matches the leaderboard's own success filter.
  // Per-row `id` is carried through so the same percentiles can pick each
  // fight's best *parse* (highest percentile) below, rather than just its
  // highest raw DPS number — DPS alone isn't comparable across
  // specs/builds, which is exactly what the percentile already normalizes
  // for everywhere else in the app (ParseBadge, leaderboard rank).
  const percentiles = logPlayers.length
    ? await prisma.$queryRaw<{ id: string; pct: number }[]>`
        WITH mine AS (
          SELECT lp.id, lp."totalDps", l."fightName", l."isCm"
          FROM "LogPlayer" lp
          JOIN "Log" l ON lp."logId" = l.id
          WHERE lp."playerId" = ${player.id} AND l.success = true
        )
        SELECT
          id,
          CASE WHEN total <= 1 THEN 100.0
               ELSE ((rank_from_bottom - 1)::float8 / (total - 1)) * 100
          END AS pct
        FROM (
          SELECT
            mine.id,
            (SELECT COUNT(*) FROM "LogPlayer" lp2 JOIN "Log" l2 ON lp2."logId" = l2.id
               WHERE l2."fightName" = mine."fightName" AND l2."isCm" = mine."isCm" AND l2.success = true) AS total,
            (SELECT COUNT(*) FROM "LogPlayer" lp2 JOIN "Log" l2 ON lp2."logId" = l2.id
               WHERE l2."fightName" = mine."fightName" AND l2."isCm" = mine."isCm" AND l2.success = true
                 AND lp2."totalDps" <= mine."totalDps") AS rank_from_bottom
          FROM mine
        ) sub
      `
    : [];
  const pctByLogPlayerId = new Map(percentiles.map((r) => [r.id, Number(r.pct)]));

  let overallScore: number | null = null;
  let consistencyScore: number | null = null;
  if (percentiles.length > 0) {
    const values = percentiles.map((r) => Number(r.pct));
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    overallScore = Math.round(mean);
    consistencyScore = Math.round(Math.max(0, 100 - Math.sqrt(variance)));
  }

  // Best parse per fight: the kill with the highest percentile rank against
  // everyone else's parses of that same boss+CM, not just the kill with the
  // biggest raw DPS number — a condi build's ceiling and a power build's
  // ceiling aren't the same number, so "highest DPS" quietly favored
  // whichever spec has the higher raw scale. Restricted to actual kills
  // (wipes aren't parses), matching the leaderboard's own success filter.
  const bestByBoss = new Map<string, { lp: (typeof logPlayers)[number]; pct: number }>();
  for (const lp of logPlayers) {
    if (!lp.log.success) continue;
    const pct = pctByLogPlayerId.get(lp.id) ?? 0;
    const key = `${lp.log.fightName}::${lp.log.isCm}`;
    const current = bestByBoss.get(key);
    if (!current || pct > current.pct) bestByBoss.set(key, { lp, pct });
  }

  res.json({
    account: player.account,
    displayName: player.displayName,
    totalLogs: logPlayers.length,
    overallScore,
    consistencyScore,
    professionBreakdown,
    bestParses: [...bestByBoss.values()]
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 6)
      .map(({ lp, pct }) => ({
        boss: lp.log.fightName,
        isCm: lp.log.isCm,
        spec: lp.spec,
        dps: lp.totalDps,
        pct: Math.round(pct),
        logId: lp.logId,
      })),
    recent: logPlayers.slice(0, 10).map((lp) => ({
      boss: lp.log.fightName,
      isCm: lp.log.isCm,
      spec: lp.spec,
      dps: lp.totalDps,
      success: lp.log.success,
      logId: lp.logId,
      uploadedAt: lp.log.uploadedAt,
    })),
  });
}));
