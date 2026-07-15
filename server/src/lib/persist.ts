import { prisma } from '../db.js';
import type { NormalizedLog } from './ingest.js';
import { BOSS_WING } from './bossMeta.js';

export async function persistLog(params: {
  permalink: string;
  dpsReportId: string;
  sourceFileName?: string;
  uploadedBy?: string;
  rawJson: unknown;
  normalized: NormalizedLog;
}) {
  const { permalink, dpsReportId, sourceFileName, uploadedBy, rawJson, normalized } = params;

  return prisma.$transaction(async (tx) => {
    const log = await tx.log.create({
      data: {
        permalink,
        dpsReportId,
        fightName: normalized.fightName,
        triggerId: normalized.triggerId,
        wing: BOSS_WING[normalized.fightName] ?? null,
        isCm: normalized.isCm,
        success: normalized.success,
        durationMs: normalized.durationMs,
        squadDps: normalized.squadDps,
        encounterTime: normalized.encounterTime,
        uploadedBy,
        sourceFileName,
        rawJson: rawJson as any,
      },
    });

    for (const p of normalized.players) {
      const player = await tx.player.upsert({
        where: { account: p.account },
        update: { displayName: p.characterName },
        create: { account: p.account, displayName: p.characterName },
      });

      await tx.logPlayer.create({
        data: {
          logId: log.id,
          playerId: player.id,
          characterName: p.characterName,
          profession: p.profession,
          spec: p.spec,
          subgroup: p.subgroup,
          totalDps: p.totalDps,
          powerDps: p.powerDps,
          condiDps: p.condiDps,
          damageTaken: p.damageTaken,
          downCount: p.downCount,
          deadCount: p.deadCount,
          boons: p.boons as any,
          mechanics: p.mechanics as any,
        },
      });
    }

    if (normalized.mechanicEvents.length) {
      await tx.mechanicEvent.createMany({
        data: normalized.mechanicEvents.map((e) => ({
          logId: log.id,
          timeMs: e.timeMs,
          name: e.name,
          actor: e.actor,
        })),
      });
    }

    return log;
  });
}
