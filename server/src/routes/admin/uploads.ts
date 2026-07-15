import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

export const adminUploadsRouter = Router();

adminUploadsRouter.get('/', asyncHandler(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Math.max(Number(req.query.offset ?? 0), 0);

  const where = status ? { status } : {};

  const [total, jobs] = await Promise.all([
    prisma.uploadJob.count({ where }),
    prisma.uploadJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
  ]);

  res.json({
    total,
    jobs: jobs.map((j) => ({
      id: j.id,
      status: j.status,
      fileName: j.fileName,
      fileSizeByte: j.fileSizeByte,
      errorMessage: j.errorMessage,
      logId: j.logId,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
    })),
  });
}));
