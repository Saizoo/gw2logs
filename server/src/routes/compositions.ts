import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getGroupRole, canManageGroup } from '../lib/groupAccess.js';

export const compositionsRouter = Router();

const SLOT_SELECT = {
  subgroup: true,
  slotIndex: true,
  role: true,
  profession: true,
  spec: true,
  buildName: true,
  buildDetails: true,
  buildId: true,
  characterId: true,
  characterTemplateId: true,
  character: { select: { name: true } },
} as const;

compositionsRouter.get('/', asyncHandler(async (req, res) => {
  const groupId = typeof req.query.groupId === 'string' ? req.query.groupId : undefined;
  if (!groupId) {
    res.status(400).json({ error: 'groupId query param is required' });
    return;
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  const compositions = await prisma.composition.findMany({
    where: { groupId },
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
      groupId: true,
      group: { select: { name: true } },
      createdBy: { select: { discordUsername: true } },
      updatedAt: true,
      slots: {
        select: SLOT_SELECT,
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
    groupId: composition.groupId,
    groupName: composition.group.name,
    createdBy: composition.createdBy.discordUsername,
    updatedAt: composition.updatedAt,
    slots: composition.slots.map((s) => ({
      subgroup: s.subgroup,
      slotIndex: s.slotIndex,
      role: s.role,
      profession: s.profession,
      spec: s.spec,
      buildName: s.buildName,
      buildDetails: s.buildDetails,
      buildId: s.buildId,
      characterId: s.characterId,
      characterName: s.character?.name ?? null,
      characterTemplateId: s.characterTemplateId,
    })),
  });
}));

compositionsRouter.post('/', requireAuth, asyncHandler(async (req, res) => {
  const groupId = typeof req.body?.groupId === 'string' ? req.body.groupId.trim() : '';
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const fightName = typeof req.body?.fightName === 'string' ? req.body.fightName.trim() || null : null;

  if (!groupId || !name) {
    res.status(400).json({ error: 'groupId and name are required' });
    return;
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  if (!canManageGroup(await getGroupRole(groupId, req.user!.id))) {
    res.status(403).json({ error: 'Only leaders and subleaders can create compositions for this group' });
    return;
  }

  const composition = await prisma.composition.create({
    data: { groupId, name, fightName, createdById: req.user!.id },
  });

  res.status(201).json({ id: composition.id });
}));

compositionsRouter.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const composition = await prisma.composition.findUnique({ where: { id: req.params.id } });
  if (!composition) {
    res.status(404).json({ error: 'Composition not found' });
    return;
  }
  if (!canManageGroup(await getGroupRole(composition.groupId, req.user!.id))) {
    res.status(403).json({ error: 'Only leaders and subleaders can edit this composition' });
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
  if (!canManageGroup(await getGroupRole(composition.groupId, req.user!.id))) {
    res.status(403).json({ error: 'Only leaders and subleaders can delete this composition' });
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
  if (!canManageGroup(await getGroupRole(composition.groupId, req.user!.id))) {
    res.status(403).json({ error: 'Only leaders and subleaders can edit this composition' });
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
  // Structured fields, set when the slot was filled by picking a real
  // catalog build / character rather than typing a description by hand.
  const buildId = typeof req.body?.buildId === 'string' ? req.body.buildId.trim() || null : null;
  const characterId = typeof req.body?.characterId === 'string' ? req.body.characterId.trim() || null : null;
  const characterTemplateId = typeof req.body?.characterTemplateId === 'string' ? req.body.characterTemplateId.trim() || null : null;

  if (characterId) {
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) {
      res.status(400).json({ error: 'characterId does not refer to a real character' });
      return;
    }
  }

  await prisma.compositionSlot.upsert({
    where: { compositionId_subgroup_slotIndex: { compositionId: composition.id, subgroup, slotIndex } },
    update: { role, profession, spec, buildName, buildDetails, buildId, characterId, characterTemplateId },
    create: { compositionId: composition.id, subgroup, slotIndex, role, profession, spec, buildName, buildDetails, buildId, characterId, characterTemplateId },
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
  if (!canManageGroup(await getGroupRole(composition.groupId, req.user!.id))) {
    res.status(403).json({ error: 'Only leaders and subleaders can edit this composition' });
    return;
  }

  const subgroup = Number(req.params.subgroup);
  const slotIndex = Number(req.params.slotIndex);

  await prisma.compositionSlot.deleteMany({
    where: { compositionId: composition.id, subgroup, slotIndex },
  });

  res.json({ ok: true });
}));
