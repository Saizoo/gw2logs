// Mock data for the GW2 combat log platform prototype.
// Ported from the design doc's gw2-data.js so every page renders real,
// internally-consistent numbers instead of literal template placeholders.

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
  specs: [string, string, string];
}

export const PROFESSIONS: Record<string, ProfessionInfo> = {
  Guardian: { color: '#72c1d9', specs: ['Dragonhunter', 'Firebrand', 'Willbender'] },
  Warrior: { color: '#ffd166', specs: ['Berserker', 'Spellbreaker', 'Bladesworn'] },
  Revenant: { color: '#d16e5a', specs: ['Herald', 'Renegade', 'Vindicator'] },
  Engineer: { color: '#d09c59', specs: ['Scrapper', 'Holosmith', 'Mechanist'] },
  Ranger: { color: '#8cdc82', specs: ['Druid', 'Soulbeast', 'Untamed'] },
  Thief: { color: '#c08f95', specs: ['Daredevil', 'Deadeye', 'Specter'] },
  Elementalist: { color: '#f55d4e', specs: ['Tempest', 'Weaver', 'Catalyst'] },
  Mesmer: { color: '#d6708b', specs: ['Chronomancer', 'Mirage', 'Virtuoso'] },
  Necromancer: { color: '#52a76f', specs: ['Reaper', 'Scourge', 'Harbinger'] },
};

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

const names = [
  'Sai Zu', 'Moira Ashfall', 'Kettu Vashen', 'Torin Blackwell', 'Aeris Nightsong',
  'Draven Ironhide', 'Lyric Waverunner', 'Ossian Thorne', 'Nyra Duskwalker', 'Fenwick Aldric',
  'Cass Emberlyn', 'Rook Halvard', 'Wren Solstice', 'Talon Greymoor', 'Iris Faelynn',
];

export interface LeaderboardRow {
  rank: number;
  name: string;
  guild: string;
  profession: string;
  spec: string;
  color: string;
  dps: number;
  duration: string;
  date: string;
  pct: number;
  rankColor: string;
}

export const ENCOUNTER_LEADERBOARD: LeaderboardRow[] = names.map((n, i) => {
  const profList = Object.keys(PROFESSIONS);
  const prof = profList[i % profList.length];
  const spec = PROFESSIONS[prof].specs[i % 3];
  const pct = [100, 99, 97, 96, 88, 82, 71, 63, 54, 41, 33, 22, 14, 8, 3][i];
  return {
    rank: i + 1,
    name: n,
    guild: ['[VoS]', '[PPT]', '[Meta]', '[Krew]', '[Elit]'][i % 5],
    profession: prof,
    spec,
    color: PROFESSIONS[prof].color,
    dps: Math.round(38000 - i * 950 + (i % 3) * 120),
    duration: `${2 + Math.floor(i / 6)}:${(45 - i * 2 + 60) % 60 < 10 ? '0' : ''}${(45 - i * 2 + 60) % 60}`,
    date: `2026-0${1 + (i % 6)}-${10 + i}`,
    pct,
    rankColor: rankColorForPct(pct),
  };
});

export const PLAYER_PROFILE = {
  name: 'Sai Zu',
  guild: 'Vigil of Shadows [VoS]',
  region: 'North America',
  rating: 2847,
  ratingPct: 97,
  mainProfession: 'Mesmer',
  mainSpec: 'Chronomancer',
  consistency: 91,
  totalLogs: 1204,
  bestParses: ENCOUNTER_LEADERBOARD.slice(0, 6).map((r, i) => ({
    ...r,
    boss: BOSSES[i].name,
  })),
  professionBreakdown: [
    { profession: 'Mesmer', pct: 52 },
    { profession: 'Guardian', pct: 21 },
    { profession: 'Revenant', pct: 14 },
    { profession: 'Necromancer', pct: 13 },
  ],
  recent: ENCOUNTER_LEADERBOARD.slice(2, 9).map((r, i) => ({
    ...r,
    boss: BOSSES[(i + 3) % BOSSES.length].name,
    uploadedAgo: `${i + 1}h ago`,
  })),
};

export const GUILD_PROFILE = {
  name: 'Vigil of Shadows',
  tag: '[VoS]',
  region: 'North America',
  recruitment: 'Open — CM raid clears required',
  stats: [
    { label: 'Fastest Dhuum CM', value: '2:14', sub: 'World rank #12' },
    { label: 'Guild rating', value: '2,610', sub: 'Top 4% globally' },
    { label: 'Uploads this week', value: '183', sub: '+22% vs last week' },
    { label: 'Active members', value: '46', sub: 'of 60 roster' },
  ],
  roster: ENCOUNTER_LEADERBOARD.slice(0, 10).map((r, i) => ({
    ...r,
    role: ['Officer', 'Officer', 'Raid Lead', 'Member', 'Member', 'Member', 'Member', 'Member', 'Member', 'Member'][i],
    logsThisWeek: 24 - i,
  })),
  progression: BOSSES.filter((b) => b.cm).slice(0, 8).map((b, i) => ({
    boss: b.name,
    kills: 210 - i * 14,
    bestTime: `${2 + Math.floor(i / 3)}:${(30 + i * 3) % 60 < 10 ? '0' : ''}${(30 + i * 3) % 60}`,
  })),
};

export type UploadStatus = 'success' | 'parsing' | 'queued' | 'failed';

export interface UploadQueueItem {
  file: string;
  boss: string;
  status: UploadStatus;
  pct?: number;
  rankColor?: string;
  progress?: number;
  size: string;
  detail: string;
}

export const UPLOAD_QUEUE: UploadQueueItem[] = [
  { file: 'Dhuum_CM_kill_20260710.zevtc', boss: 'Dhuum', status: 'success', pct: 96, rankColor: rankColorForPct(96), size: '1.2 MB', detail: 'Parsed in 3.1s · rank 96%' },
  { file: 'Qadim_Peerless_wipe_20260710.zevtc', boss: 'Qadim the Peerless', status: 'parsing', progress: 64, size: '2.4 MB', detail: 'Extracting combat events…' },
  { file: 'raid_logs_wk28.zip', boss: '6 encounters', status: 'queued', size: '18.6 MB', detail: 'Waiting in queue — position 2' },
  { file: 'Samarog_attempt_09.zevtc', boss: 'Samarog', status: 'success', pct: 71, rankColor: rankColorForPct(71), size: '980 KB', detail: 'Parsed in 2.4s · rank 71%' },
  { file: 'corrupted_export.zevtc', boss: '—', status: 'failed', size: '412 KB', detail: 'Unrecognized file header — not a valid arcdps log' },
];

export const LOG_DETAIL = {
  boss: 'Dhuum',
  wing: 'Wing 4 — Bastion of the Penitent',
  duration: '2:31',
  date: '2026-07-10 21:14 UTC',
  success: true,
  squadDps: 214300,
  players: names.slice(0, 10).map((n, i) => {
    const profList = Object.keys(PROFESSIONS);
    const prof = profList[i % profList.length];
    const spec = PROFESSIONS[prof].specs[i % 3];
    const total = Math.round(26800 - i * 1450 + (i % 3) * 200);
    const power = Math.round(total * (0.35 + (i % 4) * 0.12));
    const condi = total - power;
    return {
      name: n,
      profession: prof,
      spec,
      color: PROFESSIONS[prof].color,
      subgroup: 1 + (i % 2),
      total,
      power,
      condi,
      powerPct: Math.round((power / total) * 100),
      condiPct: Math.round((condi / total) * 100),
      damageTaken: 4200 + i * 380,
      downs: i === 4 ? 1 : 0,
    };
  }),
};

export const BOON_UPTIMES = LOG_DETAIL.players.map((p, i) => ({
  name: p.name,
  spec: p.spec,
  color: p.color,
  subgroup: p.subgroup,
  quickness: [95, 88, 34, 22, 91, 40, 18, 65, 30, 12][i],
  alacrity: [30, 92, 25, 85, 20, 15, 88, 22, 60, 10][i],
  might: [25, 24, 22, 20, 25, 18, 21, 19, 23, 15][i],
  fury: [100, 98, 90, 85, 95, 80, 88, 92, 84, 70][i],
  protection: [70, 65, 55, 90, 60, 45, 50, 88, 40, 35][i],
  aegis: [12, 8, 20, 5, 15, 10, 6, 9, 4, 3][i],
  stability: [8, 5, 90, 4, 6, 3, 5, 85, 2, 1][i],
}));

export const MECHANICS = LOG_DETAIL.players.map((p, i) => ({
  name: p.name,
  spec: p.spec,
  color: p.color,
  subgroup: p.subgroup,
  shackled: [0, 1, 0, 0, 2, 0, 0, 0, 1, 0][i],
  greenHit: [0, 0, 1, 0, 0, 2, 0, 1, 0, 0][i],
  clawsHit: [0, 0, 0, 1, 0, 0, 0, 0, 0, 3][i],
  maxEnfeeble: [1, 2, 1, 3, 1, 2, 1, 1, 4, 2][i],
}));

export type FightEventType = 'info' | 'bad' | 'good';

export const FIGHT_EVENTS: { time: string; label: string; type: FightEventType }[] = [
  { time: '0:00', label: 'Fight start', type: 'info' },
  { time: '0:42', label: 'Enfeeble Stack applied to squad', type: 'info' },
  { time: '1:05', label: 'Aeris Nightsong hit by Deathly Claws', type: 'bad' },
  { time: '1:18', label: 'Green shackle soaked correctly', type: 'good' },
  { time: '1:40', label: 'Torin Blackwell soul-split (Shackled)', type: 'bad' },
  { time: '2:02', label: 'Green shackle dropped — no soak', type: 'bad' },
  { time: '2:14', label: 'Enfeeble Stack cleansed', type: 'good' },
  { time: '2:31', label: 'Boss defeated', type: 'info' },
];

export const SEARCH_RESULTS = {
  query: 'sai',
  players: ENCOUNTER_LEADERBOARD.slice(0, 4).map((r) => ({
    name: r.name, guild: r.guild, color: r.color, spec: r.spec, rating: 2847 - r.rank * 40, rankColor: r.rankColor,
  })),
  guilds: [
    { name: 'Vigil of Shadows', tag: '[VoS]', members: 46, rating: 2610 },
    { name: 'Saintly Crusaders', tag: '[Sai]', members: 22, rating: 1980 },
  ],
  bosses: BOSSES.slice(7, 10),
};

export const COMPARE_DATA = {
  playerA: { ...ENCOUNTER_LEADERBOARD[0], boss: 'Dhuum', build: 'Power Chronomancer' },
  playerB: { ...ENCOUNTER_LEADERBOARD[3], boss: 'Dhuum', build: 'Condi Virtuoso' },
  rows: [
    { label: 'DPS', a: '38,400', b: '35,550', aPct: 100, bPct: 92 },
    { label: 'Duration', a: '2:14', b: '2:19', aPct: 100, bPct: 96 },
    { label: 'Downstates', a: '0', b: '2', aPct: 100, bPct: 55 },
    { label: 'Quickness uptime', a: '94%', b: '81%', aPct: 100, bPct: 86 },
    { label: 'Alacrity uptime', a: '88%', b: '90%', aPct: 96, bPct: 100 },
    { label: 'Boon strips', a: '12', b: '4', aPct: 100, bPct: 33 },
    { label: 'Damage taken', a: '18,200', b: '31,400', aPct: 100, bPct: 58 },
  ],
};

// --- Encounter (hero banner) page supplementary content ---

export const HERO_STATS = [
  { label: 'Fastest kill', value: '2:14', sub: 'Sai Zu · Jun 2' },
  { label: 'Top DPS', value: '38,400', sub: 'Moira Ashfall' },
  { label: 'Clear rate', value: '61%', sub: '1,204 pulls logged' },
  { label: 'Most uploaded', value: '#3', sub: 'of all wing 6 bosses' },
];

export const PROFESSION_CHIPS = Object.keys(PROFESSIONS).map((k) => ({
  name: k,
  color: PROFESSIONS[k].color,
}));

export const CURRENT_ENCOUNTER = BOSSES.find((b) => b.name === 'Qadim the Peerless')!;
