// Valid profession and elite-spec names, used to validate a user's chosen
// profile icon server-side. Kept in sync with the frontend PROFESSIONS map
// in src/data/gw2-data.ts (the icon file names derive from these).
export const PROFESSION_SPECS: Record<string, string[]> = {
  Warrior: ['Berserker', 'Spellbreaker', 'Bladesworn', 'Paragon'],
  Guardian: ['Dragonhunter', 'Firebrand', 'Willbender', 'Luminary'],
  Revenant: ['Herald', 'Renegade', 'Vindicator', 'Conduit'],
  Ranger: ['Druid', 'Soulbeast', 'Untamed', 'Galeshot'],
  Thief: ['Daredevil', 'Deadeye', 'Specter', 'Antiquary'],
  Engineer: ['Scrapper', 'Holosmith', 'Mechanist', 'Amalgam'],
  Necromancer: ['Reaper', 'Scourge', 'Harbinger', 'Ritualist'],
  Elementalist: ['Tempest', 'Weaver', 'Catalyst', 'Evoker'],
  Mesmer: ['Chronomancer', 'Mirage', 'Virtuoso', 'Troubadour'],
};

// Every pickable icon name: the 9 core professions plus their 36 elite specs.
const VALID_ICONS = new Set<string>([
  ...Object.keys(PROFESSION_SPECS),
  ...Object.values(PROFESSION_SPECS).flat(),
]);

export function isValidProfileIcon(value: string): boolean {
  return VALID_ICONS.has(value);
}
