import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { BOSS_WING, canonicalFightName } from '../lib/bossMeta.js';

export const playersRouter = Router();

// Raid wings always show in the coverage grid (an unkilled wing is
// meaningful "still to do" progress); strike/fractal maps only appear once
// the player has actually engaged them, so a pure raider isn't padded with
// a dozen permanently-empty strike rows. Mirrors the group clears board.
const isRaidWing = (wing: string) => wing.startsWith('Wing ') || wing === "Guardian's Glade";

playersRouter.get('/:account', asyncHandler(async (req, res) => {
  const { account } = req.params;
  const player = await prisma.player.findUnique({
    where: { account },
    select: {
      id: true,
      account: true,
      // Affiliations come from the linked user (if this player has claimed
      // their account). Displayed guild is one the user explicitly chose to
      // represent, and groups mirror what the public group pages already
      // show — nothing here is private that isn't already reachable.
      user: {
        select: {
          id: true,
          privateProfile: true,
          profileIcon: true,
          displayedGuild: { select: { id: true, name: true, tag: true } },
          groupMemberships: {
            select: {
              role: true,
              guildRank: true,
              group: { select: { id: true, name: true, guildId: true } },
            },
            orderBy: { joinedAt: 'asc' },
          },
        },
      },
    },
  });
  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }

  // Private profile: only the owner (and admins) see the full page; everyone
  // else gets a stub so the profile still resolves but exposes nothing.
  if (player.user?.privateProfile) {
    const isOwner = req.user?.id === player.user.id;
    if (!isOwner && !req.user?.isAdmin) {
      res.json({ account: player.account, private: true });
      return;
    }
  }

  // Characters the account owner synced from the GW2 API and chose to surface
  // (hidden=false). Public per the visibility rule — gear/build are already
  // resolved to name + icon at sync time.
  const characters = player.user
    ? await prisma.character.findMany({
        where: { userId: player.user.id, source: 'gw2', hidden: false },
        select: { id: true, name: true, profession: true, race: true, level: true, activeTab: true, equipmentTabs: true, buildTabs: true },
        orderBy: { name: 'asc' },
      })
    : [];

  const logPlayers = await prisma.logPlayer.findMany({
    where: { playerId: player.id },
    // Explicit select, not `include: { log: true }` — that used to also
    // pull in `rawJson` (the full Elite Insights dump, now removed as a
    // column entirely) for every row here, which is what made this
    // endpoint take 6+ seconds. Select only what's used.
    select: {
      id: true,
      logId: true,
      profession: true,
      spec: true,
      totalDps: true,
      powerDps: true,
      condiDps: true,
      squadRole: true,
      log: { select: { fightName: true, isCm: true, uploadedAt: true, success: true, private: true } },
    },
    orderBy: { log: { uploadedAt: 'desc' } },
  });

  const professionCounts = new Map<string, number>();
  for (const lp of logPlayers) {
    professionCounts.set(lp.profession, (professionCounts.get(lp.profession) ?? 0) + 1);
  }
  const total = logPlayers.length || 1;
  const professionBreakdown = [...professionCounts.entries()]
    .map(([profession, count]) => ({ profession, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  // Overall score: how this player's DPS ranks, on average, against every
  // other parse of the same boss+CM combination *in the same squad role*
  // (0-100). Ranking is role-segmented — a DPS parse is compared to other
  // DPS parses, a boon-DPS parse to other boon-DPS, a healer parse to other
  // healers — so a support build isn't penalised for the low damage its role
  // is supposed to trade away; it's measured against peers doing the same job.
  // Consistency score: how tightly clustered those percentiles are — always
  // near the same percentile scores higher than swinging between top and
  // bottom. Both `mine` (this player's own logs) and the reference population
  // are restricted to kills — a wipe's "final" DPS reflects when the fight got
  // cut off, not performance, and would otherwise drag both scores around for
  // reasons unrelated to how anyone played. Per-row `id` is carried through so
  // the same percentiles can pick each fight's best *parse* (highest
  // percentile) below, rather than just its highest raw DPS number — DPS alone
  // isn't comparable across specs/builds/roles, which is exactly what the
  // role-scoped percentile normalizes for.
  const percentiles = logPlayers.length
    ? await prisma.$queryRaw<{ id: string; pct: number }[]>`
        WITH mine AS (
          SELECT lp.id, lp."totalDps", lp."squadRole", l."fightName", l."isCm"
          FROM "LogPlayer" lp
          JOIN "Log" l ON lp."logId" = l.id
          WHERE lp."playerId" = ${player.id} AND l.success = true
        )
        SELECT
          id,
          CASE WHEN total <= 1 THEN 100.0
               ELSE ((rank_from_bottom - 1)::float8 / (total - 1)) * 100
          END AS pct
        FROM (
          SELECT
            mine.id,
            (SELECT COUNT(*) FROM "LogPlayer" lp2 JOIN "Log" l2 ON lp2."logId" = l2.id
               WHERE l2."fightName" = mine."fightName" AND l2."isCm" = mine."isCm" AND l2.success = true
                 AND lp2."squadRole" = mine."squadRole") AS total,
            (SELECT COUNT(*) FROM "LogPlayer" lp2 JOIN "Log" l2 ON lp2."logId" = l2.id
               WHERE l2."fightName" = mine."fightName" AND l2."isCm" = mine."isCm" AND l2.success = true
                 AND lp2."squadRole" = mine."squadRole"
                 AND lp2."totalDps" <= mine."totalDps") AS rank_from_bottom
          FROM mine
        ) sub
      `
    : [];
  const pctByLogPlayerId = new Map(percentiles.map((r) => [r.id, Number(r.pct)]));

  let overallScore: number | null = null;
  let consistencyScore: number | null = null;
  if (percentiles.length > 0) {
    const values = percentiles.map((r) => Number(r.pct));
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    overallScore = Math.round(mean);
    consistencyScore = Math.round(Math.max(0, 100 - Math.sqrt(variance)));
  }

  // Best parse per fight: the kill with the highest percentile rank against
  // everyone else's parses of that same boss+CM, not just the kill with the
  // biggest raw DPS number — a condi build's ceiling and a power build's
  // ceiling aren't the same number, so "highest DPS" quietly favored
  // whichever spec has the higher raw scale. Restricted to actual kills
  // (wipes aren't parses), matching the leaderboard's own success filter.
  // Aggregates below (scores, breakdowns, coverage, record) count every parse
  // including private ones — privating a log doesn't drop it from the stats.
  // The browsable lists that link to a specific log (bestParses, recent, and
  // each spec's best) show public logs only, so a record link never 404s.
  const bestByBoss = new Map<string, { lp: (typeof logPlayers)[number]; pct: number }>();
  for (const lp of logPlayers) {
    if (!lp.log.success || lp.log.private) continue;
    const pct = pctByLogPlayerId.get(lp.id) ?? 0;
    const key = `${lp.log.fightName}::${lp.log.isCm}`;
    const current = bestByBoss.get(key);
    if (!current || pct > current.pct) bestByBoss.set(key, { lp, pct });
  }

  // Kill/wipe record. Every LogPlayer row is one appearance in a log, so
  // counting success here counts this player's own kills and wipes.
  const kills = logPlayers.filter((lp) => lp.log.success).length;
  const wipes = logPlayers.length - kills;
  const record = {
    kills,
    wipes,
    total: logPlayers.length,
    successRate: logPlayers.length ? Math.round((kills / logPlayers.length) * 100) : 0,
  };

  // Role split across the 3-role classification (plain DPS / boon DPS /
  // healer) — what this player actually does in a squad.
  const roleCounts = new Map<string, number>();
  for (const lp of logPlayers) roleCounts.set(lp.squadRole, (roleCounts.get(lp.squadRole) ?? 0) + 1);
  const roleBreakdown = [...roleCounts.entries()]
    .map(([role, count]) => ({ role, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);

  // Elite-spec distribution (finer than the profession breakdown) — the
  // classes this player actually brings, with the profession carried for
  // colouring/icons.
  const specCounts = new Map<string, { profession: string; count: number }>();
  for (const lp of logPlayers) {
    const entry = specCounts.get(lp.spec) ?? { profession: lp.profession, count: 0 };
    entry.count += 1;
    specCounts.set(lp.spec, entry);
  }
  const specBreakdown = [...specCounts.entries()]
    .map(([spec, { profession, count }]) => ({ spec, profession, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);

  // Per-spec performance table: for every spec the player has a KILL on,
  // how many parses, their average and best percentile, and the log behind
  // the best one. Wipes are excluded (no parse), matching the score/best
  // logic above.
  const specPerfAgg = new Map<
    string,
    { profession: string; plays: number; pctSum: number; bestPct: number; bestLogId: string; bestDps: number; powerSum: number; condiSum: number; roleCounts: Map<string, number> }
  >();
  for (const lp of logPlayers) {
    if (!lp.log.success) continue;
    const pct = pctByLogPlayerId.get(lp.id) ?? 0;
    const entry =
      specPerfAgg.get(lp.spec) ??
      { profession: lp.profession, plays: 0, pctSum: 0, bestPct: -1, bestLogId: lp.logId, bestDps: 0, powerSum: 0, condiSum: 0, roleCounts: new Map<string, number>() };
    entry.plays += 1;
    entry.pctSum += pct;
    entry.bestDps = Math.max(entry.bestDps, lp.totalDps);
    entry.powerSum += lp.powerDps;
    entry.condiSum += lp.condiDps;
    entry.roleCounts.set(lp.squadRole, (entry.roleCounts.get(lp.squadRole) ?? 0) + 1);
    // Count private parses toward plays/avg, but only link to a public log.
    if (!lp.log.private && pct > entry.bestPct) {
      entry.bestPct = pct;
      entry.bestLogId = lp.logId;
    }
    specPerfAgg.set(lp.spec, entry);
  }
  const specPerformance = [...specPerfAgg.entries()]
    .map(([spec, e]) => {
      // The spec's characteristic role: its most-frequent squad role, split
      // into Power/Condi for plain DPS by whichever damage type dominated.
      const topRole = [...e.roleCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'dps';
      const role = topRole === 'boon_heal' ? 'Heal' : topRole === 'boon_dps' ? 'Boon' : e.powerSum >= e.condiSum ? 'Power' : 'Condi';
      return {
        spec,
        profession: e.profession,
        plays: e.plays,
        avgPct: Math.round(e.pctSum / e.plays),
        bestPct: Math.round(Math.max(0, e.bestPct)),
        bestLogId: e.bestLogId,
        bestDps: e.bestDps,
        role,
      };
    })
    .sort((a, b) => b.avgPct - a.avgPct || b.plays - a.plays);

  // Encounter coverage ("collection"): every canonical boss grouped by its
  // wing/map, flagged killed / attempted (logged but never killed) / not
  // touched, with the player's best parse percentile on the ones they've
  // killed. Boss ordering within a wing follows BOSS_WING declaration order.
  const killedBoss = new Set<string>();
  const attemptedBoss = new Set<string>();
  const bestPctByBoss = new Map<string, number>();
  for (const lp of logPlayers) {
    const boss = canonicalFightName(lp.log.fightName);
    attemptedBoss.add(boss);
    if (lp.log.success) {
      killedBoss.add(boss);
      const pct = pctByLogPlayerId.get(lp.id) ?? 0;
      if (pct > (bestPctByBoss.get(boss) ?? -1)) bestPctByBoss.set(boss, pct);
    }
  }
  const coverageWings = new Map<string, { boss: string; killed: boolean; attempted: boolean; bestPct: number | null }[]>();
  for (const [boss, wing] of Object.entries(BOSS_WING)) {
    // Strike/fractal maps only appear once engaged; raid wings always show.
    if (!isRaidWing(wing) && !attemptedBoss.has(boss)) continue;
    const list = coverageWings.get(wing) ?? [];
    list.push({
      boss,
      killed: killedBoss.has(boss),
      attempted: attemptedBoss.has(boss),
      bestPct: killedBoss.has(boss) ? Math.round(bestPctByBoss.get(boss) ?? 0) : null,
    });
    coverageWings.set(wing, list);
  }
  const coverage = [...coverageWings.entries()].map(([wing, encounters]) => ({
    wing,
    killed: encounters.filter((e) => e.killed).length,
    total: encounters.length,
    encounters,
  }));

  // Guild + group affiliations from the linked user. Null for an unclaimed
  // player (no user linked yet); guild-marker groups (auto-created from an
  // in-game guild) are flagged so the UI can badge them differently.
  const affiliations = player.user
    ? {
        guild: player.user.displayedGuild
          ? { id: player.user.displayedGuild.id, name: player.user.displayedGuild.name, tag: player.user.displayedGuild.tag }
          : null,
        groups: player.user.groupMemberships.map((m) => ({
          id: m.group.id,
          name: m.group.name,
          role: m.role,
          isGuildGroup: m.group.guildId != null,
          guildRank: m.guildRank,
        })),
      }
    : null;

  res.json({
    account: player.account,
    totalLogs: logPlayers.length,
    overallScore,
    consistencyScore,
    profileIcon: player.user?.profileIcon ?? null,
    affiliations,
    record,
    roleBreakdown,
    specBreakdown,
    specPerformance,
    coverage,
    professionBreakdown,
    bestParses: [...bestByBoss.values()]
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 6)
      .map(({ lp, pct }) => ({
        boss: lp.log.fightName,
        isCm: lp.log.isCm,
        spec: lp.spec,
        dps: lp.totalDps,
        pct: Math.round(pct),
        logId: lp.logId,
      })),
    recent: logPlayers
      .filter((lp) => !lp.log.private)
      .slice(0, 10)
      .map((lp) => ({
        boss: lp.log.fightName,
        isCm: lp.log.isCm,
        spec: lp.spec,
        dps: lp.totalDps,
        success: lp.log.success,
        // Per-kill parse percentile (kills only; wipes have no meaningful parse).
        parsePct: lp.log.success ? Math.round(pctByLogPlayerId.get(lp.id) ?? 0) : null,
        logId: lp.logId,
        uploadedAt: lp.log.uploadedAt,
      })),
    characters,
  });
}));
