import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

export const adminAuditRouter = Router();

adminAuditRouter.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Math.max(Number(req.query.offset ?? 0), 0);
  const [total, rows] = await Promise.all([
    prisma.adminAudit.count(),
    prisma.adminAudit.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        detail: true,
        createdAt: true,
        admin: { select: { discordUsername: true, gw2AccountName: true } },
      },
    }),
  ]);
  res.json({
    total,
    entries: rows.map((r) => ({
      id: r.id,
      admin: r.admin.gw2AccountName ?? r.admin.discordUsername,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      detail: r.detail,
      createdAt: r.createdAt,
    })),
  });
}));
