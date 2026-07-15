import { Router } from 'express';
import { prisma } from '../db.js';

export const logsRouter = Router();

logsRouter.get('/:id', async (req, res) => {
  const log = await prisma.log.findUnique({
    where: { id: req.params.id },
    include: {
      players: { orderBy: { totalDps: 'desc' } },
      mechanicEvents: { orderBy: { timeMs: 'asc' } },
    },
  });

  if (!log) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }

  res.json({
    id: log.id,
    boss: log.fightName,
    wing: log.wing,
    isCm: log.isCm,
    success: log.success,
    durationMs: log.durationMs,
    squadDps: log.squadDps,
    date: log.encounterTime,
    players: log.players.map((p) => ({
      name: p.characterName,
      profession: p.profession,
      spec: p.spec,
      subgroup: p.subgroup,
      total: p.totalDps,
      power: p.powerDps,
      condi: p.condiDps,
      powerPct: p.totalDps ? Math.round((p.powerDps / p.totalDps) * 100) : 0,
      condiPct: p.totalDps ? Math.round((p.condiDps / p.totalDps) * 100) : 0,
      damageTaken: p.damageTaken,
      downs: p.downCount,
      deaths: p.deadCount,
      boons: p.boons,
      mechanics: p.mechanics,
    })),
    mechanicEvents: log.mechanicEvents.map((e) => ({
      timeMs: e.timeMs,
      name: e.name,
      actor: e.actor,
    })),
  });
});
