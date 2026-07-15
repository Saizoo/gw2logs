// Field names verified against Elite Insights source (GW2EIJSON project,
// baaron4/GW2-Elite-Insights-Parser@master): JsonLog, JsonActor, JsonPlayer,
// JsonStatistics (JsonDPS/JsonDefensesAll), JsonBuffsUptime, JsonMechanics,
// JsonDeathRecap. EI serializes with the C# property names verbatim
// (PascalCase, no camelCase naming policy found in the source) — camelCase
// fallbacks are kept below anyway since that costs little and hedges
// against a version difference. Unlike earlier in this file's history, the
// raw JSON is no longer persisted after parsing (see persist.ts) — a wrong
// guess here means re-uploading the source log, not just re-running
// extraction against a stored copy.

export type RawEiJson = Record<string, any>;

function field(obj: any, pascalKey: string): any {
  if (obj == null) return undefined;
  if (pascalKey in obj) return obj[pascalKey];
  const camelKey = pascalKey.charAt(0).toLowerCase() + pascalKey.slice(1);
  return obj[camelKey];
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

// GroupBuffs mirrors BuffUptimes' shape (both are JsonBuffsUptimeData under
// the hood) but is scoped to what this player *generated* for their 5-person
// subgroup, rather than what they personally have up. That's the correct
// signal for "who is the alac/quick provider" — personal uptime doesn't
// distinguish a support who generates the boon from a squadmate who merely
// receives it.
function extractGroupBoons(player: any): Record<string, number> {
  const groupBuffs: any[] = field(player, 'GroupBuffs') ?? [];
  const boons: Record<string, number> = {};
  for (const key of ['quickness', 'alacrity'] as const) {
    const id = BOON_IDS[key];
    const buff = groupBuffs.find((b) => field(b, 'Id') === id);
    const buffData = field(buff, 'BuffData') ?? [];
    const uptime = field(buffData[0], 'Uptime') ?? 0;
    boons[key] = Math.round(uptime);
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
  players: { characterName: string; subgroup: number; groupBoons: Record<string, number>; healingOutput: number | null }[],
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
      } else if (p.healingOutput != null && p.healingOutput >= HEALER_HPS_THRESHOLD) {
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
} {
  const perPlayerCounts = new Map<string, Record<string, number>>();
  const events: NormalizedMechanicEvent[] = [];
  const mechanics: any[] = field(raw, 'Mechanics') ?? [];

  for (const mech of mechanics) {
    const name: string = field(mech, 'Name') ?? field(mech, 'FullName') ?? 'Mechanic';
    const severity: string | null = field(mech, 'Severity') ?? null;
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

  return { perPlayerCounts, events };
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

export function normalizeEiJson(raw: RawEiJson): NormalizedLog {
  const players: any[] = field(raw, 'Players') ?? [];
  const { perPlayerCounts, events } = extractMechanics(raw);

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
    };
  });

  const squadRoles = computeSquadRoles(normalizedPlayers);
  for (const p of normalizedPlayers) {
    p.squadRole = squadRoles.get(p.characterName) ?? 'dps';
  }

  const durationMs = Math.round(field(raw, 'DurationMS') ?? 0);
  const squadDps = normalizedPlayers.reduce((sum, p) => sum + p.totalDps, 0);
  const timeStart = field(raw, 'TimeStart') ?? field(raw, 'TimeStartStd');

  return {
    fightName: field(raw, 'FightName') ?? 'Unknown Encounter',
    triggerId: typeof field(raw, 'TriggerID') === 'number' ? field(raw, 'TriggerID') : null,
    isCm: Boolean(field(raw, 'IsCM') ?? false),
    success: Boolean(field(raw, 'Success')),
    durationMs,
    squadDps,
    encounterTime: timeStart ? new Date(timeStart) : new Date(),
    players: normalizedPlayers,
    mechanicEvents: events,
    deathEvents: extractDeaths(raw),
  };
}
