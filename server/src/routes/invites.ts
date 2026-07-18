import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { notifyUsers } from '../lib/notifications.js';
import { postGroupWebhookEvent, memberJoinedEmbed } from '../lib/raidReminders.js';

export const invitesRouter = Router();

// The signed-in user's own pending invites — powers the "you've been invited"
// area and the bell's invite notifications.
invitesRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
  const invites = await prisma.groupInvite.findMany({
    where: { targetUserId: req.user!.id, status: 'pending' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      group: { select: { id: true, name: true } },
      invitedBy: { select: { gw2AccountName: true, discordUsername: true } },
    },
  });
  res.json(
    invites.map((i) => ({
      id: i.id,
      createdAt: i.createdAt,
      group: i.group,
      invitedBy: i.invitedBy.gw2AccountName ?? i.invitedBy.discordUsername,
    })),
  );
}));

invitesRouter.post('/:id/accept', requireAuth, asyncHandler(async (req, res) => {
  const invite = await prisma.groupInvite.findUnique({
    where: { id: req.params.id },
    select: { id: true, groupId: true, targetUserId: true, status: true, invitedById: true, group: { select: { name: true } } },
  });
  if (!invite || invite.targetUserId !== req.user!.id) {
    res.status(404).json({ error: 'Invite not found' });
    return;
  }
  if (invite.status !== 'pending') {
    res.status(409).json({ error: 'This invite has already been answered' });
    return;
  }

  await prisma.$transaction([
    prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: invite.groupId, userId: req.user!.id } },
      update: {},
      create: { groupId: invite.groupId, userId: req.user!.id, role: 'member' },
    }),
    prisma.groupInvite.update({ where: { id: invite.id }, data: { status: 'accepted', respondedAt: new Date() } }),
  ]);

  const me = req.user!.gw2AccountName ?? req.user!.discordUsername;
  await notifyUsers([invite.invitedById], {
    type: 'invite_accepted',
    title: `${me} joined ${invite.group.name}`,
    link: `/groups/${invite.groupId}`,
    groupId: invite.groupId,
  });
  await postGroupWebhookEvent(invite.groupId, 'member', memberJoinedEmbed(invite.groupId, invite.group.name, me));

  res.json({ ok: true, groupId: invite.groupId });
}));

invitesRouter.post('/:id/decline', requireAuth, asyncHandler(async (req, res) => {
  const invite = await prisma.groupInvite.findUnique({
    where: { id: req.params.id },
    select: { id: true, targetUserId: true, status: true },
  });
  if (!invite || invite.targetUserId !== req.user!.id) {
    res.status(404).json({ error: 'Invite not found' });
    return;
  }
  if (invite.status !== 'pending') {
    res.status(409).json({ error: 'This invite has already been answered' });
    return;
  }
  await prisma.groupInvite.update({ where: { id: invite.id }, data: { status: 'declined', respondedAt: new Date() } });
  res.json({ ok: true });
}));
