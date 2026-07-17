// Wing / map labels keyed by fightName — cosmetic enrichment only. Any
// boss Elite Insights reports that isn't in this list still ingests fine
// with wing left null. Declaration order here is canonical: the Encounters
// overview derives both wing ordering and boss-within-wing ordering from
// the order keys appear in this map.
export const BOSS_WING: Record<string, string> = {
  // Raid wings
  'Vale Guardian': 'Wing 1 — Spirit Vale',
  'Spirit Race': 'Wing 1 — Spirit Vale',
  'Gorseval the Multifarious': 'Wing 1 — Spirit Vale',
  'Sabetha the Saboteur': 'Wing 1 — Spirit Vale',
  Slothasor: 'Wing 2 — Salvation Pass',
  'Bandit Trio': 'Wing 2 — Salvation Pass',
  'Matthias Gabrel': 'Wing 2 — Salvation Pass',
  'Escort': 'Wing 3 — Stronghold of the Faithful',
  'Keep Construct': 'Wing 3 — Stronghold of the Faithful',
  'Twisted Castle': 'Wing 3 — Stronghold of the Faithful',
  Xera: 'Wing 3 — Stronghold of the Faithful',
  'Cairn the Indomitable': 'Wing 4 — Bastion of the Penitent',
  'Mursaat Overseer': 'Wing 4 — Bastion of the Penitent',
  Samarog: 'Wing 4 — Bastion of the Penitent',
  Deimos: 'Wing 4 — Bastion of the Penitent',
  'Soulless Horror': 'Wing 5 — Hall of Chains',
  'River of Souls': 'Wing 5 — Hall of Chains',
  'Statues of Grenth': 'Wing 5 — Hall of Chains',
  Dhuum: 'Wing 5 — Hall of Chains',
  'Conjured Amalgamate': 'Wing 6 — Mythwright Gambit',
  'Twin Largos': 'Wing 6 — Mythwright Gambit',
  Qadim: 'Wing 6 — Mythwright Gambit',
  'Cardinal Adina': 'Wing 7 — The Key of Ahdashim',
  'Cardinal Sabir': 'Wing 7 — The Key of Ahdashim',
  'Qadim the Peerless': 'Wing 7 — The Key of Ahdashim',
  'Greer the Blightbringer': 'Wing 8 — Mount Balrior',
  'Decima the Stormsinger': 'Wing 8 — Mount Balrior',
  'Ura the Steamshrieker': 'Wing 8 — Mount Balrior',
  'Kela Seneschal of Waves': "Guardian's Glade",
  // Former strikes, folded into raids in-game — grouped by their map
  'Legendary Icebrood Construct': 'Shiverpeaks Pass',
  'The Voice and the Claw': 'Voice of the Fallen and Claw of the Fallen',
  'Fraenir of Jormag': 'Fraenir of Jormag',
  Boneskinner: 'Boneskinner',
  'Whisper of Jormag': 'Whisper of Jormag',
  'Ancient Forgeman': 'Forging Steel',
  'Minister of Morale': 'Cold War',
  'Mai Trin': 'Aetherblade Hideout',
  Ankka: 'Xunlai Jade Junkyard',
  'Minister Li': 'Kaineng Overlook',
  'The Dragonvoid': 'Harvest Temple',
  Dagda: 'Cosmic Observatory',
  Cerus: 'Temple of Febe',
  'Prototype Vermilion': "Old Lion's Court",
};

// Elite Insights (and dps.report) name the same encounter several ways:
// challenge modes carry a " CM" suffix, some bosses are logged by their
// short name, their map/instance name, or a split-phase name. This folds
// every known variant onto ONE canonical fightName — the exact string used
// as a key in the maps/sets above and below — so categorization, wing
// grouping and background art all match regardless of which spelling the
// log arrived with. Keys are matched case-insensitively after the CM
// suffix is stripped.
const FIGHT_NAME_ALIASES: Record<string, string> = {
  // Raid short names
  Gorseval: 'Gorseval the Multifarious',
  Sabetha: 'Sabetha the Saboteur',
  Matthias: 'Matthias Gabrel',
  Cairn: 'Cairn the Indomitable',
  Adina: 'Cardinal Adina',
  Sabir: 'Cardinal Sabir',
  'Peerless Qadim': 'Qadim the Peerless',
  Greer: 'Greer the Blightbringer',
  Decima: 'Decima the Stormsinger',
  Ura: 'Ura the Steamshrieker',
  Kela: 'Kela Seneschal of Waves',
  'Kela, Seneschal of Waves': 'Kela Seneschal of Waves',
  Nikare: 'Twin Largos',
  Kenut: 'Twin Largos',
  'Spirit Woods': 'Spirit Race',
  Desmina: 'Soulless Horror',
  // Strikes logged by map / instance name
  'Shiverpeaks Pass': 'Legendary Icebrood Construct',
  'Voice of the Fallen and Claw of the Fallen': 'The Voice and the Claw',
  'Forging Steel': 'Ancient Forgeman',
  'Cold War': 'Minister of Morale',
  'Aetherblade Hideout': 'Mai Trin',
  'Captain Mai Trin': 'Mai Trin',
  'Mai Trin & Echo of Scarlet Briar': 'Mai Trin',
  'Xunlai Jade Junkyard': 'Ankka',
  'Kaineng Overlook': 'Minister Li',
  'Minister Li & The Response Team': 'Minister Li',
  'Harvest Temple': 'The Dragonvoid',
  'Void Amalgamate': 'The Dragonvoid',
  'Cosmic Observatory': 'Dagda',
  'Temple of Febe': 'Cerus',
  "Old Lion's Court": 'Prototype Vermilion',
  'Prototype Vermilion, Prototype Arsenite & Prototype Indigo': 'Prototype Vermilion',
  // Fractal CM short / variant names
  Skorvald: 'Skorvald the Shattered',
  Siax: 'Siax the Corrupted',
  'Siax the Unclean': 'Siax the Corrupted',
  Ensolyss: 'Ensolyss of the Endless Torment',
  'Whispering Shadow': 'Whispering Shadow',
  'Legendary Whispering Shadow': 'Whispering Shadow',
  Ai: 'Ai, Keeper of the Peak',
  'Keeper of the Peak': 'Ai, Keeper of the Peak',
  'Dark Ai': 'Ai, Keeper of the Peak',
  'Elemental Ai': 'Ai, Keeper of the Peak',
  'Dark Ai, Keeper of the Peak': 'Ai, Keeper of the Peak',
  'Elemental Ai, Keeper of the Peak': 'Ai, Keeper of the Peak',
  Kanaxai: 'Kanaxai, Scythe of House Aurkus',
  'Scythe of House Aurku': 'Kanaxai, Scythe of House Aurkus',
  'Scythe of House Aurkus': 'Kanaxai, Scythe of House Aurkus',
};

const FIGHT_NAME_ALIASES_LC = new Map(
  Object.entries(FIGHT_NAME_ALIASES).map(([variant, canonical]) => [variant.toLowerCase(), canonical]),
);

// Trailing challenge-mode / legendary-CM markers Elite Insights appends to
// the fightName. Stripped before alias lookup — the CM state is tracked
// separately on the log's isCm flag, so it must never affect which boss a
// name resolves to.
const CM_SUFFIX_RE = /\s*[[(]?\b(?:c\.?m\.?|l\.?c\.?m\.?|challenge mode|legendary challenge mode)\b[\])]?\s*$/i;

export function canonicalFightName(raw: string): string {
  const trimmed = raw.trim();
  const base = trimmed.replace(CM_SUFFIX_RE, '').trim() || trimmed;
  return FIGHT_NAME_ALIASES[base] ?? FIGHT_NAME_ALIASES_LC.get(base.toLowerCase()) ?? base;
}

// Named, verified boss lists for the Logs page category filter, now that
// Strikes have been removed from the game — every former strike boss that's
// still relevant got folded into "Raids" below rather than kept as its own
// bucket. Entries are canonical fightNames (see canonicalFightName).
export const RAID_BOSSES = new Set<string>([
  'Prototype Vermilion',
  'Vale Guardian',
  'Spirit Race',
  'Gorseval the Multifarious',
  'Sabetha the Saboteur',
  'Slothasor',
  'Bandit Trio',
  'Matthias Gabrel',
  'Escort',
  'Keep Construct',
  'Twisted Castle',
  'Xera',
  'Cairn the Indomitable',
  'Mursaat Overseer',
  'Samarog',
  'Deimos',
  'Soulless Horror',
  'River of Souls',
  'Statues of Grenth',
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
  'MAMA',
  'Siax the Corrupted',
  'Ensolyss of the Endless Torment',
  'Skorvald the Shattered',
  'Artsariiv',
  'Arkk',
  'Ai, Keeper of the Peak',
  'Kanaxai, Scythe of House Aurkus',
  'Sorrowful Spellcaster',
  'Eparch',
  'Whispering Shadow',
  'Deimos',
  'Cerus',
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
  const name = canonicalFightName(fightName);
  if (AMBIGUOUS_BOSSES.has(name) && playerCount != null) {
    return playerCount <= FRACTAL_SQUAD_SIZE_CAP ? 'fractal' : 'raid';
  }
  if (RAID_BOSSES.has(name)) return 'raid';
  if (FRACTAL_CM_BOSSES.has(name)) return 'fractal';
  return 'other';
}

// Same disambiguation for the cosmetic wing label — a Fractal CM Deimos log
// shouldn't be tagged "Wing 3 — Stronghold of the Faithful" just because it
// shares a name with the raid boss.
export function resolveWing(fightName: string, playerCount: number): string | null {
  const name = canonicalFightName(fightName);
  if (AMBIGUOUS_BOSSES.has(name) && playerCount <= FRACTAL_SQUAD_SIZE_CAP) return null;
  return BOSS_WING[name] ?? null;
}
