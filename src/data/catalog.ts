// Curated raid/fractal catalog that drives the Raids and Fractals nav menus
// and the /raids and /fractals overview pages. Static on purpose — the menus
// list every area (with its art) whether or not logs exist yet.
//
// Mirrors server/src/lib/bossMeta.ts: raid groups are in BOSS_WING declaration
// order; fractal bosses come from FRACTAL_CM_BOSSES, grouped here by their
// in-game fractal instance (the server has no instance grouping of its own).
// Boss names are canonical fightNames so they match the API's scoping params.

import { bossBgPath } from './gw2-data';

export interface CatalogBoss {
  name: string;
  // Marks a boss with a challenge mode — drives the small "CM" chip in the
  // menu. Statistics always exposes an NM/CM split regardless.
  hasCm?: boolean;
}

export interface CatalogGroup {
  // Wing label ("Wing 1 — Spirit Vale") or fractal instance ("Nightmare").
  name: string;
  bosses: CatalogBoss[];
}

// Bosses that have a challenge mode (raids/strikes). Fractal CM bosses are all
// challenge modes by definition and are flagged in FRACTAL_CATALOG directly.
const CM_BOSSES = new Set<string>([
  'Cairn the Indomitable',
  'Mursaat Overseer',
  'Samarog',
  'Deimos',
  'Soulless Horror',
  'Dhuum',
  'Conjured Amalgamate',
  'Twin Largos',
  'Qadim',
  'Cardinal Adina',
  'Cardinal Sabir',
  'Qadim the Peerless',
  'Greer the Blightbringer',
  'Decima the Stormsinger',
  'Ura the Steamshrieker',
  'Kela Seneschal of Waves',
  // Former strikes with a CM (now folded into raids)
  'Mai Trin',
  'Ankka',
  'Minister Li',
  'The Dragonvoid',
  'Dagda',
  'Cerus',
  'Prototype Vermilion',
]);

const boss = (name: string): CatalogBoss => (CM_BOSSES.has(name) ? { name, hasCm: true } : { name });

export const RAID_CATALOG: CatalogGroup[] = [
  { name: 'Wing 1 — Spirit Vale', bosses: ['Vale Guardian', 'Spirit Race', 'Gorseval the Multifarious', 'Sabetha the Saboteur'].map(boss) },
  { name: 'Wing 2 — Salvation Pass', bosses: ['Slothasor', 'Bandit Trio', 'Matthias Gabrel'].map(boss) },
  { name: 'Wing 3 — Stronghold of the Faithful', bosses: ['Escort', 'Keep Construct', 'Twisted Castle', 'Xera'].map(boss) },
  { name: 'Wing 4 — Bastion of the Penitent', bosses: ['Cairn the Indomitable', 'Mursaat Overseer', 'Samarog', 'Deimos'].map(boss) },
  { name: 'Wing 5 — Hall of Chains', bosses: ['Soulless Horror', 'River of Souls', 'Statues of Grenth', 'Dhuum'].map(boss) },
  { name: 'Wing 6 — Mythwright Gambit', bosses: ['Conjured Amalgamate', 'Twin Largos', 'Qadim'].map(boss) },
  { name: 'Wing 7 — The Key of Ahdashim', bosses: ['Cardinal Adina', 'Cardinal Sabir', 'Qadim the Peerless'].map(boss) },
  { name: 'Wing 8 — Mount Balrior', bosses: ['Greer the Blightbringer', 'Decima the Stormsinger', 'Ura the Steamshrieker'].map(boss) },
  { name: "Guardian's Glade", bosses: ['Kela Seneschal of Waves'].map(boss) },
  {
    name: 'Icebrood Saga',
    bosses: ['Legendary Icebrood Construct', 'The Voice and the Claw', 'Fraenir of Jormag', 'Boneskinner', 'Whisper of Jormag', 'Ancient Forgeman', 'Minister of Morale'].map(boss),
  },
  { name: 'End of Dragons', bosses: ['Mai Trin', 'Ankka', 'Minister Li', 'The Dragonvoid'].map(boss) },
  { name: 'Secrets of the Obscure', bosses: ['Dagda', 'Cerus'].map(boss) },
  { name: "Old Lion's Court", bosses: ['Prototype Vermilion'].map(boss) },
];

const fractalBoss = (name: string): CatalogBoss => ({ name, hasCm: true });

export const FRACTAL_CATALOG: CatalogGroup[] = [
  { name: 'Nightmare', bosses: ['MAMA', 'Siax the Corrupted', 'Ensolyss of the Endless Torment'].map(fractalBoss) },
  { name: 'Shattered Observatory', bosses: ['Skorvald the Shattered', 'Artsariiv', 'Arkk'].map(fractalBoss) },
  { name: 'Sunqua Peak', bosses: ['Ai, Keeper of the Peak'].map(fractalBoss) },
  { name: 'Silent Surf', bosses: ['Kanaxai, Scythe of House Aurkus'].map(fractalBoss) },
  { name: 'Lonely Tower', bosses: ['Whispering Shadow', 'Sorrowful Spellcaster', 'Eparch'].map(fractalBoss) },
];

// One shared piece of art stands in for every fractal instance (fractals
// don't have per-wing backdrops the way raids do). Update this single path to
// match the file you shipped; a missing file self-hides via ArtImg, so the
// menu/cards fall back to their gradient until it exists.
export const FRACTAL_IMAGE = '/assets/raid_backgrounds/fractals.png';

const FRACTAL_GROUP_NAMES = new Set(FRACTAL_CATALOG.map((g) => g.name));

// Group thumbnail: the shared fractal image for any fractal instance,
// otherwise the first boss in the group with shipped raid art.
export function groupImage(group: CatalogGroup): string | null {
  if (FRACTAL_GROUP_NAMES.has(group.name)) return FRACTAL_IMAGE;
  for (const b of group.bosses) {
    const path = bossBgPath(b.name);
    if (path) return path;
  }
  return null;
}

// Whether a group has any CM boss — the wing/instance level shows a CM tab in
// Statistics only when at least one of its bosses has one.
export function groupHasCm(group: CatalogGroup): boolean {
  return group.bosses.some((b) => b.hasCm);
}
