import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

export const adminUsersRouter = Router();

adminUsersRouter.get('/', asyncHandler(async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Math.max(Number(req.query.offset ?? 0), 0);

  const where = search ? { discordUsername: { contains: search, mode: 'insensitive' as const } } : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        discordUsername: true,
        discordAvatar: true,
        gw2AccountName: true,
        isAdmin: true,
        createdAt: true,
        player: { select: { account: true } },
      },
    }),
  ]);

  res.json({
    total,
    users: users.map((u) => ({
      id: u.id,
      discordUsername: u.discordUsername,
      discordAvatar: u.discordAvatar,
      gw2AccountName: u.gw2AccountName,
      linkedPlayerAccount: u.player?.account ?? null,
      isAdmin: u.isAdmin,
      createdAt: u.createdAt,
    })),
  });
}));

adminUsersRouter.put('/:id/admin', asyncHandler(async (req, res) => {
  const { isAdmin } = req.body ?? {};
  if (typeof isAdmin !== 'boolean') {
    res.status(400).json({ error: 'isAdmin (boolean) is required' });
    return;
  }

  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // A demoting admin can't strip their own access — otherwise a lone admin
  // locks themselves out with no one left to undo it (short of editing
  // ADMIN_DISCORD_IDS and logging back in, which not every admin has
  // access to do).
  if (req.user!.id === req.params.id && !isAdmin) {
    res.status(400).json({ error: "You can't remove your own admin access." });
    return;
  }

  const user = await prisma.user.update({ where: { id: req.params.id }, data: { isAdmin } });
  res.json({ id: user.id, isAdmin: user.isAdmin });
}));

adminUsersRouter.post('/:id/logout', asyncHandler(async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { count } = await prisma.session.deleteMany({ where: { userId: req.params.id } });
  res.json({ ok: true, sessionsRevoked: count });
}));
