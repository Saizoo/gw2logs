import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { maskIdentity } from '../lib/privacy.js';

export const homeRouter = Router();

interface TopByProfessionRow {
  profession: string;
  characterName: string;
  spec: string;
  totalDps: number;
  logId: string;
  fightName: string;
  account: string;
  userId: string | null;
  hideName: boolean | null;
}

// One row per recent public log: its headline (top-DPS) parse, with a parse
// percentile computed against every logged parse of that fight+difficulty.
interface RecentParseRow {
  logId: string;
  fightName: string;
  isCm: boolean;
  wing: string | null;
  uploadedAt: Date;
  characterName: string;
  profession: string;
  spec: string;
  totalDps: number;
  parsePct: number;
  account: string;
  userId: string | null;
  hideName: boolean | null;
}

homeRouter.get('/', asyncHandler(async (req, res) => {
  const [topByProfession, recentLogs, recentParses] = await Promise.all([
    // DISTINCT ON picks the single highest-DPS row per profession in one
    // pass — far cheaper than fetching everything and grouping in JS.
    // Wipes are excluded, same as the leaderboard: a "record" from a fight
    // the squad didn't actually win isn't a real record.
    prisma.$queryRaw<TopByProfessionRow[]>`
      SELECT DISTINCT ON (lp.profession)
        lp.profession, lp."characterName", lp.spec, lp."totalDps", lp."logId", l."fightName", p.account, p."userId", u."hideName"
      FROM "LogPlayer" lp
      JOIN "Log" l ON lp."logId" = l.id
      JOIN "Player" p ON lp."playerId" = p.id
      LEFT JOIN "User" u ON u.id = p."userId"
      WHERE l.success = true AND l.private = false
      ORDER BY lp.profession, lp."totalDps" DESC
    `,
    prisma.log.findMany({
      where: { private: false },
      orderBy: { uploadedAt: 'desc' },
      take: 5,
      // Explicit select, not a blanket include — see the encounters/
      // players/logs/compare/guilds routes for the history of why.
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
    // Recent parses feed: the top parse from each of the most recent public
    // logs, with its percentile ranked against all logs of that fight+CM
    // (same PERCENT_RANK basis the logs list and leaderboard use).
    prisma.$queryRaw<RecentParseRow[]>`
      WITH recent AS (
        SELECT id, "fightName", "isCm", wing, "uploadedAt"
        FROM "Log"
        WHERE private = false
        ORDER BY "uploadedAt" DESC
        LIMIT 12
      ),
      ranked AS (
        SELECT lp."logId", lp."characterName", lp.profession, lp.spec, lp."totalDps", lp."playerId",
          CASE WHEN COUNT(*) OVER (PARTITION BY l."fightName", l."isCm") <= 1 THEN 1.0
               ELSE PERCENT_RANK() OVER (PARTITION BY l."fightName", l."isCm" ORDER BY lp."totalDps")
          END AS pct_rank,
          ROW_NUMBER() OVER (PARTITION BY lp."logId" ORDER BY lp."totalDps" DESC) AS rn
        FROM "LogPlayer" lp
        JOIN "Log" l ON lp."logId" = l.id
        WHERE l."fightName" IN (SELECT "fightName" FROM recent) AND l.private = false
      )
      SELECT r.id AS "logId", r."fightName", r."isCm", r.wing, r."uploadedAt",
        ranked."characterName", ranked.profession, ranked.spec, ranked."totalDps",
        ROUND(ranked.pct_rank * 100) AS "parsePct",
        p.account, p."userId", u."hideName"
      FROM recent r
      JOIN ranked ON ranked."logId" = r.id AND ranked.rn = 1
      JOIN "Player" p ON ranked."playerId" = p.id
      LEFT JOIN "User" u ON u.id = p."userId"
      ORDER BY r."uploadedAt" DESC
    `,
  ]);

  res.json({
    topByProfession: topByProfession
      .map((r) => {
        const masked = maskIdentity(r.characterName, r.account, r.hideName ?? false, r.userId, req.user?.id);
        return {
          profession: r.profession,
          name: masked.name,
          account: masked.account,
          hidden: masked.hidden,
          spec: r.spec,
          dps: r.totalDps,
          boss: r.fightName,
          logId: r.logId,
        };
      })
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
    recentParses: recentParses.map((r) => {
      const masked = maskIdentity(r.characterName, r.account, r.hideName ?? false, r.userId, req.user?.id);
      return {
        logId: r.logId,
        boss: r.fightName,
        isCm: r.isCm,
        wing: r.wing,
        uploadedAt: r.uploadedAt,
        name: masked.name,
        account: masked.account,
        hidden: masked.hidden,
        profession: r.profession,
        spec: r.spec,
        dps: r.totalDps,
        parsePct: Number(r.parsePct),
      };
    }),
  });
}));
