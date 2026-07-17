import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { decrypt } from '../../lib/crypto.js';
import { fetchGuildMembers, fetchGuildRanks } from '../../lib/gw2Api.js';
import { applyGuildRanks } from '../../lib/guildGroups.js';
import { audit } from '../../lib/audit.js';

export const adminGuildsRouter = Router();

adminGuildsRouter.get('/', asyncHandler(async (_req, res) => {
  const guilds = await prisma.guild.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      tag: true,
      createdAt: true,
      lastRankSyncAt: true,
      syncUserId: true,
      group: { select: { id: true, name: true, _count: { select: { members: true } } } },
      _count: { select: { displayedBy: true } },
    },
  });
  const syncUserIds = guilds.map((g) => g.syncUserId).filter((id): id is string => id !== null);
  const syncUsers = await prisma.user.findMany({
    where: { id: { in: syncUserIds } },
    select: { id: true, gw2AccountName: true, discordUsername: true },
  });
  const syncUserById = new Map(syncUsers.map((u) => [u.id, u.gw2AccountName ?? u.discordUsername]));

  res.json(
    guilds.map((g) => ({
      id: g.id,
      name: g.name,
      tag: g.tag,
      createdAt: g.createdAt,
      lastRankSyncAt: g.lastRankSyncAt,
      syncKeyHolder: g.syncUserId ? syncUserById.get(g.syncUserId) ?? null : null,
      displayedByCount: g._count.displayedBy,
      group: g.group ? { id: g.group.id, name: g.group.name, memberCount: g.group._count.members } : null,
    })),
  );
}));

// Force a rank resync using the recorded leader key — the admin themselves
// may not be a guild member, so unlike the group-side sync there's no
// "try my key first" step.
adminGuildsRouter.post('/:id/resync', asyncHandler(async (req, res) => {
  const guild = await prisma.guild.findUnique({
    where: { id: req.params.id },
    select: { id: true, syncUserId: true, group: { select: { id: true } } },
  });
  if (!guild?.group) {
    res.status(404).json({ error: 'Guild or its group not found' });
    return;
  }
  const holder = guild.syncUserId
    ? await prisma.user.findUnique({ where: { id: guild.syncUserId }, select: { id: true, gw2ApiKeyEnc: true } })
    : null;
  if (!holder?.gw2ApiKeyEnc) {
    res.status(400).json({ error: 'No leader API key on record for this guild — the in-game leader must display the guild with a linked key first.' });
    return;
  }
  try {
    const apiKey = decrypt(holder.gw2ApiKeyEnc);
    const [members, ranks] = await Promise.all([
      fetchGuildMembers(guild.id, apiKey),
      fetchGuildRanks(guild.id, apiKey),
    ]);
    const result = await applyGuildRanks(guild.group.id, members, ranks);
    await prisma.guild.update({ where: { id: guild.id }, data: { lastRankSyncAt: new Date() } });
    audit(req.user!.id, 'guild_rank_resync', 'guild', guild.id, { matched: result.matched });
    res.json({ ok: true, ...result });
  } catch {
    res.status(502).json({ error: "The recorded key couldn't read this guild's roster — the GW2 API restricts it to the current in-game leader." });
    return;
  }
}));

// Clears the recorded leader key (e.g. the leader left the guild or
// unlinked) so the next legitimate leader to display the guild becomes
// the sync source.
adminGuildsRouter.post('/:id/clear-sync-key', asyncHandler(async (req, res) => {
  const guild = await prisma.guild.findUnique({ where: { id: req.params.id } });
  if (!guild) {
    res.status(404).json({ error: 'Guild not found' });
    return;
  }
  await prisma.guild.update({ where: { id: guild.id }, data: { syncUserId: null } });
  audit(req.user!.id, 'guild_clear_sync_key', 'guild', guild.id, { name: guild.name });
  res.json({ ok: true });
}));

// Removes the guild AND its auto-created group. Users who displayed this
// guild are reset to no displayed guild (FK is SetNull); re-displaying
// recreates everything from scratch.
adminGuildsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const guild = await prisma.guild.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, tag: true, group: { select: { id: true } } },
  });
  if (!guild) {
    res.status(404).json({ error: 'Guild not found' });
    return;
  }
  if (guild.group) await prisma.group.delete({ where: { id: guild.group.id } });
  await prisma.guild.delete({ where: { id: guild.id } });
  audit(req.user!.id, 'guild_delete', 'guild', guild.id, { name: guild.name, tag: guild.tag });
  res.json({ ok: true });
}));
