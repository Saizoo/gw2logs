import { prisma } from '../db.js';
import type { NormalizedLog, NormalizedPlayer } from './ingest.js';
import { BOSS_WING } from './bossMeta.js';

export async function persistLog(params: {
  contentHash: string;
  sourceFileName?: string;
  uploadedBy?: string;
  rawJson: unknown;
  normalized: NormalizedLog;
}) {
  const { contentHash, sourceFileName, uploadedBy, rawJson, normalized } = params;

  return prisma.$transaction(
    async (tx) => {
      const log = await tx.log.create({
        data: {
          contentHash,
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

      // Player upserts stay per-row (need each id, and upsert-on-conflict
      // semantics), but LogPlayer inserts are batched into one query instead
      // of looping — with up to ~50 players in a raid/WvW log, N individual
      // round trips here was blowing past the interactive transaction
      // timeout on its own.
      const withIds: { playerId: string; p: NormalizedPlayer }[] = [];
      for (const p of normalized.players) {
        const player = await tx.player.upsert({
          where: { account: p.account },
          update: { displayName: p.characterName },
          create: { account: p.account, displayName: p.characterName },
        });
        withIds.push({ playerId: player.id, p });
      }

      if (withIds.length) {
        await tx.logPlayer.createMany({
          data: withIds.map(({ playerId, p }) => ({
            logId: log.id,
            playerId,
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
            squadRole: p.squadRole,
            groupBoons: p.groupBoons as any,
            healingOutput: p.healingOutput,
          })),
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
    },
    { timeout: 30_000 },
  );
}
