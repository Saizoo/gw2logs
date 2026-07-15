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

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);
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
};

export { ApiError };
