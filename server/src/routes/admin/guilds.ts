import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

export const adminGuildsRouter = Router();

// Guilds are read-mostly (synced wholesale from a member's GW2 API key, see
// account.ts) — nothing to edit here, just visibility into what's synced.
adminGuildsRouter.get('/', asyncHandler(async (_req, res) => {
  const guilds = await prisma.guild.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, tag: true, lastSyncedAt: true, _count: { select: { memberships: true } } },
  });
  res.json(
    guilds.map((g) => ({
      id: g.id,
      name: g.name,
      tag: g.tag,
      lastSyncedAt: g.lastSyncedAt,
      memberCount: g._count.memberships,
    })),
  );
}));
