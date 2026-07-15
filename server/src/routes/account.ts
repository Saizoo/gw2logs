import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { encrypt } from '../lib/crypto.js';
import { fetchAccount, fetchTokenInfo } from '../lib/gw2Api.js';
import { syncGuildsForUser } from '../lib/guildSync.js';

export const accountRouter = Router();

accountRouter.use(requireAuth);

accountRouter.post('/link-gw2', async (req, res) => {
  const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
  if (!apiKey) {
    res.status(400).json({ error: 'apiKey is required' });
    return;
  }

  try {
    const tokenInfo = await fetchTokenInfo(apiKey);
    if (!tokenInfo.permissions.includes('account')) {
      res.status(400).json({ error: 'This API key needs at least the "account" permission. Create a new key with "account" and "guilds" checked.' });
      return;
    }

    const account = await fetchAccount(apiKey);

    const existingOwner = await prisma.user.findUnique({ where: { gw2AccountName: account.name } });
    if (existingOwner && existingOwner.id !== req.user!.id) {
      res.status(409).json({ error: `${account.name} is already linked to a different Discord account.` });
      return;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        gw2AccountName: account.name,
        gw2ApiKeyEnc: encrypt(apiKey),
        gw2LinkedAt: new Date(),
      },
    });

    // Link (or create) the Player row for this account so the profile page
    // works immediately, even before any log from this account is uploaded.
    await prisma.player.upsert({
      where: { account: account.name },
      update: { userId: user.id },
      create: { account: account.name, displayName: account.name.split('.')[0], userId: user.id },
    });

    const guildsScoped = tokenInfo.permissions.includes('guilds');
    const guilds = guildsScoped ? await syncGuildsForUser(user.id, account) : [];

    res.json({
      gw2AccountName: account.name,
      guildsSynced: guildsScoped,
      guilds: guilds.map((g) => ({ name: g.name, tag: g.tag })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to verify GW2 API key';
    res.status(400).json({ error: message });
  }
});

accountRouter.post('/unlink-gw2', async (req, res) => {
  const userId = req.user!.id;

  await prisma.$transaction([
    prisma.guildMembership.deleteMany({ where: { userId } }),
    prisma.player.updateMany({ where: { userId }, data: { userId: null } }),
    prisma.user.update({
      where: { id: userId },
      data: { gw2AccountName: null, gw2ApiKeyEnc: null, gw2LinkedAt: null },
    }),
  ]);

  res.json({ ok: true });
});
