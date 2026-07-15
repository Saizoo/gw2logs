import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getGroupRole as getRole, canManageGroup as canManage } from '../lib/groupAccess.js';

export const groupsRouter = Router();

const MEMBER_SELECT = {
  role: true,
  joinedAt: true,
  user: { select: { id: true, discordUsername: true, discordAvatar: true } },
} as const;

groupsRouter.get('/', asyncHandler(async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;

  if (search) {
    const groups = await prisma.group.findMany({
      where: { name: { contains: search, mode: 'insensitive' } },
      take: 30,
      select: {
        id: true,
        name: true,
        icon: true,
        leader: { select: { discordUsername: true } },
        _count: { select: { members: true } },
      },
    });
    res.json(
      groups.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        leader: g.leader.discordUsername,
        memberCount: g._count.members,
      })),
    );
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: 'Not signed in' });
    return;
  }

  const memberships = await prisma.groupMember.findMany({
    where: { userId: req.user.id },
    select: { group: { select: { id: true, name: true, icon: true, background: true, _count: { select: { members: true } } } } },
  });
  res.json(
    memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      icon: m.group.icon,
      background: m.group.background,
      memberCount: m.group._count.members,
    })),
  );
}));

groupsRouter.post('/', requireAuth, asyncHandler(async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const group = await prisma.group.create({
    data: {
      name,
      leaderId: req.user!.id,
      members: { create: { userId: req.user!.id, role: 'leader' } },
    },
  });

  res.status(201).json({ id: group.id });
}));

groupsRouter.get('/:id', asyncHandler(async (req, res) => {
  const group = await prisma.group.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      name: true,
      icon: true,
      background: true,
      leader: { select: { discordUsername: true } },
      members: { select: MEMBER_SELECT, orderBy: { joinedAt: 'asc' } },
    },
  });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  const myRole = req.user ? await getRole(group.id, req.user.id) : null;

  res.json({
    id: group.id,
    name: group.name,
    icon: group.icon,
    background: group.background,
    leader: group.leader.discordUsername,
    members: group.members.map((m) => ({
      userId: m.user.id,
      username: m.user.discordUsername,
      avatar: m.user.discordAvatar,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    myRole,
    canManage: canManage(myRole),
  });
}));

groupsRouter.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const role = await getRole(req.params.id, req.user!.id);
  if (!canManage(role)) {
    res.status(403).json({ error: 'Only leaders and subleaders can edit this group' });
    return;
  }

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() || undefined : undefined;
  // Icon/background become image filenames client-side — restrict to a safe
  // charset rather than trusting the client, same as the old app did.
  const icon = typeof req.body?.icon === 'string' ? req.body.icon.toLowerCase().replace(/[^a-z0-9]/g, '') || null : undefined;
  const background = typeof req.body?.background === 'string' ? req.body.background.toLowerCase().replace(/[^a-z0-9]/g, '') || null : undefined;

  await prisma.group.update({
    where: { id: req.params.id },
    data: { ...(name ? { name } : {}), ...(icon !== undefined ? { icon } : {}), ...(background !== undefined ? { background } : {}) },
  });

  res.json({ ok: true });
}));

groupsRouter.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  if (group.leaderId !== req.user!.id) {
    res.status(403).json({ error: 'Only the leader can delete this group' });
    return;
  }

  await prisma.group.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

groupsRouter.get('/:id/roster', requireAuth, asyncHandler(async (req, res) => {
  const role = await getRole(req.params.id, req.user!.id);
  if (!role) {
    res.status(403).json({ error: 'You must be a member of this group to view its roster' });
    return;
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId: req.params.id },
    select: {
      user: {
        select: {
          discordUsername: true,
          characters: {
            select: {
              id: true,
              name: true,
              profession: true,
              race: true,
              source: true,
              templates: { select: { id: true, tab: true, name: true, spec: true, isActive: true, assignedBuildId: true } },
            },
          },
        },
      },
    },
  });

  res.json(
    members.flatMap((m) =>
      m.user.characters.map((c) => ({
        id: c.id,
        name: c.name,
        profession: c.profession,
        race: c.race,
        source: c.source,
        owner: m.user.discordUsername,
        templates: c.templates,
      })),
    ),
  );
}));

groupsRouter.post('/:id/join-requests', requireAuth, asyncHandler(async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const existingRole = await getRole(group.id, req.user!.id);
  if (existingRole) {
    res.status(400).json({ error: 'You are already a member of this group' });
    return;
  }

  await prisma.groupRequest.upsert({
    where: { groupId_userId: { groupId: group.id, userId: req.user!.id } },
    update: {},
    create: { groupId: group.id, userId: req.user!.id },
  });

  res.status(201).json({ ok: true });
}));

groupsRouter.get('/:id/join-requests', requireAuth, asyncHandler(async (req, res) => {
  const role = await getRole(req.params.id, req.user!.id);
  if (!canManage(role)) {
    res.status(403).json({ error: 'Only leaders and subleaders can view join requests' });
    return;
  }

  const requests = await prisma.groupRequest.findMany({
    where: { groupId: req.params.id },
    select: { userId: true, createdAt: true, user: { select: { discordUsername: true, discordAvatar: true } } },
    orderBy: { createdAt: 'asc' },
  });

  res.json(
    requests.map((r) => ({ userId: r.userId, username: r.user.discordUsername, avatar: r.user.discordAvatar, createdAt: r.createdAt })),
  );
}));

groupsRouter.post('/:id/join-requests/:userId/approve', requireAuth, asyncHandler(async (req, res) => {
  const role = await getRole(req.params.id, req.user!.id);
  if (!canManage(role)) {
    res.status(403).json({ error: 'Only leaders and subleaders can approve join requests' });
    return;
  }

  await prisma.$transaction([
    prisma.groupRequest.deleteMany({ where: { groupId: req.params.id, userId: req.params.userId } }),
    prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: req.params.id, userId: req.params.userId } },
      update: {},
      create: { groupId: req.params.id, userId: req.params.userId, role: 'member' },
    }),
  ]);

  res.json({ ok: true });
}));

groupsRouter.post('/:id/join-requests/:userId/deny', requireAuth, asyncHandler(async (req, res) => {
  const role = await getRole(req.params.id, req.user!.id);
  if (!canManage(role)) {
    res.status(403).json({ error: 'Only leaders and subleaders can deny join requests' });
    return;
  }

  await prisma.groupRequest.deleteMany({ where: { groupId: req.params.id, userId: req.params.userId } });
  res.json({ ok: true });
}));

groupsRouter.post('/:id/members', requireAuth, asyncHandler(async (req, res) => {
  const role = await getRole(req.params.id, req.user!.id);
  if (!canManage(role)) {
    res.status(403).json({ error: 'Only leaders and subleaders can invite members' });
    return;
  }

  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  if (!username) {
    res.status(400).json({ error: 'username is required' });
    return;
  }

  const target = await prisma.user.findFirst({ where: { discordUsername: username } });
  if (!target) {
    res.status(404).json({ error: `No user found with Discord username "${username}"` });
    return;
  }

  await prisma.$transaction([
    prisma.groupRequest.deleteMany({ where: { groupId: req.params.id, userId: target.id } }),
    prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: req.params.id, userId: target.id } },
      update: {},
      create: { groupId: req.params.id, userId: target.id, role: 'member' },
    }),
  ]);

  res.json({ ok: true });
}));

// Role changes (promote to subleader, demote, or hand off leadership) are
// all leader-only, matching the old app — a subleader may manage requests
// and remove plain members, but not touch roles.
groupsRouter.put('/:id/members/:userId', requireAuth, asyncHandler(async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  if (group.leaderId !== req.user!.id) {
    res.status(403).json({ error: 'Only the leader can change member roles' });
    return;
  }

  const targetRole = await getRole(group.id, req.params.userId);
  if (!targetRole) {
    res.status(404).json({ error: 'That user is not a member of this group' });
    return;
  }

  const action = req.body?.action;
  if (action === 'promote') {
    await prisma.$transaction([
      prisma.groupMember.updateMany({ where: { groupId: group.id, role: 'subleader' }, data: { role: 'member' } }),
      prisma.groupMember.update({ where: { groupId_userId: { groupId: group.id, userId: req.params.userId } }, data: { role: 'subleader' } }),
    ]);
  } else if (action === 'demote') {
    await prisma.groupMember.update({ where: { groupId_userId: { groupId: group.id, userId: req.params.userId } }, data: { role: 'member' } });
  } else if (action === 'makeleader') {
    await prisma.$transaction([
      prisma.groupMember.updateMany({ where: { groupId: group.id, role: 'subleader' }, data: { role: 'member' } }),
      prisma.groupMember.update({ where: { groupId_userId: { groupId: group.id, userId: req.params.userId } }, data: { role: 'leader' } }),
      prisma.groupMember.update({ where: { groupId_userId: { groupId: group.id, userId: req.user!.id } }, data: { role: 'subleader' } }),
      prisma.group.update({ where: { id: group.id }, data: { leaderId: req.params.userId } }),
    ]);
  } else {
    res.status(400).json({ error: 'action must be one of: promote, demote, makeleader' });
    return;
  }

  res.json({ ok: true });
}));

groupsRouter.delete('/:id/members/:userId', requireAuth, asyncHandler(async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  const isSelf = req.params.userId === req.user!.id;
  const myRole = await getRole(group.id, req.user!.id);

  if (group.leaderId === req.params.userId) {
    res.status(400).json({ error: 'The leader cannot be removed — delete the group or hand off leadership first' });
    return;
  }
  if (!isSelf && !canManage(myRole)) {
    res.status(403).json({ error: 'Only leaders and subleaders can remove other members' });
    return;
  }
  const targetRole = await getRole(group.id, req.params.userId);
  if (!isSelf && targetRole === 'subleader' && myRole !== 'leader') {
    res.status(403).json({ error: 'Only the leader can remove a subleader' });
    return;
  }

  await prisma.groupMember.deleteMany({ where: { groupId: group.id, userId: req.params.userId } });
  res.json({ ok: true });
}));
