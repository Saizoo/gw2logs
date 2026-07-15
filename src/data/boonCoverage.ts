// Boon coverage heuristic, ported verbatim from the previous raid planner.
// This infers which boons a build slot supplies purely from its category
// and a few name substrings — it is NOT derived from real build data (no
// build in the catalog actually sets stacking counts or uptime %). Keep
// the exact rules as-is when touching this file; this is curated behavior
// being preserved, not logic to "improve."
import type { BuildEntry } from './builds';

export type BoonKey =
  | 'Quickness'
  | 'Alacrity'
  | 'Healing'
  | 'Might'
  | 'Fury'
  | 'Protection'
  | 'Aegis'
  | 'Regeneration'
  | 'Resolution'
  | 'Stability'
  | 'Vigor'
  | 'Swiftness';

export function providesBoons(b: BuildEntry): Set<BoonKey> {
  const s = new Set<BoonKey>();
  const name = (b.name || '').toLowerCase();
  const isQ = b.cat === 'qdps' || b.cat === 'qheal';
  const isA = b.cat === 'adps' || b.cat === 'aheal';
  const isHeal = b.cat === 'qheal' || b.cat === 'aheal';
  const isBoonDps = b.cat === 'qdps' || b.cat === 'adps';

  if (isQ) s.add('Quickness');
  if (isA) s.add('Alacrity');
  if (isHeal) s.add('Healing');
  if (isHeal || isBoonDps) {
    s.add('Might');
    s.add('Fury');
    s.add('Regeneration');
    s.add('Swiftness');
    s.add('Vigor');
  }
  if (isHeal) {
    s.add('Protection');
    s.add('Aegis');
    s.add('Resolution');
    s.add('Stability');
  }
  if (b.p === 'guard') {
    s.add('Aegis');
    s.add('Resolution');
  }
  if (name.includes('luminary')) {
    s.add('Protection');
    s.add('Stability');
    s.add('Resolution');
    s.add('Aegis');
  }
  if (name.includes('herald')) {
    s.add('Protection');
    s.add('Regeneration');
    s.add('Swiftness');
  }
  if (name.includes('ritualist')) {
    s.add('Protection');
    s.add('Aegis');
    s.add('Stability');
  }
  if (name.includes('vindicator') || name.includes('renegade')) s.add('Protection');
  if (name.includes('chronomancer') && isBoonDps) s.add('Aegis');

  return s;
}

export const COV_BOONS: { k: BoonKey; short: string; core?: boolean }[] = [
  { k: 'Quickness', short: 'Quick', core: true },
  { k: 'Alacrity', short: 'Alac', core: true },
  { k: 'Healing', short: 'Heal', core: true },
  { k: 'Might', short: 'Might', core: true },
  { k: 'Fury', short: 'Fury', core: true },
  { k: 'Protection', short: 'Prot' },
  { k: 'Aegis', short: 'Aegis' },
  { k: 'Regeneration', short: 'Regen' },
  { k: 'Resolution', short: 'Resol' },
  { k: 'Stability', short: 'Stab' },
  { k: 'Vigor', short: 'Vigor' },
  { k: 'Swiftness', short: 'Swift' },
];

export function coverageFor(builds: (BuildEntry | null | undefined)[]): Set<BoonKey> {
  const s = new Set<BoonKey>();
  for (const b of builds) {
    if (!b) continue;
    for (const boon of providesBoons(b)) s.add(boon);
  }
  return s;
}
