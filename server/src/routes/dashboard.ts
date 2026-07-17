import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const dashboardRouter = Router();

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

// The browser sends its IANA zone (?tz=America/New_York) so day buckets
// land on the viewer's calendar — bucketing in UTC shifted any evening
// upload west of Greenwich onto the next day's bar.
function viewerTimezone(raw: unknown): string {
  if (typeof raw === 'string' && raw.length <= 64) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: raw });
      return raw;
    } catch {
      // fall through to UTC
    }
  }
  return 'UTC';
}

dashboardRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
  const timeZone = viewerTimezone(req.query.tz);
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      discordUsername: true,
      gw2AccountName: true,
      player: { select: { id: true, account: true } },
    },
  });

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
      stats: { logsThisWeek: 0, logsThisWeekDelta: 0, avgSquadDps: 0, avgSquadDpsDelta: 0, clearsThisWeek: 0, totalThisWeek: 0 },
      weeklyActivity: buildWeekBuckets([], timeZone),
      recentLogs: [],
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

  res.json({
    displayName: user.player.account,
    gw2AccountName: user.gw2AccountName,
    stats: {
      logsThisWeek: thisWeekLogs.length,
      logsThisWeekDelta: thisWeekLogs.length - lastWeekLogs.length,
      avgSquadDps: avg(thisWeekDps),
      avgSquadDpsDelta: avg(thisWeekDps) - avg(lastWeekDps),
      clearsThisWeek,
      totalThisWeek: thisWeekLogs.length,
    },
    weeklyActivity: buildWeekBuckets(thisWeekLogs.map((l) => l.log.uploadedAt), timeZone),
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
  });
}));

function buildWeekBuckets(dates: Date[], timeZone: string): { label: string; count: number }[] {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const calendarDay = (d: Date): { key: string; label: string } => {
    const parts = fmt.formatToParts(d);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    return { key: `${get('year')}-${get('month')}-${get('day')}`, label: get('weekday') };
  };

  const buckets = new Map<string, number>();
  const now = Date.now();
  const days: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = calendarDay(new Date(now - i * DAY_MS));
    // 24h steps can repeat a calendar day across a DST fall-back — skip
    // the duplicate rather than rendering the same bar twice.
    if (days.length && days[days.length - 1].key === day.key) continue;
    days.push(day);
    buckets.set(day.key, 0);
  }
  for (const d of dates) {
    const { key } = calendarDay(new Date(d));
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return days.map((d) => ({ label: d.label, count: buckets.get(d.key) ?? 0 }));
}
