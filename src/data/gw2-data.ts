// Static reference data — real GW2 game facts (profession colors/specs,
// parse-tier thresholds, raid wing labels). No mock results here; log,
// leaderboard, and profile data all come from the API (see src/lib/api.ts).

export interface ProfessionInfo {
  hue: number;
  specs: [string, string, string, string];
}

// Hue values match the design system's profession color wheel.
export const PROFESSIONS: Record<string, ProfessionInfo> = {
  Warrior: { hue: 55, specs: ['Berserker', 'Spellbreaker', 'Bladesworn', 'Paragon'] },
  Guardian: { hue: 230, specs: ['Dragonhunter', 'Firebrand', 'Willbender', 'Luminary'] },
  Revenant: { hue: 25, specs: ['Herald', 'Renegade', 'Vindicator', 'Conduit'] },
  Ranger: { hue: 140, specs: ['Druid', 'Soulbeast', 'Untamed', 'Galeshot'] },
  Thief: { hue: 10, specs: ['Daredevil', 'Deadeye', 'Specter', 'Antiquary'] },
  Engineer: { hue: 70, specs: ['Scrapper', 'Holosmith', 'Mechanist', 'Amalgam'] },
  Necromancer: { hue: 155, specs: ['Reaper', 'Scourge', 'Harbinger', 'Ritualist'] },
  Elementalist: { hue: 35, specs: ['Tempest', 'Weaver', 'Catalyst', 'Evoker'] },
  Mesmer: { hue: 300, specs: ['Chronomancer', 'Mirage', 'Virtuoso', 'Troubadour'] },
};

export const PROFESSION_CHIPS = Object.keys(PROFESSIONS).map((k) => ({
  name: k,
  color: professionColor(k),
}));

export function professionColor(profession: string): string {
  const hue = PROFESSIONS[profession]?.hue;
  return hue === undefined ? 'oklch(0.6 0.015 90)' : `oklch(0.65 0.15 ${hue})`;
}

export function professionColorAlpha(profession: string, alphaPct: number): string {
  const hue = PROFESSIONS[profession]?.hue;
  return hue === undefined ? `oklch(0.6 0.015 90 / ${alphaPct}%)` : `oklch(0.65 0.15 ${hue} / ${alphaPct}%)`;
}

const SPEC_TO_PROFESSION: Record<string, string> = Object.fromEntries(
  Object.entries(PROFESSIONS).flatMap(([profession, info]) => info.specs.map((spec) => [spec, profession])),
);

export function professionForSpec(spec: string): string {
  return SPEC_TO_PROFESSION[spec] ?? spec;
}

// Icon file names in /public/professions match spec/profession names
// lowercased exactly (verified against the shipped icon set).
export function professionIconPath(profession: string, spec?: string | null): string {
  const key = spec && spec.trim() ? spec : profession;
  return `/professions/${key.toLowerCase()}.png`;
}

// Specialization banner art (the faded backdrop behind player rows, from
// the GW2 Stats Platform design). Elite specs use their own art; a core
// build falls back to the profession's core art. Files live in
// /public/assets/specializations (+ /core) — rows that reference a file
// that isn't shipped yet hide the <img> via onError, leaving the plain
// row background, so a missing asset degrades invisibly.
export function specBgPath(profession: string, spec?: string | null): string {
  const isElite = Boolean(spec && spec.trim() && spec !== profession);
  return isElite
    ? `/assets/specializations/${spec!.toLowerCase().replace(/\s+/g, '')}.png`
    : `/assets/specializations/core/${profession.toLowerCase()}.png`;
}

// Encounter background art keyed by fightName (Fight Report hero + log
// thumbnails). Only bosses with a known wing/strike/fractal map entry get
// art; anything unmapped returns null and the caller keeps its plain
// gradient — exactly the fallback the design handoff specifies.
const BOSS_BG: Record<string, string> = {
  // Raids by wing
  'Vale Guardian': 'spiritvale.jpg',
  'Gorseval the Multifarious': 'spiritvale.jpg',
  'Sabetha the Saboteur': 'spiritvale.jpg',
  Slothasor: 'salvationpass.jpg',
  'Matthias Gabrel': 'salvationpass.jpg',
  'Keep Construct': 'strongholdofthefaithful.jpg',
  Xera: 'strongholdofthefaithful.jpg',
  'Cairn the Indomitable': 'bastionofthepenitent.jpg',
  'Mursaat Overseer': 'bastionofthepenitent.jpg',
  Samarog: 'bastionofthepenitent.jpg',
  Deimos: 'bastionofthepenitent.jpg',
  'Soulless Horror': 'hallofchains.jpg',
  Dhuum: 'hallofchains.jpg',
  'Conjured Amalgamate': 'mythwrightgambit.jpg',
  'Twin Largos': 'mythwrightgambit.jpg',
  Qadim: 'mythwrightgambit.jpg',
  'Cardinal Adina': 'thekeyofahdashim.jpg',
  'Cardinal Sabir': 'thekeyofahdashim.jpg',
  'Qadim the Peerless': 'thekeyofahdashim.jpg',
  'Greer the Blightbringer': 'mountbalrior.jpg',
  'Decima the Stormsinger': 'mountbalrior.jpg',
  'Ura the Steamshrieker': 'mountbalrior.jpg',
  'Kela Seneschal of Waves': 'guardiansglade.jpg',
  // Former strikes (now raids in-game; still raid-category here)
  'Legendary Icebrood Construct': 'shiverpeakspass.jpg',
  'The Voice and the Claw': 'voiceofthefallenandclawofthefallen.jpg',
  'Fraenir of Jormag': 'fraenirofjormag.jpg',
  Boneskinner: 'boneskinner.jpg',
  'Whisper of Jormag': 'whisperofjormag.jpg',
  'Ancient Forgeman': 'forgingsteel.jpg',
  'Minister of Morale': 'coldwar.jpg',
  'Mai Trin': 'aetherbladehideout.jpg',
  Ankka: 'xunlaijadejunkyard.jpg',
  'Minister Li': 'kainengoverlook.jpg',
  'Prototype Vermilion': 'oldlionscourt.jpg',
  'The Dragonvoid': 'harvesttemple.jpg',
  Dagda: 'cosmicobservatory.jpg',
  Cerus: 'templeoffebe.jpg',
};

// Elite Insights names some encounters with a " CM" suffix or by a map /
// short / split-phase name; fold those onto the BOSS_BG keys so the art
// resolves regardless of which spelling a log arrived with. Mirrors the
// server's canonicalFightName (server/src/lib/bossMeta.ts) — kept small and
// local here rather than shared, since the frontend has no other reason to
// import server code.
const BG_ALIASES: Record<string, string> = {
  'Spirit Race': 'Vale Guardian', // Wing 1 mini-event — reuse the Spirit Vale art
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
  Desmina: 'Soulless Horror',
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
};
const CM_SUFFIX = /\s*[[(]?\b(?:c\.?m\.?|l\.?c\.?m\.?|challenge mode|legendary challenge mode)\b[\])]?\s*$/i;

function canonicalBoss(fightName: string): string {
  const trimmed = fightName.trim();
  const base = trimmed.replace(CM_SUFFIX, '').trim() || trimmed;
  return BG_ALIASES[base] ?? base;
}

export function bossBgPath(fightName: string): string | null {
  const file = BOSS_BG[canonicalBoss(fightName)];
  return file ? `/assets/raid_backgrounds/${file}` : null;
}

// Loose variant for raid-planner catalog names, which shorten or
// re-punctuate some fightNames ("Gorseval" vs "Gorseval the Multifarious",
// "Greer, the Blightbringer" vs "Greer the Blightbringer"): exact match
// first, then a normalized prefix/substring match in either direction.
// Misses fall back to null, same as bossBgPath — the caller keeps its
// gradient.
const normalizeBossName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function bossBgPathLoose(name: string): string | null {
  const exact = bossBgPath(name);
  if (exact) return exact;
  const n = normalizeBossName(name);
  if (!n) return null;
  const keys = Object.keys(BOSS_BG);
  const hit =
    keys.find((k) => normalizeBossName(k) === n) ??
    keys.find((k) => {
      const kn = normalizeBossName(k);
      return kn.startsWith(n) || n.startsWith(kn);
    }) ??
    keys.find((k) => {
      const kn = normalizeBossName(k);
      return kn.includes(n) || n.includes(kn);
    });
  return hit ? `/assets/raid_backgrounds/${BOSS_BG[hit]}` : null;
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

export interface ParseTier {
  color: string;
  bg: string;
}

// Percentile color thresholds match the design system's parse legend.
export function parseTier(pct: number): ParseTier {
  if (pct >= 99) return { color: 'var(--parse-99)', bg: 'var(--parse-99-bg)' };
  if (pct >= 95) return { color: 'var(--parse-95)', bg: 'var(--parse-95-bg)' };
  if (pct >= 75) return { color: 'var(--parse-75)', bg: 'var(--parse-75-bg)' };
  if (pct >= 50) return { color: 'var(--parse-50)', bg: 'var(--parse-50-bg)' };
  if (pct >= 25) return { color: 'var(--parse-25)', bg: 'var(--parse-25-bg)' };
  return { color: 'var(--parse-0)', bg: 'var(--parse-0-bg)' };
}

export const PARSE_LEGEND: { label: string; pct: number }[] = [
  { label: '0–24', pct: 10 },
  { label: '25–49', pct: 30 },
  { label: '50–74', pct: 60 },
  { label: '75–94', pct: 80 },
  { label: '95–98', pct: 96 },
  { label: '99', pct: 99 },
  { label: '100', pct: 100 },
];
