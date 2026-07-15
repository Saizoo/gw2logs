import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/asyncHandler.js';

export const adminLogsRouter = Router();

adminLogsRouter.get('/', asyncHandler(async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Math.max(Number(req.query.offset ?? 0), 0);

  const where = search ? { fightName: { contains: search, mode: 'insensitive' as const } } : {};

  const [total, logs] = await Promise.all([
    prisma.log.count({ where }),
    prisma.log.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        fightName: true,
        isCm: true,
        success: true,
        squadDps: true,
        durationMs: true,
        uploadedAt: true,
        sourceFileName: true,
        _count: { select: { players: true } },
      },
    }),
  ]);

  res.json({
    total,
    logs: logs.map((l) => ({
      id: l.id,
      boss: l.fightName,
      isCm: l.isCm,
      success: l.success,
      squadDps: l.squadDps,
      durationMs: l.durationMs,
      uploadedAt: l.uploadedAt,
      sourceFileName: l.sourceFileName,
      playerCount: l._count.players,
    })),
  });
}));

adminLogsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const log = await prisma.log.findUnique({ where: { id: req.params.id } });
  if (!log) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }

  // LogPlayer/MechanicEvent cascade automatically (onDelete: Cascade). Any
  // UploadJob that pointed at this log keeps its record but its logId now
  // dangles — that's fine, it's just a plain field, not a foreign key (see
  // Log's other consumers of that same pattern).
  await prisma.log.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));
