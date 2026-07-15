import type { RawEiJson } from './dpsReport.js';

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

function parseDurationMs(raw: RawEiJson): number {
  if (typeof raw.durationMS === 'number') return raw.durationMS;
  const str: string | undefined = raw.duration;
  if (!str) return 0;
  const m = /(?:(\d+)m)?\s*(?:(\d+(?:\.\d+)?)s)?/.exec(str);
  const minutes = Number(m?.[1] ?? 0);
  const seconds = Number(m?.[2] ?? 0);
  return Math.round((minutes * 60 + seconds) * 1000);
}

function extractPlayerDps(raw: RawEiJson, index: number) {
  const entry = raw.dpsAll?.[index]?.[0] ?? raw.dpsAll?.[index] ?? {};
  return {
    total: Math.round(entry.dps ?? 0),
    power: Math.round(entry.powerDps ?? 0),
    condi: Math.round(entry.condiDps ?? 0),
  };
}

function extractPlayerDefenses(raw: RawEiJson, index: number) {
  const entry = raw.defenses?.[index]?.[0] ?? raw.defenses?.[index] ?? {};
  return {
    damageTaken: Math.round(entry.damageTaken ?? 0),
    downCount: Math.round(entry.downCount ?? 0),
    deadCount: Math.round(entry.deadCount ?? 0),
  };
}

function extractPlayerBoons(raw: RawEiJson, index: number): Record<string, number> {
  const boons: Record<string, number> = {};
  const buffUptimes: any[] = raw.buffUptimes ?? [];
  for (const [key, id] of Object.entries(BOON_IDS)) {
    const buff = buffUptimes.find((b) => b.id === id);
    const uptime = buff?.buffData?.[index]?.uptime ?? buff?.states?.[index]?.uptime ?? 0;
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
  const mechanics: any[] = raw.mechanics ?? [];

  for (const mech of mechanics) {
    const name: string = mech.name ?? mech.shortName ?? 'Mechanic';
    const instances: any[] = mech.data ?? mech.mechanicsData ?? [];
    for (const inst of instances) {
      const actor: string | null = inst.actor ?? null;
      events.push({ timeMs: Math.round(inst.time ?? 0), name, actor });
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
  const players: any[] = raw.players ?? [];
  const { perPlayerCounts, events } = extractMechanics(raw);

  const normalizedPlayers: NormalizedPlayer[] = players.map((p, i) => {
    const dps = extractPlayerDps(raw, i);
    const def = extractPlayerDefenses(raw, i);
    const specName: string = p.profession ?? 'Guardian';
    return {
      characterName: p.name ?? 'Unknown',
      account: (p.account ?? 'Unknown.0000').replace(/^:/, ''),
      profession: SPEC_TO_PROFESSION[specName] ?? specName,
      spec: specName,
      subgroup: Number(p.group ?? 1),
      totalDps: dps.total,
      powerDps: dps.power,
      condiDps: dps.condi,
      damageTaken: def.damageTaken,
      downCount: def.downCount,
      deadCount: def.deadCount,
      boons: extractPlayerBoons(raw, i),
      mechanics: perPlayerCounts.get(p.name) ?? {},
    };
  });

  const durationMs = parseDurationMs(raw);
  const squadDps = normalizedPlayers.reduce((sum, p) => sum + p.totalDps, 0);

  return {
    fightName: raw.fightName ?? 'Unknown Encounter',
    triggerId: typeof raw.triggerID === 'number' ? raw.triggerID : null,
    isCm: Boolean(raw.isCM ?? raw.isCm ?? false),
    success: Boolean(raw.success),
    durationMs,
    squadDps,
    encounterTime: raw.timeStart ? new Date(raw.timeStart) : new Date(),
    players: normalizedPlayers,
    mechanicEvents: events,
  };
}
