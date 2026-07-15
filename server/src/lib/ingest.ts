// Field names verified against Elite Insights source (GW2EIJSON project,
// baaron4/GW2-Elite-Insights-Parser@master): JsonLog, JsonActor, JsonPlayer,
// JsonStatistics (JsonDPS/JsonDefensesAll), JsonBuffsUptime, JsonMechanics.
// EI serializes with the C# property names verbatim (PascalCase, no
// camelCase naming policy found in the source) — camelCase fallbacks are
// kept below anyway since that costs little and hedges against a version
// difference. As before, the full raw JSON is always persisted so a wrong
// guess here is correctable without re-parsing.

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

const SPEC_TO_PROFESSION: Record<string, string> = {
  Guardian: 'Guardian', Dragonhunter: 'Guardian', Firebrand: 'Guardian', Willbender: 'Guardian',
  Warrior: 'Warrior', Berserker: 'Warrior', Spellbreaker: 'Warrior', Bladesworn: 'Warrior',
  Revenant: 'Revenant', Herald: 'Revenant', Renegade: 'Revenant', Vindicator: 'Revenant',
  Engineer: 'Engineer', Scrapper: 'Engineer', Holosmith: 'Engineer', Mechanist: 'Engineer',
  Ranger: 'Ranger', Druid: 'Ranger', Soulbeast: 'Ranger', Untamed: 'Ranger',
  Thief: 'Thief', Daredevil: 'Thief', Deadeye: 'Thief', Specter: 'Thief',
  Elementalist: 'Elementalist', Tempest: 'Elementalist', Weaver: 'Elementalist', Catalyst: 'Elementalist',
  Mesmer: 'Mesmer', Chronomancer: 'Mesmer', Mirage: 'Mesmer', Virtuoso: 'Mesmer',
  Necromancer: 'Necromancer', Reaper: 'Necromancer', Scourge: 'Necromancer', Harbinger: 'Necromancer',
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
}

export interface NormalizedMechanicEvent {
  timeMs: number;
  name: string;
  actor: string | null;
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

function extractMechanics(raw: RawEiJson): {
  perPlayerCounts: Map<string, Record<string, number>>;
  events: NormalizedMechanicEvent[];
} {
  const perPlayerCounts = new Map<string, Record<string, number>>();
  const events: NormalizedMechanicEvent[] = [];
  const mechanics: any[] = field(raw, 'Mechanics') ?? [];

  for (const mech of mechanics) {
    const name: string = field(mech, 'Name') ?? field(mech, 'FullName') ?? 'Mechanic';
    const instances: any[] = field(mech, 'MechanicsData') ?? [];
    for (const inst of instances) {
      const actor: string | null = field(inst, 'Actor') ?? null;
      events.push({ timeMs: Math.round(field(inst, 'Time') ?? 0), name, actor });
      if (actor) {
        const counts = perPlayerCounts.get(actor) ?? {};
        counts[name] = (counts[name] ?? 0) + 1;
        perPlayerCounts.set(actor, counts);
      }
    }
  }

  return { perPlayerCounts, events };
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
    };
  });

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
  };
}
