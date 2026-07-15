// Static reference data — real GW2 game facts (profession colors/specs,
// rank-color thresholds, raid wing labels). No mock results here; log,
// leaderboard, and profile data all come from the API (see src/lib/api.ts).

export const RANK_COLORS = {
  gray: '#8b8f98',
  green: '#4caf6d',
  blue: '#4a9eff',
  purple: '#b46eff',
  orange: '#ff9640',
  pink: '#ff6ec7',
  gold: '#f0c852',
} as const;

export interface ProfessionInfo {
  color: string;
  specs: [string, string, string, string];
}

export const PROFESSIONS: Record<string, ProfessionInfo> = {
  Guardian: { color: '#72c1d9', specs: ['Dragonhunter', 'Firebrand', 'Willbender', 'Luminary'] },
  Warrior: { color: '#ffd166', specs: ['Berserker', 'Spellbreaker', 'Bladesworn', 'Paragon'] },
  Revenant: { color: '#d16e5a', specs: ['Herald', 'Renegade', 'Vindicator', 'Conduit'] },
  Engineer: { color: '#d09c59', specs: ['Scrapper', 'Holosmith', 'Mechanist', 'Amalgam'] },
  Ranger: { color: '#8cdc82', specs: ['Druid', 'Soulbeast', 'Untamed', 'Galeshot'] },
  Thief: { color: '#c08f95', specs: ['Daredevil', 'Deadeye', 'Specter', 'Antiquary'] },
  Elementalist: { color: '#f55d4e', specs: ['Tempest', 'Weaver', 'Catalyst', 'Evoker'] },
  Mesmer: { color: '#d6708b', specs: ['Chronomancer', 'Mirage', 'Virtuoso', 'Troubadour'] },
  Necromancer: { color: '#52a76f', specs: ['Reaper', 'Scourge', 'Harbinger', 'Ritualist'] },
};

export const PROFESSION_CHIPS = Object.keys(PROFESSIONS).map((k) => ({
  name: k,
  color: PROFESSIONS[k].color,
}));

export function professionColor(profession: string): string {
  return PROFESSIONS[profession]?.color ?? '#8b8f98';
}

export interface Boss {
  name: string;
  wing: string;
  cm: boolean;
}

export const BOSSES: Boss[] = [
  { name: 'Vale Guardian', wing: 'Wing 1 — Spirit Vale', cm: false },
  { name: 'Sabetha the Saboteur', wing: 'Wing 1 — Spirit Vale', cm: false },
  { name: 'Matthias Gabrel', wing: 'Wing 2 — Salvation Pass', cm: false },
  { name: 'Xera', wing: 'Wing 2 — Salvation Pass', cm: false },
  { name: 'Cairn the Indomitable', wing: 'Wing 3 — Stronghold of the Faithful', cm: true },
  { name: 'Samarog', wing: 'Wing 3 — Stronghold of the Faithful', cm: true },
  { name: 'Deimos', wing: 'Wing 3 — Stronghold of the Faithful', cm: true },
  { name: 'Soulless Horror', wing: 'Wing 4 — Bastion of the Penitent', cm: true },
  { name: 'Dhuum', wing: 'Wing 4 — Bastion of the Penitent', cm: true },
  { name: 'Conjured Amalgamate', wing: 'Wing 5 — Hall of Chains', cm: true },
  { name: 'Twin Largos', wing: 'Wing 5 — Hall of Chains', cm: true },
  { name: 'Qadim', wing: 'Wing 5 — Hall of Chains', cm: true },
  { name: 'Cardinal Adina', wing: 'Wing 6 — Mythwright Gambit', cm: true },
  { name: 'Cardinal Sabir', wing: 'Wing 6 — Mythwright Gambit', cm: true },
  { name: 'Qadim the Peerless', wing: 'Wing 6 — Mythwright Gambit', cm: true },
];

export function rankColorForPct(pct: number): string {
  if (pct >= 100) return RANK_COLORS.gold;
  if (pct >= 99) return RANK_COLORS.pink;
  if (pct >= 95) return RANK_COLORS.orange;
  if (pct >= 75) return RANK_COLORS.purple;
  if (pct >= 50) return RANK_COLORS.blue;
  if (pct >= 25) return RANK_COLORS.green;
  return RANK_COLORS.gray;
}
