import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const dashboardRouter = Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

dashboardRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      discordUsername: true,
      gw2AccountName: true,
      player: { select: { id: true, displayName: true } },
      guildMemberships: {
        take: 1,
        select: { guild: { select: { id: true, tag: true, name: true } } },
      },
    },
  });

  const guild = user?.guildMemberships[0]?.guild ?? null;
  const now = new Date();
  const weekStart = new Date(now.getTime() - WEEK_MS);
  const prevWeekStart = new Date(now.getTime() - 2 * WEEK_MS);

  if (!user?.player) {
    // Signed in but no linked GW2 account yet — return a valid, mostly-empty
    // shape instead of erroring, so the dashboard still renders with a
    // prompt to link an account rather than crashing.
    res.json({
      displayName: user?.discordUsername ?? 'there',
      gw2AccountName: null,
      guild,
      stats: { logsThisWeek: 0, logsThisWeekDelta: 0, avgSquadDps: 0, avgSquadDpsDelta: 0, clearsThisWeek: 0, totalThisWeek: 0, guildRank: null },
      weeklyActivity: buildWeekBuckets([]),
      recentLogs: [],
      guildActivity: [],
    });
    return;
  }

  const playerId = user.player.id;

  const [thisWeekLogs, lastWeekLogs, recentLogPlayers] = await Promise.all([
    prisma.logPlayer.findMany({
      where: { playerId, log: { uploadedAt: { gte: weekStart } } },
      select: { log: { select: { squadDps: true, success: true, uploadedAt: true } } },
    }),
    prisma.logPlayer.findMany({
      where: { playerId, log: { uploadedAt: { gte: prevWeekStart, lt: weekStart } } },
      select: { log: { select: { squadDps: true } } },
    }),
    prisma.logPlayer.findMany({
      where: { playerId },
      select: {
        totalDps: true,
        profession: true,
        log: { select: { id: true, fightName: true, wing: true, isCm: true, success: true, durationMs: true, uploadedAt: true } },
      },
      orderBy: { log: { uploadedAt: 'desc' } },
      take: 6,
    }),
  ]);

  const avg = (nums: number[]) => (nums.length ? Math.round(nums.reduce((s, n) => s + n, 0) / nums.length) : 0);
  const thisWeekDps = thisWeekLogs.map((l) => l.log.squadDps);
  const lastWeekDps = lastWeekLogs.map((l) => l.log.squadDps);
  const clearsThisWeek = thisWeekLogs.filter((l) => l.log.success).length;

  let guildRank: number | null = null;
  if (guild) {
    const ranking = await prisma.$queryRaw<{ guildId: string; logCount: bigint }[]>`
      SELECT g.id AS "guildId", COUNT(DISTINCT lp."logId") AS "logCount"
      FROM "Guild" g
      JOIN "GuildMembership" gm ON gm."guildId" = g.id
      JOIN "User" u ON u.id = gm."userId"
      JOIN "Player" p ON p."userId" = u.id
      JOIN "LogPlayer" lp ON lp."playerId" = p.id
      JOIN "Log" l ON l.id = lp."logId" AND l."uploadedAt" >= ${weekStart}
      GROUP BY g.id
      ORDER BY "logCount" DESC
    `;
    const idx = ranking.findIndex((r) => r.guildId === guild.id);
    guildRank = idx >= 0 ? idx + 1 : null;
  }

  const guildActivity = guild
    ? (
        await prisma.logPlayer.findMany({
          where: { player: { user: { guildMemberships: { some: { guildId: guild.id } } } } },
          select: {
            characterName: true,
            player: { select: { displayName: true } },
            log: { select: { id: true, fightName: true, isCm: true, success: true, durationMs: true, uploadedAt: true } },
          },
          orderBy: [{ log: { uploadedAt: 'desc' } }, { totalDps: 'desc' }],
          distinct: ['logId'],
          take: 6,
        })
      ).map((lp) => ({
        text: `${lp.player.displayName} ${lp.log.success ? 'cleared' : 'wiped on'} ${lp.log.fightName}${lp.log.isCm ? ' (CM)' : ''}${lp.log.success ? ` — ${formatDuration(lp.log.durationMs)}` : ''}`,
        time: lp.log.uploadedAt,
      }))
    : [];

  res.json({
    displayName: user.player.displayName,
    gw2AccountName: user.gw2AccountName,
    guild,
    stats: {
      logsThisWeek: thisWeekLogs.length,
      logsThisWeekDelta: thisWeekLogs.length - lastWeekLogs.length,
      avgSquadDps: avg(thisWeekDps),
      avgSquadDpsDelta: avg(thisWeekDps) - avg(lastWeekDps),
      clearsThisWeek,
      totalThisWeek: thisWeekLogs.length,
      guildRank,
    },
    weeklyActivity: buildWeekBuckets(thisWeekLogs.map((l) => l.log.uploadedAt)),
    recentLogs: recentLogPlayers.map((lp) => ({
      logId: lp.log.id,
      boss: lp.log.fightName,
      wing: lp.log.wing,
      isCm: lp.log.isCm,
      success: lp.log.success,
      durationMs: lp.log.durationMs,
      dps: lp.totalDps,
      profession: lp.profession,
      uploadedAt: lp.log.uploadedAt,
    })),
    guildActivity,
  });
}));

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function buildWeekBuckets(dates: Date[]): { label: string; count: number }[] {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const buckets = new Map<string, number>();
  const today = new Date();
  const days: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    const key = d.toISOString().slice(0, 10);
    days.push({ key, label: labels[d.getDay()] });
    buckets.set(key, 0);
  }
  for (const d of dates) {
    const key = new Date(d).toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return days.map((d) => ({ label: d.label, count: buckets.get(d.key) ?? 0 }));
}
