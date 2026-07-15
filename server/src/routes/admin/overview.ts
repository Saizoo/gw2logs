import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

export const adminOverviewRouter = Router();

adminOverviewRouter.get('/', asyncHandler(async (_req, res) => {
  const [totalLogs, totalUsers, totalPlayers, totalGuilds, totalGroups, totalBuilds, recentUploadJobs, failedUploadsThisWeek] =
    await Promise.all([
      prisma.log.count(),
      prisma.user.count(),
      prisma.player.count(),
      prisma.guild.count(),
      prisma.group.count(),
      prisma.build.count(),
      prisma.uploadJob.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.uploadJob.count({
        where: { status: 'failed', createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

  res.json({
    totalLogs,
    totalUsers,
    totalPlayers,
    totalGuilds,
    totalGroups,
    totalBuilds,
    failedUploadsThisWeek,
    recentUploadJobs: recentUploadJobs.map((j) => ({
      id: j.id,
      status: j.status,
      fileName: j.fileName,
      fileSizeByte: j.fileSizeByte,
      errorMessage: j.errorMessage,
      logId: j.logId,
      createdAt: j.createdAt,
    })),
  });
}));
