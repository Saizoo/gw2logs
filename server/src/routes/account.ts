import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { fetchAccount, fetchAccountGuilds, fetchGuildInfo, fetchTokenInfo } from '../lib/gw2Api.js';
import { addToGuildGroup, ensureGuildGroup, removeFromGuildGroup } from '../lib/guildGroups.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { isValidProfileIcon } from '../lib/gw2Specs.js';
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
      res.status(400).json({ error: 'This API key needs at least the "account" permission.' });
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

    res.json({ gw2AccountName: account.name });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to verify GW2 API key';
    res.status(400).json({ error: message });
  }
});

// Live list of the guilds on the user's GW2 account (names resolved via
// the public guild endpoint), for the "which guild do you represent?"
// picker. isLeader comes from account.guild_leader when the key has the
// "guilds" permission; null when that can't be determined.
accountRouter.get('/guilds', asyncHandler(async (req, res) => {
  if (!req.user!.gw2ApiKeyEnc) {
    res.status(400).json({ error: 'Link your GW2 API key first' });
    return;
  }
  const apiKey = decrypt(req.user!.gw2ApiKeyEnc);
  let account;
  try {
    account = await fetchAccountGuilds(apiKey);
  } catch {
    res.status(502).json({ error: "Couldn't reach the GW2 API — try again in a moment." });
    return;
  }
  const guildIds = account.guilds ?? [];
  const infos = await Promise.all(
    guildIds.map((id) =>
      fetchGuildInfo(id).catch(() => null),
    ),
  );
  res.json({
    displayedGuildId: req.user!.displayedGuildId,
    guilds: infos
      .filter((g): g is NonNullable<typeof g> => g !== null)
      .map((g) => ({
        id: g.id,
        name: g.name,
        tag: g.tag,
        isLeader: account.guild_leader ? account.guild_leader.includes(g.id) : null,
      })),
  });
}));

// Sets (or clears, with guildId: null) the guild this user displays. This
// is what drives guild-group membership: displaying a guild upserts the
// Guild row, auto-creates its group if needed, and adds the user; clearing
// or switching removes them from the old guild's group (with leadership
// handoff). The claim is verified against the account's real guild list.
accountRouter.post('/display-guild', asyncHandler(async (req, res) => {
  const guildId = req.body?.guildId;
  if (guildId !== null && typeof guildId !== 'string') {
    res.status(400).json({ error: 'guildId must be a guild id string or null' });
    return;
  }
  const previousGuildId = req.user!.displayedGuildId;

  if (guildId === null) {
    if (previousGuildId) {
      const oldGroup = await prisma.group.findUnique({ where: { guildId: previousGuildId } });
      if (oldGroup) await removeFromGuildGroup(oldGroup.id, req.user!.id);
      await prisma.user.update({ where: { id: req.user!.id }, data: { displayedGuildId: null } });
    }
    res.json({ displayedGuild: null });
    return;
  }

  if (!req.user!.gw2ApiKeyEnc) {
    res.status(400).json({ error: 'Link your GW2 API key first' });
    return;
  }
  const apiKey = decrypt(req.user!.gw2ApiKeyEnc);
  let account;
  try {
    account = await fetchAccountGuilds(apiKey);
  } catch {
    res.status(502).json({ error: "Couldn't reach the GW2 API — try again in a moment." });
    return;
  }
  if (!(account.guilds ?? []).includes(guildId)) {
    res.status(400).json({ error: 'That guild is not on your GW2 account' });
    return;
  }

  const info = await fetchGuildInfo(guildId);
  const guild = await prisma.guild.upsert({
    where: { id: guildId },
    update: {
      name: info.name,
      tag: info.tag,
      // The in-game leader's key is the only one the GW2 API lets read
      // members/ranks — remember whose key that is for rank syncs.
      ...(account.guild_leader?.includes(guildId) ? { syncUserId: req.user!.id } : {}),
    },
    create: {
      id: guildId,
      name: info.name,
      tag: info.tag,
      syncUserId: account.guild_leader?.includes(guildId) ? req.user!.id : null,
    },
  });

  const group = await ensureGuildGroup(guild, req.user!.id);
  await addToGuildGroup(group.id, req.user!.id);

  if (previousGuildId && previousGuildId !== guildId) {
    const oldGroup = await prisma.group.findUnique({ where: { guildId: previousGuildId } });
    if (oldGroup) await removeFromGuildGroup(oldGroup.id, req.user!.id);
  }

  await prisma.user.update({ where: { id: req.user!.id }, data: { displayedGuildId: guildId } });
  res.json({ displayedGuild: { id: guild.id, name: guild.name, tag: guild.tag, groupId: group.id } });
}));

// Marks the first-login tour as done (completed or skipped — either way it
// shouldn't greet the user again). Idempotent; keeps the earliest timestamp.
accountRouter.post('/onboarding-complete', asyncHandler(async (req, res) => {
  if (!req.user!.onboardedAt) {
    await prisma.user.update({ where: { id: req.user!.id }, data: { onboardedAt: new Date() } });
  }
  res.json({ ok: true });
}));

// Privacy toggles: hide my name from shared log displays, and/or make my
// profile page private to others. Only the provided keys change.
accountRouter.put('/privacy', asyncHandler(async (req, res) => {
  const data: { hideName?: boolean; privateProfile?: boolean } = {};
  if (typeof req.body?.hideName === 'boolean') data.hideName = req.body.hideName;
  if (typeof req.body?.privateProfile === 'boolean') data.privateProfile = req.body.privateProfile;
  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'Provide hideName and/or privateProfile as booleans' });
    return;
  }
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data,
    select: { hideName: true, privateProfile: true },
  });
  res.json(user);
}));

// Profile icon: the spec/profession the user picked to represent themselves
// on their profile page (also drives the header background). Pass a valid
// spec/profession name to set it, or null to clear back to the auto default.
accountRouter.put('/profile-icon', asyncHandler(async (req, res) => {
  const raw = req.body?.profileIcon;
  if (raw !== null && typeof raw !== 'string') {
    res.status(400).json({ error: 'Provide profileIcon as a spec/profession name, or null to clear' });
    return;
  }
  if (typeof raw === 'string' && !isValidProfileIcon(raw)) {
    res.status(400).json({ error: 'Unknown spec or profession' });
    return;
  }
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { profileIcon: raw },
    select: { profileIcon: true },
  });
  res.json(user);
}));

accountRouter.post('/unlink-gw2', asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  await prisma.$transaction([
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
  runDpsReportImport(userToken, batchId, total, req.user!.id).catch((err) => {
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

async function runDpsReportImport(userToken: string, batchId: string, total: number, userId: string): Promise<void> {
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
          await persistLog({ contentHash, sourceFileName: `dps.report:${upload.id}`, uploadedBy: userId, normalized });
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
