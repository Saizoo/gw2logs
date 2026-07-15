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
  role: 'power' | 'condi';
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
  role: 'power' | 'condi';
  parsePct: number | null;
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

export interface DpsChartPoint {
  timeMs: number;
  dps: number;
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
  dpsChart: DpsChartPoint[] | null;
  players: LogDetailPlayer[];
  mechanicEvents: { timeMs: number; name: string; actor: string | null }[];
}

export interface LogListItem {
  id: string;
  boss: string;
  wing: string | null;
  category: 'raid' | 'other';
  isCm: boolean;
  success: boolean;
  durationMs: number;
  squadDps: number;
  playerCount: number;
  date: string;
  parsePct: number | null;
}

export interface DashboardSummary {
  displayName: string;
  gw2AccountName: string | null;
  guild: { id: string; tag: string; name: string } | null;
  stats: {
    logsThisWeek: number;
    logsThisWeekDelta: number;
    avgSquadDps: number;
    avgSquadDpsDelta: number;
    clearsThisWeek: number;
    totalThisWeek: number;
    guildRank: number | null;
  };
  weeklyActivity: { label: string; count: number }[];
  recentLogs: {
    logId: string;
    boss: string;
    wing: string | null;
    isCm: boolean;
    success: boolean;
    durationMs: number;
    dps: number;
    profession: string;
    uploadedAt: string;
  }[];
  guildActivity: { text: string; time: string }[];
}

export interface CompositionSummary {
  id: string;
  name: string;
  fightName: string | null;
  updatedAt: string;
  createdBy: string;
}

export interface CompositionSlotData {
  subgroup: number;
  slotIndex: number;
  role: string;
  profession: string;
  spec: string | null;
  buildName: string | null;
  buildDetails: string | null;
  buildId: string | null;
  characterId: string | null;
  characterName: string | null;
  characterTemplateId: string | null;
}

export interface CompositionDetail {
  id: string;
  name: string;
  fightName: string | null;
  groupId: string;
  groupName: string;
  createdBy: string;
  updatedAt: string;
  slots: CompositionSlotData[];
}

export interface GroupSummary {
  id: string;
  name: string;
  icon: string | null;
  background?: string | null;
  memberCount: number;
  leader?: string;
}

export interface GroupMemberData {
  userId: string;
  username: string;
  avatar: string | null;
  role: 'leader' | 'subleader' | 'member';
  joinedAt: string;
}

export interface GroupDetail {
  id: string;
  name: string;
  icon: string | null;
  background: string | null;
  leader: string;
  members: GroupMemberData[];
  myRole: 'leader' | 'subleader' | 'member' | null;
  canManage: boolean;
}

export interface GroupJoinRequest {
  userId: string;
  username: string;
  avatar: string | null;
  createdAt: string;
}

export interface RosterCharacter {
  id: string;
  name: string;
  profession: string;
  race: string | null;
  source: 'gw2' | 'manual';
  owner: string;
  templates: CharacterTemplateData[];
}

export interface CharacterTemplateData {
  id: string;
  tab: number;
  name: string | null;
  spec: string | null;
  isActive: boolean;
  assignedBuildId: string | null;
}

export interface CharacterData {
  id: string;
  name: string;
  profession: string;
  race: string | null;
  source: 'gw2' | 'manual';
  activeTab: number;
  templates: CharacterTemplateData[];
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
  leaderboard: (fightName: string, isCm: boolean, opts: { profession?: string; role?: 'power' | 'condi' } = {}) => {
    const params = new URLSearchParams({ cm: String(isCm) });
    if (opts.profession) params.set('profession', opts.profession);
    if (opts.role) params.set('role', opts.role);
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
  dashboard: () => apiFetch<DashboardSummary>('/dashboard'),
  logs: (params: { category?: 'raid' | 'other'; killsOnly?: boolean; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set('category', params.category);
    if (params.killsOnly) qs.set('killsOnly', 'true');
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.offset) qs.set('offset', String(params.offset));
    const query = qs.toString();
    return apiFetch<LogListItem[]>(`/logs${query ? `?${query}` : ''}`);
  },
  compositions: (groupId: string) =>
    apiFetch<CompositionSummary[]>(`/compositions?groupId=${encodeURIComponent(groupId)}`),
  composition: (id: string) => apiFetch<CompositionDetail>(`/compositions/${encodeURIComponent(id)}`),
  createComposition: (groupId: string, name: string, fightName?: string | null) =>
    apiFetch<{ id: string }>('/compositions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, name, fightName }),
    }),
  deleteComposition: (id: string) => apiFetch<{ ok: true }>(`/compositions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  setCompositionSlot: (
    id: string,
    subgroup: number,
    slotIndex: number,
    data: {
      role: string;
      profession: string;
      spec?: string | null;
      buildName?: string | null;
      buildDetails?: string | null;
      buildId?: string | null;
      characterId?: string | null;
      characterTemplateId?: string | null;
    },
  ) =>
    apiFetch<{ ok: true }>(`/compositions/${encodeURIComponent(id)}/slots/${subgroup}/${slotIndex}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  clearCompositionSlot: (id: string, subgroup: number, slotIndex: number) =>
    apiFetch<{ ok: true }>(`/compositions/${encodeURIComponent(id)}/slots/${subgroup}/${slotIndex}`, { method: 'DELETE' }),

  // --- Groups ---
  myGroups: () => apiFetch<GroupSummary[]>('/groups'),
  searchGroups: (search: string) => apiFetch<GroupSummary[]>(`/groups?search=${encodeURIComponent(search)}`),
  group: (id: string) => apiFetch<GroupDetail>(`/groups/${encodeURIComponent(id)}`),
  createGroup: (name: string) =>
    apiFetch<{ id: string }>('/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
  updateGroup: (id: string, data: { name?: string; icon?: string | null; background?: string | null }) =>
    apiFetch<{ ok: true }>(`/groups/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  deleteGroup: (id: string) => apiFetch<{ ok: true }>(`/groups/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  groupRoster: (id: string) => apiFetch<RosterCharacter[]>(`/groups/${encodeURIComponent(id)}/roster`),
  requestToJoinGroup: (id: string) => apiFetch<{ ok: true }>(`/groups/${encodeURIComponent(id)}/join-requests`, { method: 'POST' }),
  groupJoinRequests: (id: string) => apiFetch<GroupJoinRequest[]>(`/groups/${encodeURIComponent(id)}/join-requests`),
  approveJoinRequest: (id: string, userId: string) =>
    apiFetch<{ ok: true }>(`/groups/${encodeURIComponent(id)}/join-requests/${encodeURIComponent(userId)}/approve`, { method: 'POST' }),
  denyJoinRequest: (id: string, userId: string) =>
    apiFetch<{ ok: true }>(`/groups/${encodeURIComponent(id)}/join-requests/${encodeURIComponent(userId)}/deny`, { method: 'POST' }),
  inviteToGroup: (id: string, username: string) =>
    apiFetch<{ ok: true }>(`/groups/${encodeURIComponent(id)}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    }),
  setGroupMemberRole: (id: string, userId: string, action: 'promote' | 'demote' | 'makeleader') =>
    apiFetch<{ ok: true }>(`/groups/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }),
  removeGroupMember: (id: string, userId: string) =>
    apiFetch<{ ok: true }>(`/groups/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' }),

  // --- Characters ---
  myCharacters: () => apiFetch<CharacterData[]>('/characters'),
  addCharacter: (name: string, profession: string, race?: string | null) =>
    apiFetch<{ id: string }>('/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, profession, race }),
    }),
  deleteCharacter: (id: string) => apiFetch<{ ok: true }>(`/characters/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  assignCharacterBuild: (characterId: string, tab: number, assignedBuildId: string | null) =>
    apiFetch<{ ok: true }>(`/characters/${encodeURIComponent(characterId)}/templates/${tab}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedBuildId }),
    }),
  syncCharacters: () => apiFetch<{ ok: true; count: number }>('/characters/sync', { method: 'POST' }),
};

export { ApiError };
