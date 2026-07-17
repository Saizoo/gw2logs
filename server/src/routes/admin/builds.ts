import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { audit } from '../../lib/audit.js';

export const adminBuildsRouter = Router();

// Mirrors the ProfessionKey/BuildCategory unions in src/data/builds.ts —
// duplicated here (not imported) because the frontend and server are
// separate TypeScript projects, same as BOSS_WING/BUFF_IDS elsewhere on
// the server. Both are small, fixed sets tied to the game itself.
const PROFESSIONS = new Set(['guard', 'rev', 'war', 'eng', 'rang', 'thief', 'ele', 'mes', 'nec']);
const CATEGORIES = new Set(['pdps', 'cdps', 'qdps', 'adps', 'qheal', 'aheal', 'tank', 'kiter']);

function validate(body: any): { error: string } | { value: { profession: string; category: string; name: string; weapons: string; url: string } } {
  const { profession, category, name, weapons, url } = body ?? {};
  if (typeof profession !== 'string' || !PROFESSIONS.has(profession)) {
    return { error: `profession must be one of: ${[...PROFESSIONS].join(', ')}` };
  }
  if (typeof category !== 'string' || !CATEGORIES.has(category)) {
    return { error: `category must be one of: ${[...CATEGORIES].join(', ')}` };
  }
  if (typeof name !== 'string' || !name.trim()) return { error: 'name is required' };
  if (typeof weapons !== 'string' || !weapons.trim()) return { error: 'weapons is required' };
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return { error: 'url must be a valid http(s) URL' };
  return { value: { profession, category, name: name.trim(), weapons: weapons.trim(), url: url.trim() } };
}

// Derives the same path-based id scheme the static catalog and every
// existing CompositionSlot.buildId already use, so new builds stay
// consistent with old ones rather than switching to a different id shape
// partway through the catalog.
function deriveId(url: string, profession: string): string {
  try {
    const path = new URL(url).pathname.replace(/^\/+|\/+$/g, '');
    const segments = path.split('/');
    return segments.slice(-2).join('/') || `${profession}/${Date.now()}`;
  } catch {
    return `${profession}/${Date.now()}`;
  }
}

adminBuildsRouter.get('/', asyncHandler(async (_req, res) => {
  const builds = await prisma.build.findMany({ orderBy: [{ profession: 'asc' }, { sortOrder: 'asc' }] });
  res.json(builds);
}));

adminBuildsRouter.post('/', asyncHandler(async (req, res) => {
  const result = validate(req.body);
  if ('error' in result) {
    res.status(400).json({ error: result.error });
    return;
  }

  const id = deriveId(result.value.url, result.value.profession);
  const existing = await prisma.build.findUnique({ where: { id } });
  if (existing) {
    res.status(409).json({ error: `A build with id "${id}" already exists (derived from the URL) — edit that one instead, or use a different guide URL.` });
    return;
  }

  const maxSortOrder = await prisma.build.aggregate({
    where: { profession: result.value.profession },
    _max: { sortOrder: true },
  });

  const build = await prisma.build.create({
    data: { id, ...result.value, sortOrder: (maxSortOrder._max.sortOrder ?? -1) + 1 },
  });
  res.status(201).json(build);
}));

adminBuildsRouter.put('/:id', asyncHandler(async (req, res) => {
  const result = validate(req.body);
  if ('error' in result) {
    res.status(400).json({ error: result.error });
    return;
  }

  const existing = await prisma.build.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Build not found' });
    return;
  }

  const build = await prisma.build.update({ where: { id: req.params.id }, data: result.value });
  res.json(build);
}));

adminBuildsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const existing = await prisma.build.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: 'Build not found' });
    return;
  }

  // CompositionSlot.buildId is a plain string field, not a foreign key
  // (see schema.prisma) — deleting a Build doesn't cascade or get blocked,
  // it just leaves any slot that referenced it pointing at a now-missing
  // id. Surface that to the admin instead of deleting silently.
  const referencedBy = await prisma.compositionSlot.count({ where: { buildId: req.params.id } });

  await prisma.build.delete({ where: { id: req.params.id } });
  audit(req.user!.id, 'build_delete', 'build', req.params.id);
  res.json({ ok: true, referencedSlots: referencedBy });
}));
