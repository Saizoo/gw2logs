import { prisma } from '../db.js';
import type { NormalizedLog, NormalizedPlayer } from './ingest.js';
import { resolveWing } from './bossMeta.js';

export async function persistLog(params: {
  contentHash: string;
  sourceFileName?: string;
  permalink?: string;
  uploadedBy?: string;
  groupId?: string;
  private?: boolean;
  normalized: NormalizedLog;
}) {
  const { contentHash, sourceFileName, permalink, uploadedBy, groupId, normalized } = params;

  return prisma.$transaction(
    async (tx) => {
      const log = await tx.log.create({
        data: {
          contentHash,
          fightName: normalized.fightName,
          triggerId: normalized.triggerId,
          wing: resolveWing(normalized.fightName, normalized.players.length),
          isCm: normalized.isCm,
          success: normalized.success,
          durationMs: normalized.durationMs,
          squadDps: normalized.squadDps,
          encounterTime: normalized.encounterTime,
          uploadedBy,
          groupId,
          // Only ever private when a signed-in uploader asked for it — an
          // owner-less private log would be unmanageable.
          private: params.private ?? false,
          sourceFileName,
          permalink,
          mechanicsMeta: normalized.mechanicsMeta as any,
          phaseData: normalized.telemetry as any,
        },
      });

      // Player upserts stay per-row (need each id, and upsert-on-conflict
      // semantics), but LogPlayer inserts are batched into one query instead
      // of looping — with up to ~50 players in a raid/WvW log, N individual
      // round trips here was blowing past the interactive transaction
      // timeout on its own.
      const withIds: { playerId: string; p: NormalizedPlayer }[] = [];
      for (const p of normalized.players) {
        // displayName is a legacy column, not written to going forward — every
        // display surface in the app now reads the account name directly
        // (stable, unlike a character name that changes per fight). Set once
        // on creation so a fresh row is never blank; never touched again.
        const player = await tx.player.upsert({
          where: { account: p.account },
          update: {},
          create: { account: p.account, displayName: p.account },
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
            stats: p.stats as any,
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
            severity: e.severity,
          })),
        });
      }

      if (normalized.deathEvents.length) {
        await tx.deathEvent.createMany({
          data: normalized.deathEvents.map((e) => ({
            logId: log.id,
            timeMs: e.timeMs,
            actor: e.actor,
            killedBy: e.killedBy,
          })),
        });
      }

      return log;
    },
    { timeout: 30_000 },
  );
}
