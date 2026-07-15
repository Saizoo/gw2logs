export interface EncounterSummary {
  fightName: string;
  isCm: boolean;
  wing: string | null;
  logCount: number;
}

export interface EncounterStats {
  fastestKill: { durationMs: number; date: string } | null;
  topDps: { dps: number; name: string } | null;
  clearRate: number | null;
  totalLogs: number;
}

export interface LeaderboardRow {
  rank: number;
  pct: number;
  logId: string;
  name: string;
  account: string;
  profession: string;
  spec: string;
  dps: number;
  durationMs: number;
  date: string;
}

export interface PlayerProfile {
  account: string;
  displayName: string;
  totalLogs: number;
  overallScore: number | null;
  consistencyScore: number | null;
  professionBreakdown: { profession: string; pct: number }[];
  bestParses: { boss: string; isCm: boolean; spec: string; dps: number; logId: string }[];
  recent: { boss: string; isCm: boolean; spec: string; dps: number; logId: string; uploadedAt: string }[];
}

export interface LogDetailPlayer {
  name: string;
  profession: string;
  spec: string;
  subgroup: number;
  total: number;
  power: number;
  condi: number;
  powerPct: number;
  condiPct: number;
  damageTaken: number;
  downs: number;
  deaths: number;
  boons: Record<string, number>;
  mechanics: Record<string, number>;
}

export interface LogDetail {
  id: string;
  boss: string;
  wing: string | null;
  isCm: boolean;
  success: boolean;
  durationMs: number;
  squadDps: number;
  date: string;
  players: LogDetailPlayer[];
  mechanicEvents: { timeMs: number; name: string; actor: string | null }[];
}

export interface SearchResults {
  query: string;
  players: { account: string; displayName: string }[];
  bosses: { fightName: string; isCm: boolean; wing: string | null; logCount: number }[];
}

export interface CompareResult {
  playerA: { name: string; spec: string; boss: string };
  playerB: { name: string; spec: string; boss: string };
  rows: { label: string; a: number; b: number; aPct: number; bPct: number }[];
}

export interface UploadResult {
  jobId: string;
  logId?: string;
  status: 'success' | 'failed';
  error?: string;
}

export interface CurrentUser {
  id: string;
  discordId: string;
  discordUsername: string;
  discordAvatar: string | null;
  gw2AccountName: string | null;
  gw2LinkedAt: string | null;
  createdAt: string;
}

export interface LinkGw2Result {
  gw2AccountName: string;
  guildsSynced: boolean;
  guilds: { name: string; tag: string }[];
}

export interface GuildSummary {
  tag: string;
  name: string;
  memberCount: number;
}

export interface GuildRoster {
  tag: string;
  name: string;
  memberCount: number;
  roster: {
    account: string | null;
    displayName: string;
    isLeader: boolean;
    totalLogs: number;
    logsThisWeek: number;
    bestSpec: string | null;
  }[];
}

export interface DpsReportImportStart {
  batchId: string | null;
  total: number;
}

export interface DpsReportImportStatus {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  done: boolean;
  error?: string;
}

export interface HomeSummary {
  topByProfession: { profession: string; name: string; account: string; spec: string; dps: number; boss: string; logId: string }[];
  recentLogs: { id: string; boss: string; isCm: boolean; wing: string | null; squadDps: number; success: boolean; playerCount: number; uploadedAt: string }[];
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { credentials: 'include', ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? `Request failed (${res.status})`, res.status);
  }
  return res.json() as Promise<T>;
}

export const api = {
  stats: () => apiFetch<{ totalLogs: number; totalPlayers: number }>('/stats'),
  encounters: () => apiFetch<EncounterSummary[]>('/encounters'),
  leaderboard: (fightName: string, isCm: boolean, profession?: string) => {
    const params = new URLSearchParams({ cm: String(isCm) });
    if (profession) params.set('profession', profession);
    return apiFetch<LeaderboardRow[]>(`/encounters/${encodeURIComponent(fightName)}/leaderboard?${params}`);
  },
  encounterStats: (fightName: string, isCm: boolean) =>
    apiFetch<EncounterStats>(`/encounters/${encodeURIComponent(fightName)}/stats?cm=${isCm}`),
  player: (account: string) => apiFetch<PlayerProfile>(`/players/${encodeURIComponent(account)}`),
  log: (id: string) => apiFetch<LogDetail>(`/logs/${encodeURIComponent(id)}`),
  search: (q: string) => apiFetch<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
  compare: (logIdA: string, accountA: string, logIdB: string, accountB: string) =>
    apiFetch<CompareResult>(
      `/compare?logIdA=${encodeURIComponent(logIdA)}&accountA=${encodeURIComponent(accountA)}&logIdB=${encodeURIComponent(logIdB)}&accountB=${encodeURIComponent(accountB)}`,
    ),
  upload: async (file: File): Promise<UploadResult> => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/uploads', { method: 'POST', body: form });
    const body = await res.json();
    if (!res.ok) throw new ApiError(body.error ?? `Upload failed (${res.status})`, res.status);
    return body;
  },
  me: () => apiFetch<CurrentUser>('/auth/me'),
  logout: () => apiFetch<{ ok: true }>('/auth/logout', { method: 'POST' }),
  linkGw2: (apiKey: string) =>
    apiFetch<LinkGw2Result>('/account/link-gw2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    }),
  unlinkGw2: () => apiFetch<{ ok: true }>('/account/unlink-gw2', { method: 'POST' }),
  guilds: () => apiFetch<GuildSummary[]>('/guilds'),
  guildRoster: (tag: string) => apiFetch<GuildRoster>(`/guilds/${encodeURIComponent(tag)}`),
  importDpsReport: (userToken: string) =>
    apiFetch<DpsReportImportStart>('/account/import-dpsreport', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userToken }),
    }),
  importDpsReportStatus: (batchId: string) =>
    apiFetch<DpsReportImportStatus>(`/account/import-dpsreport/${encodeURIComponent(batchId)}`),
  home: () => apiFetch<HomeSummary>('/home'),
};

export { ApiError };
