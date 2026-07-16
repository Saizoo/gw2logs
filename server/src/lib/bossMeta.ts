// Wing labels for the raid bosses the design doc already named — cosmetic
// enrichment only. Any boss Elite Insights reports that isn't in this list
// still ingests fine with wing left null.
export const BOSS_WING: Record<string, string> = {
  'Vale Guardian': 'Wing 1 — Spirit Vale',
  'Sabetha the Saboteur': 'Wing 1 — Spirit Vale',
  'Matthias Gabrel': 'Wing 2 — Salvation Pass',
  Xera: 'Wing 2 — Salvation Pass',
  'Cairn the Indomitable': 'Wing 3 — Stronghold of the Faithful',
  Samarog: 'Wing 3 — Stronghold of the Faithful',
  Deimos: 'Wing 3 — Stronghold of the Faithful',
  'Soulless Horror': 'Wing 4 — Bastion of the Penitent',
  Dhuum: 'Wing 4 — Bastion of the Penitent',
  'Conjured Amalgamate': 'Wing 5 — Hall of Chains',
  'Twin Largos': 'Wing 5 — Hall of Chains',
  Qadim: 'Wing 5 — Hall of Chains',
  'Cardinal Adina': 'Wing 6 — Mythwright Gambit',
  'Cardinal Sabir': 'Wing 6 — Mythwright Gambit',
  'Qadim the Peerless': 'Wing 6 — Mythwright Gambit',
};

// Named, verified boss lists (user-supplied) for the Logs page category
// filter, now that Strikes have been removed from the game — every former
// strike boss that's still relevant got folded into "Raids" below rather
// than kept as its own bucket. This replaces the old wing-based raid/other
// split, which could only tell "raid" from "everything else" and had no way
// to single out Fractal CMs at all.
export const RAID_BOSSES = new Set<string>([
  'Prototype Vermilion',
  'Vale Guardian',
  'Gorseval the Multifarious',
  'Sabetha the Saboteur',
  'Slothasor',
  'Matthias Gabrel',
  'Keep Construct',
  'Xera',
  'Cairn the Indomitable',
  'Mursaat Overseer',
  'Samarog',
  'Deimos',
  'Soulless Horror',
  'Dhuum',
  'Conjured Amalgamate',
  'Twin Largos',
  'Qadim',
  'Cardinal Sabir',
  'Cardinal Adina',
  'Qadim the Peerless',
  'Legendary Icebrood Construct',
  'The Voice and the Claw',
  'Fraenir of Jormag',
  'Boneskinner',
  'Whisper of Jormag',
  'Ancient Forgeman',
  'Minister of Morale',
  'Mai Trin',
  'Ankka',
  'Minister Li',
  'The Dragonvoid',
  'Dagda',
  'Cerus',
  'Greer the Blightbringer',
  'Decima the Stormsinger',
  'Ura the Steamshrieker',
  'Kela Seneschal of Waves',
]);

export const FRACTAL_CM_BOSSES = new Set<string>([
  'Deimos',
  'Cerus',
  'Eparch',
  'Kanaxai',
  'Scythe of House Aurkus',
  'Sorrowful Spellcaster',
  'Skorvald the Shattered',
  'Viirastra',
  'Arkk',
  'Siax the Unclean',
  'Ensolyss',
  'Legendary Whispering Shadow',
]);

// 'Deimos' and 'Cerus' each name two distinct encounters — a raid boss and
// a Fractal CM boss that happen to share the exact fightName. Squad size
// resolves it: a Fractal CM instance caps at 5 players and a raid squad
// runs up to 10, and nothing in this game supports a size in between for
// either, so this is a real signal rather than a guess. Every other boss
// name only ever means one thing and skips this check entirely.
const AMBIGUOUS_BOSSES = new Set(['Deimos', 'Cerus']);
const FRACTAL_SQUAD_SIZE_CAP = 5;

export function categorizeFight(fightName: string, playerCount?: number): 'raid' | 'fractal' | 'other' {
  if (AMBIGUOUS_BOSSES.has(fightName) && playerCount != null) {
    return playerCount <= FRACTAL_SQUAD_SIZE_CAP ? 'fractal' : 'raid';
  }
  if (RAID_BOSSES.has(fightName)) return 'raid';
  if (FRACTAL_CM_BOSSES.has(fightName)) return 'fractal';
  return 'other';
}

// Same disambiguation for the cosmetic wing label — a Fractal CM Deimos log
// shouldn't be tagged "Wing 3 — Stronghold of the Faithful" just because it
// shares a name with the raid boss.
export function resolveWing(fightName: string, playerCount: number): string | null {
  if (AMBIGUOUS_BOSSES.has(fightName) && playerCount <= FRACTAL_SQUAD_SIZE_CAP) return null;
  return BOSS_WING[fightName] ?? null;
}
