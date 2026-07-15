import { Router } from 'express';
import { prisma } from '../db.js';

export const searchRouter = Router();

searchRouter.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) {
    res.json({ query: q, players: [], bosses: [] });
    return;
  }

  const players = await prisma.player.findMany({
    where: {
      OR: [
        { displayName: { contains: q, mode: 'insensitive' } },
        { account: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: 10,
  });

  const bosses = await prisma.log.groupBy({
    by: ['fightName', 'isCm', 'wing'],
    where: { fightName: { contains: q, mode: 'insensitive' } },
    _count: { _all: true },
  });

  res.json({
    query: q,
    players: players.map((p) => ({ account: p.account, displayName: p.displayName })),
    bosses: bosses.map((b) => ({ fightName: b.fightName, isCm: b.isCm, wing: b.wing, logCount: b._count._all })),
  });
});
