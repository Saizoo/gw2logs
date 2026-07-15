import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const encountersRouter = Router();

function withPercentile<T extends { totalDps: number }>(rows: T[]) {
  const sorted = [...rows].sort((a, b) => b.totalDps - a.totalDps);
  const n = sorted.length;
  return sorted.map((row, i) => ({
    ...row,
    rank: i + 1,
    pct: n <= 1 ? 100 : Math.round(((n - 1 - i) / (n - 1)) * 100),
  }));
}

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

encountersRouter.get('/:fightName/leaderboard', asyncHandler(async (req, res) => {
  const { fightName } = req.params;
  const isCm = req.query.cm === 'true';
  const profession = typeof req.query.profession === 'string' ? req.query.profession : undefined;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);

  const rows = await prisma.logPlayer.findMany({
    where: {
      log: { fightName, isCm },
      ...(profession ? { profession } : {}),
    },
    include: { log: true, player: true },
    orderBy: { totalDps: 'desc' },
  });

  const ranked = withPercentile(rows);

  res.json(
    ranked.slice(0, limit).map((r) => ({
      rank: r.rank,
      pct: r.pct,
      logId: r.logId,
      name: r.characterName,
      account: r.player.account,
      profession: r.profession,
      spec: r.spec,
      dps: r.totalDps,
      durationMs: r.log.durationMs,
      date: r.log.encounterTime,
    })),
  );
}));

encountersRouter.get('/:fightName/stats', asyncHandler(async (req, res) => {
  const { fightName } = req.params;
  const isCm = req.query.cm === 'true';

  const logs = await prisma.log.findMany({
    where: { fightName, isCm },
    include: { players: { orderBy: { totalDps: 'desc' }, take: 1 } },
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
    topDps: topDpsRow ? { dps: topDpsRow.totalDps, name: topDpsRow.characterName } : null,
    clearRate: Math.round((successes.length / logs.length) * 100),
    totalLogs: logs.length,
  });
}));
