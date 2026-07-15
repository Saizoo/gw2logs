import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const buildsRouter = Router();

// Public, read-only — every signed-in raid member browses this from the
// Raid Planner and Characters pages, not just admins. Editing happens
// under /api/admin/builds instead.
buildsRouter.get('/', asyncHandler(async (_req, res) => {
  const builds = await prisma.build.findMany({
    orderBy: [{ profession: 'asc' }, { sortOrder: 'asc' }],
  });
  res.json(
    builds.map((b) => ({
      id: b.id,
      profession: b.profession,
      category: b.category,
      name: b.name,
      weapons: b.weapons,
      url: b.url,
    })),
  );
}));
