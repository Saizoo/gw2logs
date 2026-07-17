import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { getParseQueueState } from '../../lib/eliteInsights.js';
import { audit } from '../../lib/audit.js';

export const adminHealthRouter = Router();

const STUCK_PARSE_MINUTES = 15;

adminHealthRouter.get('/', asyncHandler(async (_req, res) => {
  const stuckCutoff = new Date(Date.now() - STUCK_PARSE_MINUTES * 60_000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000);

  const [dbSize, tables, jobCounts, failedGroups, stuckJobs, remindersSent, lastReminder] = await Promise.all([
    prisma.$queryRaw<{ size: string }[]>`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`,
    prisma.$queryRaw<{ name: string; total: string; dead: bigint }[]>`
      SELECT relname AS name,
             pg_size_pretty(pg_total_relation_size(relid)) AS total,
             n_dead_tup AS dead
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 8
    `,
    prisma.uploadJob.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.uploadJob.groupBy({
      by: ['errorMessage'],
      where: { status: 'failed', createdAt: { gte: weekAgo } },
      _count: { _all: true },
      orderBy: { _count: { errorMessage: 'desc' } },
      take: 5,
    }),
    prisma.uploadJob.findMany({
      where: { status: 'parsing', createdAt: { lt: stuckCutoff } },
      select: { id: true, fileName: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 20,
    }),
    prisma.raidReminderLog.count({ where: { sentAt: { gte: weekAgo } } }),
    prisma.raidReminderLog.findFirst({ orderBy: { sentAt: 'desc' }, select: { sentAt: true } }),
  ]);

  res.json({
    database: {
      size: dbSize[0]?.size ?? 'unknown',
      tables: tables.map((t) => ({ name: t.name, size: t.total, deadTuples: Number(t.dead) })),
    },
    parseQueue: getParseQueueState(),
    uploadJobs: Object.fromEntries(jobCounts.map((c) => [c.status, c._count._all])),
    topFailures: failedGroups.map((f) => ({ message: f.errorMessage ?? '(no message)', count: f._count._all })),
    stuckJobs: stuckJobs.map((j) => ({ id: j.id, fileName: j.fileName, createdAt: j.createdAt })),
    stuckThresholdMinutes: STUCK_PARSE_MINUTES,
    reminders: { sentLast7Days: remindersSent, lastSentAt: lastReminder?.sentAt ?? null },
  });
}));

// A job stuck in "parsing" means the process died mid-parse (deploy,
// crash, OOM) — the temp dir is long gone, so the only honest state for
// these rows is failed. Bounded to the same cutoff the health view shows.
adminHealthRouter.post('/cleanup-stuck', asyncHandler(async (req, res) => {
  const stuckCutoff = new Date(Date.now() - STUCK_PARSE_MINUTES * 60_000);
  const { count } = await prisma.uploadJob.updateMany({
    where: { status: 'parsing', createdAt: { lt: stuckCutoff } },
    data: { status: 'failed', errorMessage: 'Marked failed by admin cleanup — parse never completed (server restart?)' },
  });
  audit(req.user!.id, 'cleanup_stuck_jobs', 'uploadJob', null, { count });
  res.json({ ok: true, cleaned: count });
}));
