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
      logId: true,
      profession: true,
      spec: true,
      totalDps: true,
      log: { select: { fightName: true, isCm: true, uploadedAt: true } },
    },
    orderBy: { log: { uploadedAt: 'desc' } },
  });

  const bestByBoss = new Map<string, (typeof logPlayers)[number]>();
  for (const lp of logPlayers) {
    const key = `${lp.log.fightName}::${lp.log.isCm}`;
    const current = bestByBoss.get(key);
    if (!current || lp.totalDps > current.totalDps) bestByBoss.set(key, lp);
  }

  const professionCounts = new Map<string, number>();
  for (const lp of logPlayers) {
    professionCounts.set(lp.profession, (professionCounts.get(lp.profession) ?? 0) + 1);
  }
  const total = logPlayers.length || 1;
  const professionBreakdown = [...professionCounts.entries()]
    .map(([profession, count]) => ({ profession, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  res.json({
    account: player.account,
    displayName: player.displayName,
    totalLogs: logPlayers.length,
    professionBreakdown,
    bestParses: [...bestByBoss.values()]
      .sort((a, b) => b.totalDps - a.totalDps)
      .slice(0, 6)
      .map((lp) => ({
        boss: lp.log.fightName,
        isCm: lp.log.isCm,
        spec: lp.spec,
        dps: lp.totalDps,
        logId: lp.logId,
      })),
    recent: logPlayers.slice(0, 10).map((lp) => ({
      boss: lp.log.fightName,
      isCm: lp.log.isCm,
      spec: lp.spec,
      dps: lp.totalDps,
      logId: lp.logId,
      uploadedAt: lp.log.uploadedAt,
    })),
  });
}));
