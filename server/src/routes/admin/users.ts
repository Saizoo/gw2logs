import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { audit } from '../../lib/audit.js';

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
        suspendedAt: true,
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
      suspendedAt: u.suspendedAt,
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
  audit(req.user!.id, isAdmin ? 'user_promote_admin' : 'user_demote_admin', 'user', user.id, { discordUsername: target.discordUsername });
  res.json({ id: user.id, isAdmin: user.isAdmin });
}));

// Suspend / unsuspend. Suspended users keep their data but every
// authenticated request 403s (see requireAuth). Admins can't be suspended
// — demote first — and nobody can suspend themselves.
adminUsersRouter.put('/:id/suspend', asyncHandler(async (req, res) => {
  const { suspended } = req.body ?? {};
  if (typeof suspended !== 'boolean') {
    res.status(400).json({ error: 'suspended (boolean) is required' });
    return;
  }
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (target.id === req.user!.id) {
    res.status(400).json({ error: "You can't suspend yourself." });
    return;
  }
  if (target.isAdmin && suspended) {
    res.status(400).json({ error: 'Demote this admin before suspending them.' });
    return;
  }

  const user = await prisma.user.update({
    where: { id: target.id },
    data: { suspendedAt: suspended ? new Date() : null },
  });
  if (suspended) {
    // Their existing sessions are useless (requireAuth rejects) but kill
    // them anyway so nothing lingers.
    await prisma.session.deleteMany({ where: { userId: target.id } });
  }
  audit(req.user!.id, suspended ? 'user_suspend' : 'user_unsuspend', 'user', target.id, { discordUsername: target.discordUsername });
  res.json({ id: user.id, suspendedAt: user.suspendedAt });
}));

// Everything an admin needs about one user on one screen — their assets
// and activity, feeding the drill-down panel's action buttons.
adminUsersRouter.get('/:id/detail', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      discordUsername: true,
      discordAvatar: true,
      gw2AccountName: true,
      gw2LinkedAt: true,
      isAdmin: true,
      suspendedAt: true,
      createdAt: true,
      displayedGuild: { select: { name: true, tag: true } },
      _count: { select: { uploadedLogs: true, characters: true, sessions: true } },
      groupMemberships: { select: { role: true, group: { select: { id: true, name: true, guildId: true } } } },
    },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const recentLogs = await prisma.log.findMany({
    where: { uploadedBy: user.id },
    orderBy: { uploadedAt: 'desc' },
    take: 10,
    select: { id: true, fightName: true, isCm: true, success: true, uploadedAt: true },
  });
  res.json({
    id: user.id,
    discordUsername: user.discordUsername,
    discordAvatar: user.discordAvatar,
    gw2AccountName: user.gw2AccountName,
    gw2LinkedAt: user.gw2LinkedAt,
    isAdmin: user.isAdmin,
    suspendedAt: user.suspendedAt,
    createdAt: user.createdAt,
    displayedGuild: user.displayedGuild,
    counts: { uploads: user._count.uploadedLogs, characters: user._count.characters, sessions: user._count.sessions },
    groups: user.groupMemberships.map((m) => ({ id: m.group.id, name: m.group.name, role: m.role, isGuild: m.group.guildId !== null })),
    recentLogs,
  });
}));

// Support tool: strip a user's GW2 key (compromised key, wrong account,
// account dispute). Their Player row keeps its history.
adminUsersRouter.post('/:id/unlink-gw2', asyncHandler(async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  await prisma.user.update({
    where: { id: target.id },
    data: { gw2AccountName: null, gw2ApiKeyEnc: null, gw2LinkedAt: null, displayedGuildId: null },
  });
  audit(req.user!.id, 'user_unlink_gw2', 'user', target.id, { discordUsername: target.discordUsername, account: target.gw2AccountName });
  res.json({ ok: true });
}));

// Bulk-removes every log this user uploaded — the cleanup tool for a
// spam/abuse account. Cascades take the per-player rows and events.
adminUsersRouter.post('/:id/delete-logs', asyncHandler(async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const { count } = await prisma.log.deleteMany({ where: { uploadedBy: target.id } });
  audit(req.user!.id, 'user_delete_logs', 'user', target.id, { discordUsername: target.discordUsername, deleted: count });
  res.json({ ok: true, deleted: count });
}));

adminUsersRouter.post('/:id/logout', asyncHandler(async (req, res) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { count } = await prisma.session.deleteMany({ where: { userId: req.params.id } });
  audit(req.user!.id, 'user_force_logout', 'user', req.params.id, { discordUsername: target.discordUsername, sessionsRevoked: count });
  res.json({ ok: true, sessionsRevoked: count });
}));
