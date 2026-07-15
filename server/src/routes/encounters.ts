import { Router } from 'express';
import { Prisma } from '@prisma/client';
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

interface LeaderboardRawRow {
  logId: string;
  characterName: string;
  profession: string;
  spec: string;
  totalDps: number;
  powerDps: number;
  condiDps: number;
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
             p.account, l."durationMs", l."encounterTime"
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
