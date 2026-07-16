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

export interface OverviewRecentLog {
  id: string;
  isCm: boolean;
  success: boolean;
  squadDps: number;
  durationMs: number;
  date: string;
}

export interface OverviewEncounter {
  fightName: string;
  hasCm: boolean;
  logCount: number;
  kills: number;
  bestSquadDps: number;
  fastestKillMs: number | null;
  lastDate: string;
  recent: OverviewRecentLog[];
}

export interface OverviewWing {
  wing: string;
  encounters: OverviewEncounter[];
}

export interface SpecBenchmark {
  rank: number;
  logId: string;
  name: string;
  account: string;
  profession: string;
  spec: string;
  dps: number;
  role: 'power' | 'condi';
  squadRole: SquadRole;
  fightName: string;
  isCm: boolean;
  date: string;
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
  squadRole: SquadRole;
  durationMs: number;
  date: string;
}

// Boon-support/healer classification, distinct from the power/condi
// damage-type split — computed server-side from subgroup boon generation
// and (when available) real healing output, never from DPS magnitude.
export type SquadRole = 'dps' | 'boon_dps' | 'boon_heal';

export interface PlayerProfile {
  account: string;
  totalLogs: number;
  overallScore: number | null;
  consistencyScore: number | null;
  professionBreakdown: { profession: string; pct: number }[];
  bestParses: { boss: string; isCm: boolean; spec: string; dps: number; pct: number; logId: string }[];
  recent: { boss: string; isCm: boolean; spec: string; dps: number; success: boolean; logId: string; uploadedAt: string }[];
}

export interface LogDetailPlayer {
  name: string;
  account: string;
  profession: string;
  spec: string;
  subgroup: number;
  role: 'power' | 'condi';
  squadRole: SquadRole;
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
  uploadedBy: { username: string } | null;
  canClaim: boolean;
  group: { id: string; name: string } | null;
  players: LogDetailPlayer[];
  // severity is "Sev0".."Sev4" straight from Elite Insights, or null when
  // EI itself didn't set one — never guessed client-side.
  mechanicEvents: { timeMs: number; name: string; actor: string | null; severity: string | null }[];
  // From EI's own per-death recap (JsonPlayer.DeathRecap) — killedBy is the
  // resolved display name of whatever dealt the killing hit, already
  // human-readable from EI, not a raw skill/actor id.
  deathEvents: { timeMs: number; actor: string; killedBy: string | null }[];
}

export interface LogListItem {
  id: string;
  boss: string;
  wing: string | null;
  category: 'raid' | 'fractal' | 'other';
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
  stats: {
    logsThisWeek: number;
    logsThisWeekDelta: number;
    avgSquadDps: number;
    avgSquadDpsDelta: number;
    clearsThisWeek: number;
    totalThisWeek: number;
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
  pendingRequestCount?: number;
  raidDays?: string[];
  raidStartTime?: string | null;
  raidDurationMins?: number | null;
  raidTimezone?: string | null;
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
  raidDays: string[];
  raidStartTime: string | null;
  raidDurationMins: number | null;
  raidTimezone: string | null;
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
  players: { account: string }[];
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
  isAdmin: boolean;
  pendingGroupRequests: number;
}

export interface Build {
  id: string;
  profession: string;
  category: string;
  name: string;
  weapons: string;
  url: string;
}

export interface AdminBuild extends Build {
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOverview {
  totalLogs: number;
  totalUsers: number;
  totalPlayers: number;
  totalGroups: number;
  totalBuilds: number;
  failedUploadsThisWeek: number;
  recentUploadJobs: AdminUploadJob[];
}

export interface AdminUploadJob {
  id: string;
  status: string;
  fileName: string;
  fileSizeByte: number;
  errorMessage: string | null;
  logId: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminLogRow {
  id: string;
  boss: string;
  isCm: boolean;
  success: boolean;
  squadDps: number;
  durationMs: number;
  uploadedAt: string;
  sourceFileName: string | null;
  playerCount: number;
}

export interface AdminUserRow {
  id: string;
  discordUsername: string;
  discordAvatar: string | null;
  gw2AccountName: string | null;
  linkedPlayerAccount: string | null;
  isAdmin: boolean;
  createdAt: string;
}

export interface AdminGroupRow {
  id: string;
  name: string;
  leader: string;
  createdAt: string;
  memberCount: number;
  compositionCount: number;
}

export interface LinkGw2Result {
  gw2AccountName: string;
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
  encountersOverview: () => apiFetch<OverviewWing[]>('/encounters/overview'),
  specBenchmarks: () => apiFetch<SpecBenchmark[]>('/encounters/benchmarks'),
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
  claimLog: (id: string) => apiFetch<{ ok: true }>(`/logs/${encodeURIComponent(id)}/claim`, { method: 'POST' }),
  search: (q: string) => apiFetch<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
  compare: (logIdA: string, accountA: string, logIdB: string, accountB: string) =>
    apiFetch<CompareResult>(
      `/compare?logIdA=${encodeURIComponent(logIdA)}&accountA=${encodeURIComponent(accountA)}&logIdB=${encodeURIComponent(logIdB)}&accountB=${encodeURIComponent(accountB)}`,
    ),
  upload: async (file: File, groupId?: string): Promise<UploadResult> => {
    const form = new FormData();
    form.append('file', file);
    if (groupId) form.append('groupId', groupId);
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
  logs: (
    params: {
      category?: 'raid' | 'fractal';
      killsOnly?: boolean;
      mine?: boolean;
      groupId?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set('category', params.category);
    if (params.killsOnly) qs.set('killsOnly', 'true');
    if (params.mine) qs.set('mine', 'true');
    if (params.groupId) qs.set('groupId', params.groupId);
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
  myGroups: () => apiFetch<GroupSummary[]>('/groups?mine=true'),
  searchGroups: (search: string, opts: { days?: string[]; sort?: 'members' | 'newest' | 'name' } = {}) => {
    const qs = new URLSearchParams();
    if (search) qs.set('search', search);
    if (opts.days?.length) qs.set('day', opts.days.join(','));
    if (opts.sort) qs.set('sort', opts.sort);
    return apiFetch<GroupSummary[]>(`/groups?${qs}`);
  },
  group: (id: string) => apiFetch<GroupDetail>(`/groups/${encodeURIComponent(id)}`),
  createGroup: (name: string) =>
    apiFetch<{ id: string }>('/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
  updateGroup: (
    id: string,
    data: {
      name?: string;
      icon?: string | null;
      background?: string | null;
      raidDays?: string[];
      raidStartTime?: string | null;
      raidDurationMins?: number | null;
      raidTimezone?: string | null;
    },
  ) =>
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

  // --- Build catalog ---
  builds: () => apiFetch<Build[]>('/builds'),

  // --- Admin ---
  adminOverview: () => apiFetch<AdminOverview>('/admin/overview'),
  adminUploadJobs: (params: { status?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.offset) qs.set('offset', String(params.offset));
    const query = qs.toString();
    return apiFetch<{ total: number; jobs: AdminUploadJob[] }>(`/admin/uploads${query ? `?${query}` : ''}`);
  },
  adminLogs: (params: { search?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.offset) qs.set('offset', String(params.offset));
    const query = qs.toString();
    return apiFetch<{ total: number; logs: AdminLogRow[] }>(`/admin/logs${query ? `?${query}` : ''}`);
  },
  adminDeleteLog: (id: string) => apiFetch<{ ok: true }>(`/admin/logs/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  adminUsers: (params: { search?: string; limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.offset) qs.set('offset', String(params.offset));
    const query = qs.toString();
    return apiFetch<{ total: number; users: AdminUserRow[] }>(`/admin/users${query ? `?${query}` : ''}`);
  },
  adminSetUserAdmin: (id: string, isAdmin: boolean) =>
    apiFetch<{ id: string; isAdmin: boolean }>(`/admin/users/${encodeURIComponent(id)}/admin`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAdmin }),
    }),
  adminForceLogout: (id: string) =>
    apiFetch<{ ok: true; sessionsRevoked: number }>(`/admin/users/${encodeURIComponent(id)}/logout`, { method: 'POST' }),
  adminGroups: () => apiFetch<AdminGroupRow[]>('/admin/groups'),
  adminDeleteGroup: (id: string) => apiFetch<{ ok: true }>(`/admin/groups/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  adminBuilds: () => apiFetch<AdminBuild[]>('/admin/builds'),
  adminCreateBuild: (data: { profession: string; category: string; name: string; weapons: string; url: string }) =>
    apiFetch<AdminBuild>('/admin/builds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  adminUpdateBuild: (id: string, data: { profession: string; category: string; name: string; weapons: string; url: string }) =>
    apiFetch<AdminBuild>(`/admin/builds/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  adminDeleteBuild: (id: string) =>
    apiFetch<{ ok: true; referencedSlots: number }>(`/admin/builds/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export { ApiError };
