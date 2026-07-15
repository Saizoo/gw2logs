import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const compositionsRouter = Router();

async function requireGuildMember(userId: string, guildId: string): Promise<boolean> {
  const membership = await prisma.guildMembership.findUnique({
    where: { userId_guildId: { userId, guildId } },
  });
  return Boolean(membership);
}

compositionsRouter.get('/', asyncHandler(async (req, res) => {
  const guildTag = typeof req.query.guildTag === 'string' ? req.query.guildTag : undefined;
  if (!guildTag) {
    res.status(400).json({ error: 'guildTag query param is required' });
    return;
  }

  const guild = await prisma.guild.findFirst({ where: { tag: guildTag } });
  if (!guild) {
    res.status(404).json({ error: 'Guild not found' });
    return;
  }

  const compositions = await prisma.composition.findMany({
    where: { guildId: guild.id },
    select: { id: true, name: true, fightName: true, updatedAt: true, createdBy: { select: { discordUsername: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  res.json(
    compositions.map((c) => ({
      id: c.id,
      name: c.name,
      fightName: c.fightName,
      updatedAt: c.updatedAt,
      createdBy: c.createdBy.discordUsername,
    })),
  );
}));

compositionsRouter.get('/:id', asyncHandler(async (req, res) => {
  const composition = await prisma.composition.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      name: true,
      fightName: true,
      guildId: true,
      guild: { select: { tag: true, name: true } },
      createdBy: { select: { discordUsername: true } },
      updatedAt: true,
      slots: {
        select: { subgroup: true, slotIndex: true, role: true, profession: true, spec: true, buildName: true, buildDetails: true },
        orderBy: [{ subgroup: 'asc' }, { slotIndex: 'asc' }],
      },
    },
  });

  if (!composition) {
    res.status(404).json({ error: 'Composition not found' });
    return;
  }

  res.json({
    id: composition.id,
    name: composition.name,
    fightName: composition.fightName,
    guildTag: composition.guild.tag,
    guildName: composition.guild.name,
    createdBy: composition.createdBy.discordUsername,
    updatedAt: composition.updatedAt,
    slots: composition.slots,
  });
}));

compositionsRouter.post('/', requireAuth, asyncHandler(async (req, res) => {
  const guildTag = typeof req.body?.guildTag === 'string' ? req.body.guildTag.trim() : '';
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const fightName = typeof req.body?.fightName === 'string' ? req.body.fightName.trim() || null : null;

  if (!guildTag || !name) {
    res.status(400).json({ error: 'guildTag and name are required' });
    return;
  }

  const guild = await prisma.guild.findFirst({ where: { tag: guildTag } });
  if (!guild) {
    res.status(404).json({ error: 'Guild not found' });
    return;
  }

  if (!(await requireGuildMember(req.user!.id, guild.id))) {
    res.status(403).json({ error: 'You must be a member of this guild to create a composition for it' });
    return;
  }

  const composition = await prisma.composition.create({
    data: { guildId: guild.id, name, fightName, createdById: req.user!.id },
  });

  res.status(201).json({ id: composition.id });
}));

compositionsRouter.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const composition = await prisma.composition.findUnique({ where: { id: req.params.id } });
  if (!composition) {
    res.status(404).json({ error: 'Composition not found' });
    return;
  }
  if (!(await requireGuildMember(req.user!.id, composition.guildId))) {
    res.status(403).json({ error: 'You must be a member of this guild to edit this composition' });
    return;
  }

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : undefined;
  const fightName = typeof req.body?.fightName === 'string' ? req.body.fightName.trim() || null : undefined;

  await prisma.composition.update({
    where: { id: composition.id },
    data: {
      ...(name ? { name } : {}),
      ...(fightName !== undefined ? { fightName } : {}),
    },
  });

  res.json({ ok: true });
}));

compositionsRouter.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const composition = await prisma.composition.findUnique({ where: { id: req.params.id } });
  if (!composition) {
    res.status(404).json({ error: 'Composition not found' });
    return;
  }
  if (!(await requireGuildMember(req.user!.id, composition.guildId))) {
    res.status(403).json({ error: 'You must be a member of this guild to delete this composition' });
    return;
  }

  await prisma.composition.delete({ where: { id: composition.id } });
  res.json({ ok: true });
}));

compositionsRouter.put('/:id/slots/:subgroup/:slotIndex', requireAuth, asyncHandler(async (req, res) => {
  const composition = await prisma.composition.findUnique({ where: { id: req.params.id } });
  if (!composition) {
    res.status(404).json({ error: 'Composition not found' });
    return;
  }
  if (!(await requireGuildMember(req.user!.id, composition.guildId))) {
    res.status(403).json({ error: 'You must be a member of this guild to edit this composition' });
    return;
  }

  const subgroup = Number(req.params.subgroup);
  const slotIndex = Number(req.params.slotIndex);
  if (!Number.isInteger(subgroup) || !Number.isInteger(slotIndex)) {
    res.status(400).json({ error: 'subgroup and slotIndex must be integers' });
    return;
  }

  const role = typeof req.body?.role === 'string' ? req.body.role.trim() : '';
  const profession = typeof req.body?.profession === 'string' ? req.body.profession.trim() : '';
  if (!role || !profession) {
    res.status(400).json({ error: 'role and profession are required' });
    return;
  }
  const spec = typeof req.body?.spec === 'string' ? req.body.spec.trim() || null : null;
  const buildName = typeof req.body?.buildName === 'string' ? req.body.buildName.trim() || null : null;
  const buildDetails = typeof req.body?.buildDetails === 'string' ? req.body.buildDetails.trim() || null : null;

  await prisma.compositionSlot.upsert({
    where: { compositionId_subgroup_slotIndex: { compositionId: composition.id, subgroup, slotIndex } },
    update: { role, profession, spec, buildName, buildDetails },
    create: { compositionId: composition.id, subgroup, slotIndex, role, profession, spec, buildName, buildDetails },
  });
  await prisma.composition.update({ where: { id: composition.id }, data: {} }); // bump updatedAt

  res.json({ ok: true });
}));

compositionsRouter.delete('/:id/slots/:subgroup/:slotIndex', requireAuth, asyncHandler(async (req, res) => {
  const composition = await prisma.composition.findUnique({ where: { id: req.params.id } });
  if (!composition) {
    res.status(404).json({ error: 'Composition not found' });
    return;
  }
  if (!(await requireGuildMember(req.user!.id, composition.guildId))) {
    res.status(403).json({ error: 'You must be a member of this guild to edit this composition' });
    return;
  }

  const subgroup = Number(req.params.subgroup);
  const slotIndex = Number(req.params.slotIndex);

  await prisma.compositionSlot.deleteMany({
    where: { compositionId: composition.id, subgroup, slotIndex },
  });

  res.json({ ok: true });
}));
