import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { nextOccurrenceUtc, resolveTimezone } from '../lib/raidReminders.js';

// Everything the desktop / Nexus addon needs to fire raid & fractal reminders:
// the viewer's groups, each schedule's next occurrence precomputed as an
// absolute UTC instant so the client compares against the system clock and
// does no timezone math of its own. Auth is the shared attachUser path, so a
// personal bearer token works here exactly like a browser session.
export const remindersRouter = Router();

function scheduleBlock(
  days: string[],
  time: string | null,
  durationMins: number | null,
  timezone: string | null,
  now: Date,
) {
  if (days.length === 0) return null;
  return {
    days,
    time,
    durationMins,
    timezone,
    resolvedTimezone: resolveTimezone(timezone),
    nextStartUtc: nextOccurrenceUtc(days, time, timezone, now),
  };
}

remindersRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
  const memberships = await prisma.groupMember.findMany({
    where: { userId: req.user!.id },
    select: {
      group: {
        select: {
          id: true,
          name: true,
          raidDays: true,
          raidStartTime: true,
          raidDurationMins: true,
          raidTimezone: true,
          fractalDays: true,
          fractalStartTime: true,
          fractalDurationMins: true,
          fractalTimezone: true,
        },
      },
    },
    orderBy: { group: { name: 'asc' } },
  });

  const now = new Date();
  const groups = memberships.map(({ group: g }) => ({
    id: g.id,
    name: g.name,
    raid: scheduleBlock(g.raidDays, g.raidStartTime, g.raidDurationMins, g.raidTimezone, now),
    fractal: scheduleBlock(g.fractalDays, g.fractalStartTime, g.fractalDurationMins, g.fractalTimezone, now),
  }));

  res.json({
    now: now.toISOString(),
    user: { id: req.user!.id, name: req.user!.gw2AccountName ?? req.user!.discordUsername },
    groups,
  });
}));
