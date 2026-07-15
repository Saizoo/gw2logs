import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { encrypt } from '../lib/crypto.js';
import { fetchAccount, fetchTokenInfo } from '../lib/gw2Api.js';
import { syncGuildsForUser } from '../lib/guildSync.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { fetchDpsReportJson, fetchDpsReportUploads } from '../lib/dpsReportImport.js';
import { normalizeEiJson } from '../lib/ingest.js';
import { persistLog } from '../lib/persist.js';
import { createBatch, getBatch, updateBatch } from '../lib/importBatches.js';

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

accountRouter.post('/unlink-gw2', asyncHandler(async (req, res) => {
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
}));

// Sane upper bound on one import run so a token with an enormous or
// unbounded upload history can't queue a background job that runs forever.
const MAX_IMPORT_LOGS = 500;

accountRouter.post('/import-dpsreport', asyncHandler(async (req, res) => {
  const userToken = typeof req.body?.userToken === 'string' ? req.body.userToken.trim() : '';
  if (!userToken) {
    res.status(400).json({ error: 'userToken is required' });
    return;
  }

  let firstPage;
  try {
    firstPage = await fetchDpsReportUploads(userToken, 1);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to reach dps.report' });
    return;
  }

  if (firstPage.totalUploads === 0) {
    res.json({ batchId: null, total: 0 });
    return;
  }

  const batchId = randomBytes(8).toString('hex');
  const total = Math.min(firstPage.totalUploads, MAX_IMPORT_LOGS);
  createBatch(batchId, total);

  // Deliberately not awaited: a full import history can take minutes, and
  // blocking the response on it would hit the same request-timeout class of
  // bug already fixed elsewhere in this app (Nginx's proxy_read_timeout).
  // The client polls GET /import-dpsreport/:batchId for progress instead.
  runDpsReportImport(userToken, batchId, total).catch((err) => {
    updateBatch(batchId, { done: true, error: err instanceof Error ? err.message : 'Import failed' });
  });

  res.json({ batchId, total });
}));

accountRouter.get('/import-dpsreport/:batchId', (req, res) => {
  const batch = getBatch(req.params.batchId);
  if (!batch) {
    res.status(404).json({ error: 'Unknown or expired import batch' });
    return;
  }
  res.json(batch);
});

async function runDpsReportImport(userToken: string, batchId: string, total: number): Promise<void> {
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let page = 1;

  while (processed < total) {
    const { uploads, pages } = await fetchDpsReportUploads(userToken, page);
    if (uploads.length === 0) break;

    for (const upload of uploads) {
      if (processed >= total) break;
      processed++;

      try {
        if (upload.encounter?.error) throw new Error(upload.encounter.error);

        // dps.report imports have no source file to hash, so the upload's
        // own id (stable, unique per dps.report upload) doubles as the
        // dedup key on the same contentHash column direct uploads use.
        const contentHash = `dpsreport:${upload.id}`;
        const alreadyImported = await prisma.log.findUnique({ where: { contentHash } });
        if (!alreadyImported) {
          const rawJson = await fetchDpsReportJson(upload.permalink);
          const normalized = normalizeEiJson(rawJson);
          await persistLog({ contentHash, sourceFileName: `dps.report:${upload.id}`, normalized });
        }
        succeeded++;
      } catch {
        failed++;
      }

      updateBatch(batchId, { processed, succeeded, failed });
    }

    if (page >= pages) break;
    page++;
  }

  updateBatch(batchId, { done: true });
}
