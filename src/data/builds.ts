// The build catalog itself (snowcrows.com build guides) is admin-editable
// and lives in the DB now — fetch it with api.builds() and adapt each row
// with toBuildEntry() below. Only the fixed game-data metadata stays static
// here: the 9 professions and 8 build categories aren't something an admin
// adds or removes, they're the actual GW2 profession/role taxonomy.

import type { Build } from '../lib/api';

export type ProfessionKey = 'guard' | 'rev' | 'war' | 'eng' | 'rang' | 'thief' | 'ele' | 'mes' | 'nec';
export type BuildCategory = 'pdps' | 'cdps' | 'qdps' | 'adps' | 'qheal' | 'aheal' | 'tank' | 'kiter';

export interface BuildEntry {
  /** Stable id derived from the guide URL path — safe to store/reference, unlike a raw array index. */
  id: string;
  p: ProfessionKey;
  cat: BuildCategory;
  name: string;
  weapons: string;
  url: string;
}

// boonCoverage.ts's curated heuristic reads BuildEntry's short `p`/`cat`
// field names — kept as-is here rather than renamed, so that file (which
// explicitly asks not to be touched) doesn't need to change at all.
export function toBuildEntry(b: Build): BuildEntry {
  return { id: b.id, p: b.profession as ProfessionKey, cat: b.category as BuildCategory, name: b.name, weapons: b.weapons, url: b.url };
}

export const PROF: Record<ProfessionKey, { name: string; key: string; c: string }> = {
  guard: { name: 'Guardian', key: 'guardian', c: '#48b6d6' },
  rev: { name: 'Revenant', key: 'revenant', c: '#d0503a' },
  war: { name: 'Warrior', key: 'warrior', c: '#d4b13c' },
  eng: { name: 'Engineer', key: 'engineer', c: '#c98a3f' },
  rang: { name: 'Ranger', key: 'ranger', c: '#86b53f' },
  thief: { name: 'Thief', key: 'thief', c: '#c0904f' },
  ele: { name: 'Elementalist', key: 'elementalist', c: '#d65a4a' },
  mes: { name: 'Mesmer', key: 'mesmer', c: '#b15ad6' },
  nec: { name: 'Necromancer', key: 'necromancer', c: '#3fae74' },
};

export const PROF_ORDER: ProfessionKey[] = ['guard', 'rev', 'war', 'eng', 'rang', 'thief', 'ele', 'mes', 'nec'];

export const PROF_BY_API: Record<string, ProfessionKey> = {
  Guardian: 'guard',
  Revenant: 'rev',
  Warrior: 'war',
  Engineer: 'eng',
  Ranger: 'rang',
  Thief: 'thief',
  Elementalist: 'ele',
  Mesmer: 'mes',
  Necromancer: 'nec',
};

export const CAT: Record<BuildCategory, { label: string; group: 'dps' | 'heal' | 'util'; c: string }> = {
  pdps: { label: 'Power DPS', group: 'dps', c: '#d24a3a' },
  cdps: { label: 'Condition DPS', group: 'dps', c: '#e07b2c' },
  qdps: { label: 'Quickness DPS (QDPS)', group: 'dps', c: '#c79a3c' },
  adps: { label: 'Alacrity DPS (ADPS)', group: 'dps', c: '#7fae3f' },
  qheal: { label: 'Quickness Healer', group: 'heal', c: '#5aa97f' },
  aheal: { label: 'Alacrity Healer', group: 'heal', c: '#4f9bc4' },
  tank: { label: 'Tank', group: 'util', c: '#9d77c9' },
  kiter: { label: 'Kiter', group: 'util', c: '#c97fae' },
};
