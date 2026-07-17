import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const announcementsRouter = Router();

// Public: the active (unexpired) announcements every page's banner shows.
// Newest first; no auth — signed-out visitors see maintenance notices too.
announcementsRouter.get('/active', asyncHandler(async (_req, res) => {
  const now = new Date();
  const rows = await prisma.announcement.findMany({
    where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: { createdAt: 'desc' },
    select: { id: true, message: true, severity: true, expiresAt: true },
  });
  res.json(rows);
}));
