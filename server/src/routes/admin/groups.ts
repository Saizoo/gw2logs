import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { audit } from '../../lib/audit.js';

export const adminGroupsRouter = Router();

adminGroupsRouter.get('/', asyncHandler(async (_req, res) => {
  const groups = await prisma.group.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      createdAt: true,
      leader: { select: { discordUsername: true } },
      _count: { select: { members: true, compositions: true } },
    },
  });
  res.json(
    groups.map((g) => ({
      id: g.id,
      name: g.name,
      leader: g.leader.discordUsername,
      createdAt: g.createdAt,
      memberCount: g._count.members,
      compositionCount: g._count.compositions,
    })),
  );
}));

adminGroupsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  // GroupMember/GroupRequest/Composition (and its CompositionSlots) all
  // cascade automatically (onDelete: Cascade) — deleting a Group takes its
  // whole saved-composition history with it.
  await prisma.group.delete({ where: { id: req.params.id } });
  audit(req.user!.id, 'group_delete', 'group', req.params.id);
  res.json({ ok: true });
}));
