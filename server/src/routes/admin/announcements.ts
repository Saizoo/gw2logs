import { Router } from 'express';
import { prisma } from '../../db.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { audit } from '../../lib/audit.js';

export const adminAnnouncementsRouter = Router();

const SEVERITIES = new Set(['info', 'warning', 'critical']);

adminAnnouncementsRouter.get('/', asyncHandler(async (_req, res) => {
  const rows = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      message: true,
      severity: true,
      expiresAt: true,
      createdAt: true,
      createdBy: { select: { gw2AccountName: true, discordUsername: true } },
    },
  });
  const now = Date.now();
  res.json(
    rows.map((r) => ({
      id: r.id,
      message: r.message,
      severity: r.severity,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
      createdBy: r.createdBy.gw2AccountName ?? r.createdBy.discordUsername,
      expired: r.expiresAt !== null && r.expiresAt.getTime() <= now,
    })),
  );
}));

adminAnnouncementsRouter.post('/', asyncHandler(async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 500) : '';
  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }
  const severity = typeof req.body?.severity === 'string' && SEVERITIES.has(req.body.severity) ? req.body.severity : 'info';
  let expiresAt: Date | null = null;
  if (req.body?.expiresAt != null) {
    const parsed = new Date(req.body.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      res.status(400).json({ error: 'expiresAt must be a valid date-time (or null for no expiry)' });
      return;
    }
    if (parsed.getTime() <= Date.now()) {
      res.status(400).json({ error: 'expiresAt must be in the future' });
      return;
    }
    expiresAt = parsed;
  }

  const row = await prisma.announcement.create({
    data: { message, severity, expiresAt, createdById: req.user!.id },
  });
  audit(req.user!.id, 'announcement_create', 'announcement', row.id, { severity, expiresAt });
  res.status(201).json({ id: row.id });
}));

// Expire now rather than delete — keeps the record while pulling the
// banner immediately.
adminAnnouncementsRouter.post('/:id/expire', asyncHandler(async (req, res) => {
  const row = await prisma.announcement.findUnique({ where: { id: req.params.id } });
  if (!row) {
    res.status(404).json({ error: 'Announcement not found' });
    return;
  }
  await prisma.announcement.update({ where: { id: row.id }, data: { expiresAt: new Date() } });
  audit(req.user!.id, 'announcement_expire', 'announcement', row.id);
  res.json({ ok: true });
}));

adminAnnouncementsRouter.delete('/:id', asyncHandler(async (req, res) => {
  const row = await prisma.announcement.findUnique({ where: { id: req.params.id } });
  if (!row) {
    res.status(404).json({ error: 'Announcement not found' });
    return;
  }
  await prisma.announcement.delete({ where: { id: row.id } });
  audit(req.user!.id, 'announcement_delete', 'announcement', row.id, { message: row.message.slice(0, 80) });
  res.json({ ok: true });
}));
