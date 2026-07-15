import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const guildsRouter = Router();

guildsRouter.get('/', asyncHandler(async (_req, res) => {
  const guilds = await prisma.guild.findMany({
    include: { _count: { select: { memberships: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(
    guilds.map((g) => ({
      tag: g.tag,
      name: g.name,
      memberCount: g._count.memberships,
    })),
  );
}));

guildsRouter.get('/:tag', asyncHandler(async (req, res) => {
  const guild = await prisma.guild.findFirst({
    where: { tag: req.params.tag },
    // Explicit select (not `include: { log: true }`) on every nested Log
    // below — `include` used to also drag in `rawJson` (the full Elite
    // Insights dump, which no longer exists as a column, but the lesson
    // stands: only select the fields actually used).
    include: {
      memberships: {
        include: {
          user: {
            include: {
              player: {
                include: {
                  logPlayers: {
                    select: { totalDps: true, spec: true, log: { select: { uploadedAt: true } } },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!guild) {
    res.status(404).json({ error: 'Guild not found' });
    return;
  }

  const roster = guild.memberships.map((m) => {
    const player = m.user.player;
    const logPlayers = player?.logPlayers ?? [];
    const logsThisWeek = logPlayers.filter(
      (lp) => Date.now() - lp.log.uploadedAt.getTime() < 7 * 24 * 60 * 60 * 1000,
    ).length;
    const best = [...logPlayers].sort((a, b) => b.totalDps - a.totalDps)[0];

    return {
      account: player?.account ?? m.user.gw2AccountName,
      displayName: player?.displayName ?? m.user.discordUsername,
      isLeader: m.isLeader,
      totalLogs: logPlayers.length,
      logsThisWeek,
      bestSpec: best?.spec ?? null,
    };
  });

  res.json({
    tag: guild.tag,
    name: guild.name,
    memberCount: roster.length,
    roster: roster.sort((a, b) => b.totalLogs - a.totalLogs),
  });
}));
