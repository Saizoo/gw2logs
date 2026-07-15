import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const encountersRouter = Router();

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

  const where = {
    log: { fightName, isCm, success: true },
    ...(profession ? { profession } : {}),
  };

  // Pull the total count separately so percentile rank stays correct against
  // the whole population — the row fetch itself is capped at `limit` so a
  // popular boss with thousands of parses doesn't pull every row (and every
  // row's nested log + player) into memory just to keep the top 50.
  const [total, rows] = await Promise.all([
    prisma.logPlayer.count({ where }),
    prisma.logPlayer.findMany({
      where,
      // `rawJson` holds the full Elite Insights dump for the log (can be
      // many MB) — `include: { log: true }` pulls that in for every row.
      // Select only the couple of fields actually used below instead.
      select: {
        logId: true,
        characterName: true,
        profession: true,
        spec: true,
        totalDps: true,
        player: { select: { account: true } },
        log: { select: { durationMs: true, encounterTime: true } },
      },
      orderBy: { totalDps: 'desc' },
      take: limit,
    }),
  ]);

  res.json(
    rows.map((r, i) => ({
      rank: i + 1,
      pct: total <= 1 ? 100 : Math.round(((total - 1 - i) / (total - 1)) * 100),
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
    select: {
      success: true,
      durationMs: true,
      encounterTime: true,
      players: {
        select: { totalDps: true, characterName: true },
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
    topDps: topDpsRow ? { dps: topDpsRow.totalDps, name: topDpsRow.characterName } : null,
    clearRate: Math.round((successes.length / logs.length) * 100),
    totalLogs: logs.length,
  });
}));
