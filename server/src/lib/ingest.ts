// Field names verified against Elite Insights source (GW2EIJSON project,
// baaron4/GW2-Elite-Insights-Parser@master): JsonLog, JsonActor, JsonPlayer,
// JsonStatistics (JsonDPS/JsonDefensesAll), JsonBuffsUptime, JsonMechanics,
// JsonDeathRecap. EI 3.25 (built from source and run against a real upload
// to check this) actually DOES serialize with .NET's built-in camelCase
// naming policy, contrary to what an earlier version of this comment
// claimed — "EXTHealingStats" comes out as "extHealingStats", not
// "eXTHealingStats". Unlike earlier in this file's history, the raw JSON is
// no longer persisted after parsing (see persist.ts) — a wrong guess here
// means re-uploading the source log, not just re-running extraction against
// a stored copy.

import { canonicalFightName } from './bossMeta.js';

export type RawEiJson = Record<string, any>;

// Mirrors .NET's JsonNamingPolicy.CamelCase exactly, not just "lowercase the
// first letter" — that naive version breaks on any acronym-prefixed name
// with 2+ leading capitals: it lowercases the whole leading run except the
// last capital (treated as the start of the next word), e.g.
// "EXTHealingStats" -> "extHealingStats", "TriggerID" -> "triggerID".
function toCamelCase(pascalKey: string): string {
  let i = 0;
  while (i < pascalKey.length && pascalKey[i] !== pascalKey[i].toLowerCase()) i++;
  if (i === 0) return pascalKey;
  if (i === 1 || i === pascalKey.length) return pascalKey.slice(0, i).toLowerCase() + pascalKey.slice(i);
  return pascalKey.slice(0, i - 1).toLowerCase() + pascalKey.slice(i - 1);
}

function field(obj: any, pascalKey: string): any {
  if (obj == null) return undefined;
  if (pascalKey in obj) return obj[pascalKey];
  return obj[toCamelCase(pascalKey)];
}

const BOON_IDS: Record<string, number> = {
  quickness: 1187,
  alacrity: 30328,
  might: 740,
  fury: 725,
  protection: 717,
  aegis: 743,
  stability: 1122,
};

// Every profession's 4th elite specialization (Luminary, Conduit, Paragon,
// Amalgam, Galeshot, Antiquary, Evoker, Troubadour, Ritualist) was missing
// here entirely, so normalizeEiJson's `SPEC_TO_PROFESSION[specName] ??
// specName` fallback bucketed every one of those characters under their
// spec name as if it were its own profession.
export const SPEC_TO_PROFESSION: Record<string, string> = {
  Guardian: 'Guardian', Dragonhunter: 'Guardian', Firebrand: 'Guardian', Willbender: 'Guardian', Luminary: 'Guardian',
  Warrior: 'Warrior', Berserker: 'Warrior', Spellbreaker: 'Warrior', Bladesworn: 'Warrior', Paragon: 'Warrior',
  Revenant: 'Revenant', Herald: 'Revenant', Renegade: 'Revenant', Vindicator: 'Revenant', Conduit: 'Revenant',
  Engineer: 'Engineer', Scrapper: 'Engineer', Holosmith: 'Engineer', Mechanist: 'Engineer', Amalgam: 'Engineer',
  Ranger: 'Ranger', Druid: 'Ranger', Soulbeast: 'Ranger', Untamed: 'Ranger', Galeshot: 'Ranger',
  Thief: 'Thief', Daredevil: 'Thief', Deadeye: 'Thief', Specter: 'Thief', Antiquary: 'Thief',
  Elementalist: 'Elementalist', Tempest: 'Elementalist', Weaver: 'Elementalist', Catalyst: 'Elementalist', Evoker: 'Elementalist',
  Mesmer: 'Mesmer', Chronomancer: 'Mesmer', Mirage: 'Mesmer', Virtuoso: 'Mesmer', Troubadour: 'Mesmer',
  Necromancer: 'Necromancer', Reaper: 'Necromancer', Scourge: 'Necromancer', Harbinger: 'Necromancer', Ritualist: 'Necromancer',
};

// Extended per-player combat stats pulled from the Elite Insights JSON —
// everything dps.report surfaces on its Offensive / Defensive / Support tabs
// but we weren't keeping. All best-effort and null-tolerant: a log missing a
// section just yields zeros for it. Times are in seconds (as EI serializes
// them); counts are whole numbers.
export interface PlayerCombatStats {
  // Offensive
  bossDps: number; // DPS to the boss target only (cleave onto adds stripped out)
  critPct: number; // share of critable hits that critted, 0-100
  // Defensive (mitigation actions)
  barrier: number; // damage absorbed by barrier
  blocked: number;
  evaded: number;
  dodges: number;
  invulned: number;
  // Support (given to allies / taken from enemies)
  resurrects: number;
  resurrectTime: number; // seconds spent reviving
  condiCleanse: number; // conditions cleansed off allies
  boonStrips: number; // boons ripped off enemies
}

export interface NormalizedPlayer {
  characterName: string;
  account: string;
  profession: string;
  spec: string;
  subgroup: number;
  totalDps: number;
  powerDps: number;
  condiDps: number;
  damageTaken: number;
  downCount: number;
  deadCount: number;
  boons: Record<string, number>;
  mechanics: Record<string, number>;
  squadRole: SquadRole;
  groupBoons: Record<string, number>;
  healingOutput: number | null;
  stats: PlayerCombatStats;
  // Raw EI weapon-type list (JsonPlayer.weapons) — see extractWeapons.
  weapons: string[];
}

export interface NormalizedMechanicEvent {
  timeMs: number;
  name: string;
  actor: string | null;
  // "Sev0".."Sev4", straight from Elite Insights' Mechanics[].Severity —
  // null when EI doesn't set it (older EI versions, or a mechanic that
  // predates the field), not a guessed default.
  severity: string | null;
}

export interface NormalizedDeathEvent {
  timeMs: number;
  actor: string;
  killedBy: string | null;
}

// One phase of the fight (EI's Phases[], minus the index-0 "Full Fight"
// wrapper). squadDps is the squad's summed DPS *during that phase* — from each
// player's phase-indexed DpsAll entry, not a whole-fight average.
export interface NormalizedPhase {
  name: string;
  startMs: number;
  endMs: number;
  breakbar: boolean;
  squadDps: number;
}

// Boss health-over-time + phase breakdown for the encounter, small enough to
// store inline. `health` is a downsampled [timeMs, percent] series for the
// main boss target; null when EI emitted no target health graph.
export interface EncounterTelemetry {
  bossName: string | null;
  totalHealth: number | null;
  health: [number, number][] | null;
  phases: NormalizedPhase[];
}

export interface NormalizedLog {
  fightName: string;
  triggerId: number | null;
  isCm: boolean;
  success: boolean;
  durationMs: number;
  squadDps: number;
  encounterTime: Date;
  players: NormalizedPlayer[];
  mechanicEvents: NormalizedMechanicEvent[];
  deathEvents: NormalizedDeathEvent[];
  // Display metadata per mechanic short name, straight from Elite Insights:
  // FullName (readable label) + Description (the hover explainer). Lets the
  // Mechanics tab show what a mechanic actually is instead of EI's terse code.
  mechanicsMeta: Record<string, { fullName: string | null; description: string | null }>;
  // Boss health-over-time + phase breakdown — see EncounterTelemetry.
  telemetry: EncounterTelemetry;
}

function extractPlayerDps(player: any) {
  const dpsAll = field(player, 'DpsAll') ?? [];
  const fullFight = dpsAll[0] ?? {};
  return {
    total: Math.round(field(fullFight, 'Dps') ?? 0),
    power: Math.round(field(fullFight, 'PowerDps') ?? 0),
    condi: Math.round(field(fullFight, 'CondiDps') ?? 0),
  };
}

function extractPlayerDefenses(player: any) {
  const defenses = field(player, 'Defenses') ?? [];
  const fullFight = defenses[0] ?? {};
  return {
    damageTaken: Math.round(field(fullFight, 'DamageTaken') ?? 0),
    downCount: Math.round(field(fullFight, 'DownCount') ?? 0),
    deadCount: Math.round(field(fullFight, 'DeadCount') ?? 0),
  };
}

function extractPlayerBoons(player: any): Record<string, number> {
  const buffUptimes: any[] = field(player, 'BuffUptimes') ?? [];
  const boons: Record<string, number> = {};
  for (const [key, id] of Object.entries(BOON_IDS)) {
    const buff = buffUptimes.find((b) => field(b, 'Id') === id);
    const buffData = field(buff, 'BuffData') ?? [];
    const uptime = field(buffData[0], 'Uptime') ?? 0;
    boons[key] = Math.round(uptime);
  }
  return boons;
}

// GroupBuffs entries are NOT the same shape as BuffUptimes despite both
// being buff-by-id lists — verified against a real EI 3.25 JSON export:
// BuffUptimes[i].BuffData[0] carries `Uptime` (personal uptime), but
// GroupBuffs[i].BuffData[0] has no `Uptime` field at all — it carries
// `Generation` (0-100, this player's share of their 5-person subgroup's
// total uptime of that boon). Reading `Uptime` here silently returned
// undefined -> 0 for every player on every log, which meant
// GROUP_BOON_SUPPORT_THRESHOLD was never met and computeSquadRoles below
// could never classify anyone as boon_dps/boon_heal — every player always
// fell back to plain 'dps' regardless of role.
function extractGroupBoons(player: any): Record<string, number> {
  const groupBuffs: any[] = field(player, 'GroupBuffs') ?? [];
  const boons: Record<string, number> = {};
  for (const key of ['quickness', 'alacrity'] as const) {
    const id = BOON_IDS[key];
    const buff = groupBuffs.find((b) => field(b, 'Id') === id);
    const buffData = field(buff, 'BuffData') ?? [];
    const generation = field(buffData[0], 'Generation') ?? 0;
    boons[key] = Math.round(generation);
  }
  return boons;
}

// Only present when the log was captured with arcdps' healing addon
// enabled — most WvW/roaming logs and any raid group not running it won't
// have this. Null (not 0) signals "unknown", since 0 would misread as
// "provided no healing" for a player we simply have no data on.
function extractHealingOutput(player: any): number | null {
  const healingStats = field(player, 'EXTHealingStats');
  if (!healingStats) return null;
  const outgoing = field(healingStats, 'OutgoingHealing') ?? [];
  const fullFight = outgoing[0];
  if (!fullFight) return null;
  const hps = field(fullFight, 'Hps');
  return typeof hps === 'number' ? Math.round(hps) : null;
}

// JsonActor.Healing — a build/gear-derived "Healing Power score" (verified:
// two confirmed healers in a real log both read 10 here against 0 for every
// other player, including the log's other boon supports). This is distinct
// from EXTHealingStats' measured HPS above, and catches what measured
// output alone misses: an easy/clean kill where a real healer-built support
// simply wasn't needed to heal much, so their actual output that fight
// rounds down near zero despite the build being a dedicated healer.
function extractHealingPowerScore(player: any): number {
  const score = field(player, 'Healing');
  return typeof score === 'number' ? score : 0;
}

// Extended offensive/defensive/support stats — see PlayerCombatStats. Read
// from EI's phase-0 (full-fight) entries: StatsAll[0] (offensive), Defenses[0]
// (mitigation), Support[0] (revives/cleanses/strips), plus DpsTargets for the
// boss-only DPS. Every field defaults to 0 so a log missing a section still
// normalizes cleanly.
function extractPlayerStats(player: any, bossTargetIndex: number): PlayerCombatStats {
  const statsAll = (field(player, 'StatsAll') ?? [])[0] ?? {};
  const defenses = (field(player, 'Defenses') ?? [])[0] ?? {};
  const support = (field(player, 'Support') ?? [])[0] ?? {};

  // Boss-only DPS: DpsTargets is [targetIndex][phaseIndex]; take the boss
  // target's full-fight (phase 0) entry. Falls back to 0 when the log has no
  // resolved boss target or no per-target DPS (some non-boss logs).
  const dpsTargets = field(player, 'DpsTargets') ?? [];
  const bossDps = bossTargetIndex >= 0
    ? Math.round(field((dpsTargets[bossTargetIndex] ?? [])[0], 'Dps') ?? 0)
    : 0;

  // Crit rate: crits over hits that could crit. EI gives raw counts, not a
  // percentage — divide here, guarding a zero denominator.
  const crits = Number(field(statsAll, 'CriticalRate') ?? 0);
  const critable = Number(field(statsAll, 'CritableDirectDamageCount') ?? 0);
  const critPct = critable > 0 ? Math.round((crits / critable) * 100) : 0;

  const num = (obj: any, key: string) => Math.round(Number(field(obj, key) ?? 0));

  return {
    bossDps,
    critPct,
    barrier: num(defenses, 'DamageBarrier'),
    blocked: num(defenses, 'BlockedCount'),
    evaded: num(defenses, 'EvadedCount'),
    dodges: num(defenses, 'DodgeCount'),
    invulned: num(defenses, 'InvulnedCount'),
    resurrects: num(support, 'Resurrects'),
    resurrectTime: Math.round(Number(field(support, 'ResurrectTime') ?? 0)),
    condiCleanse: num(support, 'CondiCleanse'),
    boonStrips: num(support, 'BoonStrips'),
  };
}

// Equipped weapon types, straight from EI's JsonPlayer.weapons. EI serializes
// this as a flat string array — for land combat, [set1 main, set1 off, set2
// main, set2 off] — with "2Hand" filling the off slot of a two-handed weapon
// and "Unknown" for a slot the player never used. Stored verbatim (only
// dropping non-string junk); the detail page does the set grouping/filtering
// so that interpretation can change without re-importing.
function extractWeapons(player: any): string[] {
  const w = field(player, 'Weapons');
  if (!Array.isArray(w)) return [];
  return w.filter((x): x is string => typeof x === 'string');
}

// A player generating a meaningful share of their subgroup's alacrity or
// quickness uptime is that subgroup's boon support for that boon. Noise
// floor of 15% filters out incidental generation (e.g. a trait proc) from
// players who aren't actually running a support build.
const GROUP_BOON_SUPPORT_THRESHOLD = 15;

// Dedicated healer builds sustain outgoing healing far above what any
// DPS/support hybrid puts out incidentally (self-heals, on-heal traits).
// This floor only ever applies to players already flagged as boon support
// by real generation data above — it's used to split that group into
// "boon support DPS" vs "boon support healer", never to invent a healer
// label from damage numbers.
const HEALER_HPS_THRESHOLD = 1500;

export type SquadRole = 'dps' | 'boon_dps' | 'boon_heal';

function computeSquadRoles(
  players: {
    characterName: string;
    subgroup: number;
    groupBoons: Record<string, number>;
    healingOutput: number | null;
    healingPowerScore: number;
  }[],
): Map<string, SquadRole> {
  const roles = new Map<string, SquadRole>();
  const subgroups = new Set(players.map((p) => p.subgroup));

  for (const sg of subgroups) {
    const inGroup = players.filter((p) => p.subgroup === sg);

    const supportCharacters = new Set<string>();
    for (const boonKey of ['quickness', 'alacrity'] as const) {
      let best: (typeof inGroup)[number] | null = null;
      for (const p of inGroup) {
        if (p.groupBoons[boonKey] >= GROUP_BOON_SUPPORT_THRESHOLD && (!best || p.groupBoons[boonKey] > best.groupBoons[boonKey])) {
          best = p;
        }
      }
      if (best) supportCharacters.add(best.characterName);
    }

    for (const p of inGroup) {
      if (!supportCharacters.has(p.characterName)) {
        roles.set(p.characterName, 'dps');
      } else if ((p.healingOutput != null && p.healingOutput >= HEALER_HPS_THRESHOLD) || p.healingPowerScore > 0) {
        roles.set(p.characterName, 'boon_heal');
      } else {
        roles.set(p.characterName, 'boon_dps');
      }
    }
  }

  return roles;
}

function extractMechanics(raw: RawEiJson): {
  perPlayerCounts: Map<string, Record<string, number>>;
  events: NormalizedMechanicEvent[];
  meta: Record<string, { fullName: string | null; description: string | null }>;
} {
  const perPlayerCounts = new Map<string, Record<string, number>>();
  const events: NormalizedMechanicEvent[] = [];
  const meta: Record<string, { fullName: string | null; description: string | null }> = {};
  const mechanics: any[] = field(raw, 'Mechanics') ?? [];

  for (const mech of mechanics) {
    // EI's JsonMechanics: Name = ShortName (terse), FullName = readable label,
    // Description = the human-readable explanation. Key everything by the short
    // name (matches the per-player counts and events), and stash the readable
    // pair in `meta` for display. (JsonMechanics has no Severity field — an
    // earlier version of this parser read one that EI never emits.)
    const name: string = field(mech, 'Name') ?? field(mech, 'FullName') ?? 'Mechanic';
    const fullName: string | null = field(mech, 'FullName') ?? null;
    const description: string | null = field(mech, 'Description') ?? null;
    const severity: string | null = field(mech, 'Severity') ?? null;
    if (!(name in meta)) meta[name] = { fullName, description };
    const instances: any[] = field(mech, 'MechanicsData') ?? [];
    for (const inst of instances) {
      const actor: string | null = field(inst, 'Actor') ?? null;
      events.push({ timeMs: Math.round(field(inst, 'Time') ?? 0), name, actor, severity });
      if (actor) {
        const counts = perPlayerCounts.get(actor) ?? {};
        counts[name] = (counts[name] ?? 0) + 1;
        perPlayerCounts.set(actor, counts);
      }
    }
  }

  return { perPlayerCounts, events, meta };
}

// JsonPlayer.DeathRecap — one entry per actual death (downs that were
// rallied aren't covered, EI doesn't recap those). `killedBy` reads the
// last entry of ToKill (the killing hit) — EI already resolves that to a
// display name (attacker or skill source), no separate id lookup needed.
function extractDeaths(raw: RawEiJson): NormalizedDeathEvent[] {
  const players: any[] = field(raw, 'Players') ?? [];
  const deaths: NormalizedDeathEvent[] = [];

  for (const p of players) {
    const name: string = field(p, 'Name') ?? 'Unknown';
    const recaps: any[] = field(p, 'DeathRecap') ?? [];
    for (const recap of recaps) {
      const toKill: any[] = field(recap, 'ToKill') ?? [];
      const killingBlow = toKill[toKill.length - 1];
      deaths.push({
        timeMs: Math.round(field(recap, 'DeathTime') ?? 0),
        actor: name,
        killedBy: field(killingBlow, 'Src') ?? null,
      });
    }
  }

  return deaths;
}

// Keep the stored health graph small: EI can emit a point per second (600+ on
// a long fight), but a smooth-enough curve for a detail chart needs far fewer.
const MAX_HEALTH_POINTS = 180;

// Pull boss health-over-time + the phase breakdown out of the raw EI JSON.
// Everything here is best-effort and null-tolerant: a log where EI emitted no
// target graph or no phases still normalizes fine (the detail page falls back
// to "coming soon"). Health percents come from EI as [timeMs, percent] pairs
// on JsonActor.HealthPercents; phases from JsonLog.Phases (index 0 is the
// synthetic "Full Fight" wrapper, dropped here); per-phase squad DPS is summed
// from each player's phase-indexed DpsAll entry.
// The main boss target's index into Targets: among the targets the full-fight
// phase marks as active (Phases[0].Targets is a list of indices into Targets),
// the one with the most health. Falls back to the highest-health target
// overall, then the first — covers logs with an odd or missing phase-0 target
// list. Shared by telemetry (health curve) and per-player boss-only DPS so
// both point at the same target. -1 when there are no targets at all.
function findBossTargetIndex(raw: RawEiJson): number {
  const rawPhases: any[] = field(raw, 'Phases') ?? [];
  const targets: any[] = field(raw, 'Targets') ?? [];
  const fullFight = rawPhases[0];
  const activeIdx: number[] = (field(fullFight, 'Targets') ?? []).filter((i: any) => typeof i === 'number');
  const candidateIdx = activeIdx.length ? activeIdx : targets.map((_, i) => i);
  let bossIdx = -1;
  let bestHealth = -1;
  for (const i of candidateIdx) {
    const th = Number(field(targets[i], 'TotalHealth') ?? 0);
    if (th > bestHealth) {
      bestHealth = th;
      bossIdx = i;
    }
  }
  return bossIdx;
}

function extractEncounterTelemetry(raw: RawEiJson, players: any[], bossIdx: number): EncounterTelemetry {
  const rawPhases: any[] = field(raw, 'Phases') ?? [];
  const targets: any[] = field(raw, 'Targets') ?? [];
  const boss = bossIdx >= 0 ? targets[bossIdx] : undefined;

  let health: [number, number][] | null = null;
  const rawHealth: any[] = field(boss, 'HealthPercents') ?? [];
  if (rawHealth.length) {
    const stride = Math.max(1, Math.ceil(rawHealth.length / MAX_HEALTH_POINTS));
    const points: [number, number][] = [];
    for (let i = 0; i < rawHealth.length; i += stride) {
      const p = rawHealth[i];
      // EI serializes each point as a two-element array [timeMs, percent].
      const t = Array.isArray(p) ? Number(p[0]) : Number(field(p, 'Time'));
      const pct = Array.isArray(p) ? Number(p[1]) : Number(field(p, 'Percent'));
      if (Number.isFinite(t) && Number.isFinite(pct)) points.push([Math.round(t), Math.round(pct * 100) / 100]);
    }
    // Always keep the final point so the curve ends at the true last-known
    // health even when the stride skips over it.
    const lastRaw = rawHealth[rawHealth.length - 1];
    const lt = Array.isArray(lastRaw) ? Number(lastRaw[0]) : Number(field(lastRaw, 'Time'));
    if (points.length && Number.isFinite(lt) && points[points.length - 1][0] !== Math.round(lt)) {
      const lp = Array.isArray(lastRaw) ? Number(lastRaw[1]) : Number(field(lastRaw, 'Percent'));
      if (Number.isFinite(lp)) points.push([Math.round(lt), Math.round(lp * 100) / 100]);
    }
    if (points.length) health = points;
  }

  // Squad DPS per phase = sum over players of DpsAll[phaseIndex].Dps. DpsAll is
  // phase-indexed identically to Phases, so index i lines up for both.
  const phaseSquadDps = (phaseIndex: number): number => {
    let sum = 0;
    for (const p of players) {
      const dpsAll = field(p, 'DpsAll') ?? [];
      sum += Math.round(field(dpsAll[phaseIndex], 'Dps') ?? 0);
    }
    return sum;
  };

  const phases: NormalizedPhase[] = [];
  // Drop index 0 (the synthetic full-fight phase) — the rest are the real
  // sub-phases shown on the breakdown.
  for (let i = 1; i < rawPhases.length; i++) {
    const ph = rawPhases[i];
    const startMs = Math.round(field(ph, 'Start') ?? 0);
    const endMs = Math.round(field(ph, 'End') ?? 0);
    if (endMs <= startMs) continue;
    phases.push({
      name: field(ph, 'Name') ?? `Phase ${i}`,
      startMs,
      endMs,
      breakbar: Boolean(field(ph, 'BreakbarPhase') ?? false),
      squadDps: phaseSquadDps(i),
    });
  }

  return {
    bossName: field(boss, 'Name') ?? null,
    totalHealth: boss && Number.isFinite(Number(field(boss, 'TotalHealth'))) ? Number(field(boss, 'TotalHealth')) : null,
    health,
    phases,
  };
}

export function normalizeEiJson(raw: RawEiJson): NormalizedLog {
  const players: any[] = field(raw, 'Players') ?? [];
  const { perPlayerCounts, events, meta: mechanicsMeta } = extractMechanics(raw);
  const bossIdx = findBossTargetIndex(raw);

  const normalizedPlayers: NormalizedPlayer[] = players.map((p) => {
    const dps = extractPlayerDps(p);
    const def = extractPlayerDefenses(p);
    const specName: string = field(p, 'Profession') ?? 'Guardian';
    const name: string = field(p, 'Name') ?? 'Unknown';
    return {
      characterName: name,
      account: (field(p, 'Account') ?? 'Unknown.0000').replace(/^:/, ''),
      profession: SPEC_TO_PROFESSION[specName] ?? specName,
      spec: specName,
      subgroup: Number(field(p, 'Group') ?? 1),
      totalDps: dps.total,
      powerDps: dps.power,
      condiDps: dps.condi,
      damageTaken: def.damageTaken,
      downCount: def.downCount,
      deadCount: def.deadCount,
      boons: extractPlayerBoons(p),
      mechanics: perPlayerCounts.get(name) ?? {},
      squadRole: 'dps' as SquadRole,
      groupBoons: extractGroupBoons(p),
      healingOutput: extractHealingOutput(p),
      stats: extractPlayerStats(p, bossIdx),
      weapons: extractWeapons(p),
    };
  });

  const healingPowerScores = new Map(players.map((p) => [field(p, 'Name') ?? 'Unknown', extractHealingPowerScore(p)]));
  const squadRoles = computeSquadRoles(
    normalizedPlayers.map((p) => ({ ...p, healingPowerScore: healingPowerScores.get(p.characterName) ?? 0 })),
  );
  for (const p of normalizedPlayers) {
    p.squadRole = squadRoles.get(p.characterName) ?? 'dps';
  }

  const durationMs = Math.round(field(raw, 'DurationMS') ?? 0);
  const squadDps = normalizedPlayers.reduce((sum, p) => sum + p.totalDps, 0);
  const timeStart = field(raw, 'TimeStart') ?? field(raw, 'TimeStartStd');

  return {
    // Fold Elite Insights' name variants (CM suffix, map/short/split-phase
    // names) onto one canonical fightName at the point of ingest, so every
    // downstream consumer — categorization, wing grouping, background art,
    // leaderboards — sees a single stable spelling per encounter.
    fightName: canonicalFightName(field(raw, 'FightName') ?? 'Unknown Encounter'),
    triggerId: typeof field(raw, 'TriggerID') === 'number' ? field(raw, 'TriggerID') : null,
    isCm: Boolean(field(raw, 'IsCM') ?? false),
    success: Boolean(field(raw, 'Success')),
    durationMs,
    squadDps,
    encounterTime: timeStart ? new Date(timeStart) : new Date(),
    players: normalizedPlayers,
    mechanicEvents: events,
    deathEvents: extractDeaths(raw),
    mechanicsMeta,
    telemetry: extractEncounterTelemetry(raw, players, bossIdx),
  };
}
