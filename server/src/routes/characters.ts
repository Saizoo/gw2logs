import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { decrypt } from '../lib/crypto.js';
import { syncCharactersForUser, MissingPermissionError } from '../lib/characterSync.js';

export const charactersRouter = Router();

charactersRouter.use(requireAuth);

const CHARACTER_SELECT = {
  id: true,
  name: true,
  profession: true,
  race: true,
  source: true,
  activeTab: true,
  templates: { select: { id: true, tab: true, name: true, spec: true, isActive: true, assignedBuildId: true }, orderBy: { tab: 'asc' as const } },
};

charactersRouter.get('/', asyncHandler(async (req, res) => {
  const characters = await prisma.character.findMany({
    where: { userId: req.user!.id },
    select: CHARACTER_SELECT,
    orderBy: { name: 'asc' },
  });
  res.json(characters);
}));

charactersRouter.post('/', asyncHandler(async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const profession = typeof req.body?.profession === 'string' ? req.body.profession.trim() : '';
  const race = typeof req.body?.race === 'string' ? req.body.race.trim() || null : null;
  if (!name || !profession) {
    res.status(400).json({ error: 'name and profession are required' });
    return;
  }

  try {
    const character = await prisma.character.create({
      data: { userId: req.user!.id, name, profession, race, source: 'manual' },
    });
    // Manually-added characters start with 3 blank template slots, same as
    // the old app, so there's somewhere to assign a build right away.
    await prisma.characterTemplate.createMany({
      data: [1, 2, 3].map((tab) => ({ characterId: character.id, tab })),
    });
    res.status(201).json({ id: character.id });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      res.status(409).json({ error: `You already have a character named "${name}"` });
      return;
    }
    throw err;
  }
}));

charactersRouter.delete('/:id', asyncHandler(async (req, res) => {
  const character = await prisma.character.findUnique({ where: { id: req.params.id } });
  if (!character || character.userId !== req.user!.id) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }
  await prisma.character.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

charactersRouter.put('/:id/templates/:tab', asyncHandler(async (req, res) => {
  const character = await prisma.character.findUnique({ where: { id: req.params.id } });
  if (!character || character.userId !== req.user!.id) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }

  const tab = Number(req.params.tab);
  if (!Number.isInteger(tab)) {
    res.status(400).json({ error: 'tab must be an integer' });
    return;
  }

  const assignedBuildId = typeof req.body?.assignedBuildId === 'string' ? req.body.assignedBuildId.trim() || null : null;

  await prisma.characterTemplate.upsert({
    where: { characterId_tab: { characterId: character.id, tab } },
    update: { assignedBuildId },
    create: { characterId: character.id, tab, assignedBuildId },
  });

  res.json({ ok: true });
}));

// Re-pulls this user's characters/build-tabs/specializations from the GW2
// API using the API key already linked via /api/account/link-gw2 — no
// need to paste the key again just to sync characters.
charactersRouter.post('/sync', asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { gw2ApiKeyEnc: true } });
  if (!user?.gw2ApiKeyEnc) {
    res.status(400).json({ error: 'Link your GW2 API key from the Account page first.' });
    return;
  }

  try {
    const apiKey = decrypt(user.gw2ApiKeyEnc);
    const count = await syncCharactersForUser(req.user!.id, apiKey);
    res.json({ ok: true, count });
  } catch (err) {
    if (err instanceof MissingPermissionError) {
      res.status(400).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Failed to sync characters from the GW2 API';
    res.status(502).json({ error: message });
  }
}));
