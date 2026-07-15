import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';

export const compareRouter = Router();

async function loadPlayerRow(logId: string, account: string) {
  return prisma.logPlayer.findFirst({
    where: { logId, player: { account } },
    include: { log: true },
  });
}

compareRouter.get('/', asyncHandler(async (req, res) => {
  const logIdA = String(req.query.logIdA ?? '');
  const accountA = String(req.query.accountA ?? '');
  const logIdB = String(req.query.logIdB ?? '');
  const accountB = String(req.query.accountB ?? '');

  if (!logIdA || !accountA || !logIdB || !accountB) {
    res.status(400).json({ error: 'logIdA, accountA, logIdB, accountB are all required' });
    return;
  }

  const [a, b] = await Promise.all([
    loadPlayerRow(logIdA, accountA),
    loadPlayerRow(logIdB, accountB),
  ]);

  if (!a || !b) {
    res.status(404).json({ error: 'One or both players/logs not found' });
    return;
  }

  const rows = [
    { label: 'DPS', a: a.totalDps, b: b.totalDps },
    { label: 'Duration', a: a.log.durationMs, b: b.log.durationMs, lowerIsBetter: true },
    { label: 'Downstates', a: a.downCount, b: b.downCount, lowerIsBetter: true },
    { label: 'Damage taken', a: a.damageTaken, b: b.damageTaken, lowerIsBetter: true },
  ].map((row) => {
    const max = Math.max(row.a, row.b) || 1;
    const better = row.lowerIsBetter ? Math.min(row.a, row.b) : Math.max(row.a, row.b);
    const aPct = row.lowerIsBetter ? Math.round((better / (row.a || 1)) * 100) : Math.round((row.a / max) * 100);
    const bPct = row.lowerIsBetter ? Math.round((better / (row.b || 1)) * 100) : Math.round((row.b / max) * 100);
    return { label: row.label, a: row.a, b: row.b, aPct, bPct };
  });

  res.json({
    playerA: { name: a.characterName, spec: a.spec, boss: a.log.fightName },
    playerB: { name: b.characterName, spec: b.spec, boss: b.log.fightName },
    rows,
  });
}));
