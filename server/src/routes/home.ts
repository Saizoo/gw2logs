import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const homeRouter = Router();

interface TopByProfessionRow {
  profession: string;
  characterName: string;
  spec: string;
  totalDps: number;
  logId: string;
  fightName: string;
  account: string;
}

homeRouter.get('/', asyncHandler(async (_req, res) => {
  const [topByProfession, recentLogs] = await Promise.all([
    // DISTINCT ON picks the single highest-DPS row per profession in one
    // pass — far cheaper than fetching everything and grouping in JS.
    // Wipes are excluded, same as the leaderboard: a "record" from a fight
    // the squad didn't actually win isn't a real record.
    prisma.$queryRaw<TopByProfessionRow[]>`
      SELECT DISTINCT ON (lp.profession)
        lp.profession, lp."characterName", lp.spec, lp."totalDps", lp."logId", l."fightName", p.account
      FROM "LogPlayer" lp
      JOIN "Log" l ON lp."logId" = l.id
      JOIN "Player" p ON lp."playerId" = p.id
      WHERE l.success = true
      ORDER BY lp.profession, lp."totalDps" DESC
    `,
    prisma.log.findMany({
      orderBy: { uploadedAt: 'desc' },
      take: 5,
      // Excludes rawJson (the full Elite Insights dump) — see the fix in
      // encounters/players/logs/compare/guilds routes for why that matters.
      select: {
        id: true,
        fightName: true,
        isCm: true,
        wing: true,
        squadDps: true,
        success: true,
        uploadedAt: true,
        _count: { select: { players: true } },
      },
    }),
  ]);

  res.json({
    topByProfession: topByProfession
      .map((r) => ({
        profession: r.profession,
        name: r.characterName,
        account: r.account,
        spec: r.spec,
        dps: r.totalDps,
        boss: r.fightName,
        logId: r.logId,
      }))
      .sort((a, b) => b.dps - a.dps),
    recentLogs: recentLogs.map((l) => ({
      id: l.id,
      boss: l.fightName,
      isCm: l.isCm,
      wing: l.wing,
      squadDps: l.squadDps,
      success: l.success,
      playerCount: l._count.players,
      uploadedAt: l.uploadedAt,
    })),
  });
}));
