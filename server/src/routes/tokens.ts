import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { createApiToken } from '../lib/apiToken.js';

// Personal access tokens, managed from the website's Account page. The raw
// token is returned exactly once (on create); afterwards only its name and
// usage metadata are ever shown.
export const tokensRouter = Router();

const MAX_TOKENS_PER_USER = 10;

tokensRouter.get('/', requireAuth, asyncHandler(async (req, res) => {
  const tokens = await prisma.apiToken.findMany({
    where: { userId: req.user!.id },
    select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tokens);
}));

tokensRouter.post('/', requireAuth, asyncHandler(async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 60) : '';
  if (!name) {
    res.status(400).json({ error: 'A name is required (e.g. "My desktop").' });
    return;
  }
  const count = await prisma.apiToken.count({ where: { userId: req.user!.id } });
  if (count >= MAX_TOKENS_PER_USER) {
    res.status(400).json({ error: `You already have ${MAX_TOKENS_PER_USER} tokens. Revoke one before creating another.` });
    return;
  }
  const { id, token } = await createApiToken(req.user!.id, name);
  // `token` is the only time the raw value leaves the server.
  res.status(201).json({ id, name, token });
}));

tokensRouter.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  await prisma.apiToken.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
  res.json({ ok: true });
}));
