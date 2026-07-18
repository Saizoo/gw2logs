import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const notificationsRouter = Router();

// Recent notifications for the signed-in user plus the unread count for the
// nav bell badge. Capped — the bell is a recent feed, not an archive.
notificationsRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, type: true, title: true, body: true, link: true, groupId: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: req.user!.id, readAt: null } }),
  ]);
  res.json({ items, unreadCount });
}));

notificationsRouter.post('/read-all', requireAuth, asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
}));

notificationsRouter.post('/:id/read', requireAuth, asyncHandler(async (req, res) => {
  // Scope the update to the caller's own rows so an id guess can't mark
  // someone else's notification read.
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  res.json({ ok: true });
}));
