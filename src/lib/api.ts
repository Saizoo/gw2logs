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

export interface OverviewTopParse {
  dps: number;
  pct: number;
  spec: string;
  profession: string;
  account: string;
}

export interface OverviewRecentLog {
  id: string;
  isCm: boolean;
  success: boolean;
  squadDps: number;
  durationMs: number;
  date: string;
  topParse: OverviewTopParse | null;
}

export interface OverviewBestParse {
  logId: string;
  dps: number;
  spec: string;
  profession: string;
  account: string;
  isCm: boolean;
}

export interface OverviewEncounter {
  fightName: string;
  // A CM clear (kill) has been logged — drives the card's "CM" badge.
  hasCmClear: boolean;
  logCount: number;
  kills: number;
  bestSquadDps: number;
  fastestKillMs: number | null;
  lastDate: string;
  recent: OverviewRecentLog[];
  bestParse: OverviewBestParse | null;
}

export interface SpecDistribution {
  spec: string;
  profession: string;
  count: number;
  min: number;
  p5: number;
  q1: number;
  median: number;
  q3: number;
  p95: number;
  max: number;
  best: {
    logId: string;
    dps: number;
    name: string;
    account: string;
    fightName: string;
    isCm: boolean;
    date: string;
  } | null;
}

export interface Announcement {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  expiresAt: string | null;
}

export interface AdminAnnouncement extends Announcement {
  createdAt: string;
  createdBy: string;
  expired: boolean;
}

export interface AppSettings {
  uploadsPaused: string;
  inviteOnly: string;
  defaultReminderMins: string;
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
  // Null when the player hid their name — render as plain text, no link.
  account: string | null;
  hidden?: boolean;
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

export interface PlayerCoverageEncounter {
  boss: string;
  killed: boolean;
  attempted: boolean;
  bestPct: number | null;
}

export interface PlayerAffiliations {
  guild: { id: string; name: string; tag: string } | null;
  groups: { id: string; name: string; role: string; isGuildGroup: boolean; guildRank: string | null }[];
}

// Returned instead of PlayerProfile when the target's profile is private
// and the viewer isn't the owner/an admin.
export interface PlayerPrivateProfile {
  account: string;
  private: true;
}

export interface PlayerProfile {
  account: string;
  private?: false;
  totalLogs: number;
  overallScore: number | null;
  consistencyScore: number | null;
  // Chosen profile icon (spec/profession name), or null for the auto default.
  profileIcon: string | null;
  affiliations: PlayerAffiliations | null;
  record: { kills: number; wipes: number; total: number; successRate: number };
  roleBreakdown: { role: string; count: number; pct: number }[];
  specBreakdown: { spec: string; profession: string; count: number; pct: number }[];
  specPerformance: { spec: string; profession: string; plays: number; avgPct: number; bestPct: number; bestLogId: string }[];
  coverage: { wing: string; killed: number; total: number; encounters: PlayerCoverageEncounter[] }[];
  professionBreakdown: { profession: string; pct: number }[];
  bestParses: { boss: string; isCm: boolean; spec: string; dps: number; pct: number; logId: string }[];
  recent: { boss: string; isCm: boolean; spec: string; dps: number; success: boolean; logId: string; uploadedAt: string }[];
}

export interface LogDetailPlayer {
  name: string;
  // Null when the player hid their name — render as plain text, no link.
  account: string | null;
  hidden?: boolean;
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
  // Hidden from the public browse surfaces; only the uploader, admins, and the
  // log's group can open it.
  private: boolean;
  // Whether the viewer may toggle privacy / delete / reassign this log.
  canManage: boolean;
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

export interface WeekPlanSlot {
  subgroup: number;
  slotIndex: number;
  role: string;
  profession: string;
  spec: string | null;
  buildName: string | null;
  characterName: string | null;
  // Display identity of whoever owns the slotted character (account name,
  // falling back to Discord username) — null for template-only slots.
  player: string | null;
}

export interface WeekPlanComposition {
  id: string;
  name: string;
  fightName: string | null;
  slots: WeekPlanSlot[];
}

export interface WeekPlanItem {
  id: string;
  // Weekday short name ("Mon".."Sun") the fight is scheduled on; null for
  // fights not pinned to a day.
  day: string | null;
  order: number;
  encounterName: string;
  note: string | null;
  composition: WeekPlanComposition | null;
}

export interface GroupRaidStatus {
  groupId: string;
  name: string;
  nextRaidDate: string | null;
  nextRaidDay: string | null;
  raidStartTime: string | null;
  raidTimezone: string | null;
  resolvedTimezone: string;
  myStatus: SignupStatus | null;
  fights: string[];
  totalPlannedThisWeek: number;
}

export interface GroupWeekPlan {
  weekStart: string;
  canEdit: boolean;
  items: WeekPlanItem[];
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

export interface GuildRef {
  id: string;
  name: string;
  tag: string;
}

export interface GroupSummary {
  id: string;
  name: string;
  icon: string | null;
  // Present on auto-created guild groups only (mine list) — the marker
  // that separates them from hand-made statics.
  guild?: GuildRef | null;
  background?: string | null;
  memberCount: number;
  leader?: string;
  pendingRequestCount?: number;
  raidDays?: string[];
  raidStartTime?: string | null;
  raidDurationMins?: number | null;
  raidTimezone?: string | null;
  // Present on the browse/search list only: a rolling 7-day log histogram
  // (oldest day first) and its total, powering the browse-row activity spark.
  activity?: number[];
  logsThisWeek?: number;
  // Present on the browse/search list only (for a signed-in viewer): whether
  // they already belong to this group or have an outstanding join request —
  // drives the join button's three states.
  isMember?: boolean;
  requestPending?: boolean;
}

export interface GroupMemberData {
  userId: string;
  username: string;
  // In-game guild rank name, stamped by rank sync on guild groups.
  guildRank: string | null;
  // GW2 account name (Name.1234) — the primary display identity. Null when
  // the member hasn't linked their GW2 API key; fall back to `username`.
  account: string | null;
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
  guild: (GuildRef & { lastRankSyncAt: string | null }) | null;
  members: GroupMemberData[];
  raidDays: string[];
  raidStartTime: string | null;
  raidDurationMins: number | null;
  raidTimezone: string | null;
  // A second recurring schedule for fractal nights, same shape as the raid
  // one; empty by default.
  fractalDays: string[];
  fractalStartTime: string | null;
  fractalDurationMins: number | null;
  fractalTimezone: string | null;
  // IANA zone resolved server-side from the free-text raidTimezone; used
  // to compute raid-night dates on the group's calendar.
  resolvedTimezone: string;
  myRole: 'leader' | 'subleader' | 'member' | null;
  // For a signed-in non-member: whether they have an outstanding join request.
  myRequestPending: boolean;
  canManage: boolean;
}

export interface GroupJoinRequest {
  userId: string;
  username: string;
  account: string | null;
  avatar: string | null;
  createdAt: string;
}

export interface GroupClearEncounter {
  fightName: string;
  killedThisWeek: boolean;
  cmThisWeek: boolean;
  lastKill: { logId: string; date: string; isCm: boolean } | null;
}

export interface GroupClears {
  weekStart: string;
  wings: { wing: string; encounters: GroupClearEncounter[] }[];
}

export type SignupStatus = 'in' | 'late' | 'out';

export interface RaidSignup {
  userId: string;
  date: string; // YYYY-MM-DD
  status: SignupStatus;
}

export interface AttendanceNight {
  date: string; // YYYY-MM-DD in the group's timezone
  logCount: number;
  kills: number;
  attended: string[]; // userIds seen in that night's logs
  signups: Record<string, SignupStatus>;
}

export interface GroupAttendance {
  members: { userId: string; name: string; linked: boolean }[];
  nights: AttendanceNight[];
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

export interface CompareParse {
  name: string;
  account: string;
  spec: string;
  profession: string;
  logId: string;
  parsePct: number;
  dps: number;
  powerDps: number;
  condiDps: number;
  duration: number;
  downs: number;
  deaths: number;
  damageTaken: number;
}

export interface CompareRow {
  label: string;
  a: number;
  b: number;
  aPct: number;
  bPct: number;
  lowerIsBetter: boolean;
  winner: 'a' | 'b' | 'tie';
}

export interface CompareResult {
  boss: { fightName: string; isCm: boolean };
  // Null when the chosen player has no matching parse (best-parse mode).
  playerA: CompareParse | null;
  playerB: CompareParse | null;
  rows: CompareRow[];
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
  // Null until the first-login tour has been completed or skipped.
  onboardedAt: string | null;
  displayedGuildId: string | null;
  // Privacy toggles.
  hideName: boolean;
  privateProfile: boolean;
  // Chosen profile icon (spec/profession name), or null for the auto default.
  profileIcon: string | null;
  pendingGroupRequests: number;
}

export interface ApiTokenSummary {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
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
  suspendedAt: string | null;
  createdAt: string;
}

export interface AdminUserDetail {
  id: string;
  discordUsername: string;
  discordAvatar: string | null;
  gw2AccountName: string | null;
  gw2LinkedAt: string | null;
  isAdmin: boolean;
  suspendedAt: string | null;
  createdAt: string;
  displayedGuild: { name: string; tag: string } | null;
  counts: { uploads: number; characters: number; sessions: number };
  groups: { id: string; name: string; role: string; isGuild: boolean }[];
  recentLogs: { id: string; fightName: string; isCm: boolean; success: boolean; uploadedAt: string }[];
}

export interface AdminHealth {
  database: { size: string; tables: { name: string; size: string; deadTuples: number }[] };
  parseQueue: { active: number; queued: number };
  uploadJobs: Record<string, number>;
  topFailures: { message: string; count: number }[];
  stuckJobs: { id: string; fileName: string; createdAt: string }[];
  stuckThresholdMinutes: number;
  reminders: { sentLast7Days: number; lastSentAt: string | null };
}

export interface AdminGuildRow {
  id: string;
  name: string;
  tag: string;
  createdAt: string;
  lastRankSyncAt: string | null;
  syncKeyHolder: string | null;
  displayedByCount: number;
  group: { id: string; name: string; memberCount: number } | null;
}

export interface AdminAuditEntry {
  id: string;
  admin: string;
  action: string;
  targetType: string;
  targetId: string | null;
  detail: Record<string, unknown> | null;
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
  topByProfession: { profession: string; name: string; account: string | null; hidden?: boolean; spec: string; dps: number; boss: string; logId: string }[];
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

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  groupId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface IncomingInvite {
  id: string;
  createdAt: string;
  group: { id: string; name: string };
  invitedBy: string;
}

export const api = {
  stats: () => apiFetch<{ totalLogs: number; totalPlayers: number }>('/stats'),
  encounters: () => apiFetch<EncounterSummary[]>('/encounters'),
  encountersOverview: () => apiFetch<OverviewWing[]>('/encounters/overview'),
  specBenchmarks: () => apiFetch<SpecBenchmark[]>('/encounters/benchmarks'),
  // Optional scope: a single boss, or a whole wing (bosses combined), and/or
  // a challenge-mode filter. No opts = the global distribution.
  specBenchmarkDistribution: (opts: { boss?: string; wing?: string; cm?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (opts.boss) qs.set('boss', opts.boss);
    if (opts.wing) qs.set('wing', opts.wing);
    if (opts.cm !== undefined) qs.set('cm', String(opts.cm));
    const query = qs.toString();
    return apiFetch<SpecDistribution[]>(`/encounters/benchmarks/distribution${query ? `?${query}` : ''}`);
  },
  activeAnnouncements: () => apiFetch<Announcement[]>('/announcements/active'),
  leaderboard: (
    fightName: string,
    isCm: boolean,
    opts: { profession?: string; role?: 'power' | 'condi'; squadRole?: 'dps' | 'boon_dps' | 'boon_heal' } = {},
  ) => {
    const params = new URLSearchParams({ cm: String(isCm) });
    if (opts.profession) params.set('profession', opts.profession);
    if (opts.role) params.set('role', opts.role);
    if (opts.squadRole) params.set('squadRole', opts.squadRole);
    return apiFetch<LeaderboardRow[]>(`/encounters/${encodeURIComponent(fightName)}/leaderboard?${params}`);
  },
  encounterStats: (fightName: string, isCm: boolean) =>
    apiFetch<EncounterStats>(`/encounters/${encodeURIComponent(fightName)}/stats?cm=${isCm}`),
  player: (account: string) => apiFetch<PlayerProfile | PlayerPrivateProfile>(`/players/${encodeURIComponent(account)}`),
  log: (id: string) => apiFetch<LogDetail>(`/logs/${encodeURIComponent(id)}`),
  claimLog: (id: string) => apiFetch<{ ok: true }>(`/logs/${encodeURIComponent(id)}/claim`, { method: 'POST' }),
  search: (q: string) => apiFetch<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
  // Two modes: pass logIdA/logIdB to compare two specific parses (the compare
  // picker's flow), or a fightName (+cm) to compare each player's best clear.
  compare: (p: { accountA: string; accountB: string; logIdA?: string; logIdB?: string; fightName?: string; isCm?: boolean }) => {
    const q = new URLSearchParams({ accountA: p.accountA, accountB: p.accountB });
    if (p.logIdA && p.logIdB) { q.set('logIdA', p.logIdA); q.set('logIdB', p.logIdB); }
    if (p.fightName) { q.set('fightName', p.fightName); q.set('cm', String(p.isCm ?? false)); }
    return apiFetch<CompareResult>(`/compare?${q}`);
  },
  upload: async (file: File, opts: { groupId?: string; private?: boolean } = {}): Promise<UploadResult> => {
    const form = new FormData();
    form.append('file', file);
    if (opts.groupId) form.append('groupId', opts.groupId);
    if (opts.private) form.append('private', 'true');
    const res = await fetch('/api/uploads', { method: 'POST', body: form });
    const body = await res.json();
    if (!res.ok) throw new ApiError(body.error ?? `Upload failed (${res.status})`, res.status);
    return body;
  },
  // --- Log management (uploader/admin) ---
  setLogPrivacy: (id: string, isPrivate: boolean) =>
    apiFetch<{ ok: true; private: boolean }>(`/logs/${encodeURIComponent(id)}/privacy`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ private: isPrivate }),
    }),
  deleteLog: (id: string) => apiFetch<{ ok: true }>(`/logs/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  assignLogGroup: (id: string, groupId: string | null) =>
    apiFetch<{ ok: true; groupId: string | null }>(`/logs/${encodeURIComponent(id)}/group`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId }),
    }),
  me: () => apiFetch<CurrentUser>('/auth/me'),
  logout: () => apiFetch<{ ok: true }>('/auth/logout', { method: 'POST' }),
  linkGw2: (apiKey: string) =>
    apiFetch<LinkGw2Result>('/account/link-gw2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    }),
  unlinkGw2: () => apiFetch<{ ok: true }>('/account/unlink-gw2', { method: 'POST' }),
  completeOnboarding: () => apiFetch<{ ok: true }>('/account/onboarding-complete', { method: 'POST' }),
  // Personal access tokens for the desktop / Nexus addon. createApiToken
  // returns the raw token exactly once — it's never retrievable again.
  listApiTokens: () => apiFetch<ApiTokenSummary[]>('/tokens'),
  createApiToken: (name: string) =>
    apiFetch<{ id: string; name: string; token: string }>('/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
  revokeApiToken: (id: string) => apiFetch<{ ok: true }>(`/tokens/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  updatePrivacy: (data: { hideName?: boolean; privateProfile?: boolean }) =>
    apiFetch<{ hideName: boolean; privateProfile: boolean }>('/account/privacy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  updateProfileIcon: (profileIcon: string | null) =>
    apiFetch<{ profileIcon: string | null }>('/account/profile-icon', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileIcon }),
    }),
  accountGuilds: () =>
    apiFetch<{ displayedGuildId: string | null; guilds: (GuildRef & { isLeader: boolean | null })[] }>('/account/guilds'),
  setDisplayGuild: (guildId: string | null) =>
    apiFetch<{ displayedGuild: (GuildRef & { groupId: string }) | null }>('/account/display-guild', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId }),
    }),
  syncGuildRanks: (groupId: string) =>
    apiFetch<{ ok: true; matched: number; updated: number; leaderAccount: string | null }>(
      `/groups/${encodeURIComponent(groupId)}/sync-guild-ranks`,
      { method: 'POST' },
    ),
  importDpsReport: (userToken: string) =>
    apiFetch<DpsReportImportStart>('/account/import-dpsreport', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userToken }),
    }),
  importDpsReportStatus: (batchId: string) =>
    apiFetch<DpsReportImportStatus>(`/account/import-dpsreport/${encodeURIComponent(batchId)}`),
  home: () => apiFetch<HomeSummary>('/home'),
  // Sends the browser's IANA zone so the weekly-activity bars bucket on
  // the viewer's calendar days instead of UTC.
  dashboard: () =>
    apiFetch<DashboardSummary>(`/dashboard?tz=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC')}`),
  logs: (
    params: {
      category?: 'raid' | 'fractal';
      killsOnly?: boolean;
      mine?: boolean;
      groupId?: string;
      boss?: string;
      wing?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) => {
    const qs = new URLSearchParams();
    if (params.category) qs.set('category', params.category);
    if (params.killsOnly) qs.set('killsOnly', 'true');
    if (params.mine) qs.set('mine', 'true');
    if (params.groupId) qs.set('groupId', params.groupId);
    if (params.boss) qs.set('boss', params.boss);
    if (params.wing) qs.set('wing', params.wing);
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
      characterName?: string | null;
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
      fractalDays?: string[];
      fractalStartTime?: string | null;
      fractalDurationMins?: number | null;
      fractalTimezone?: string | null;
    },
  ) =>
    apiFetch<{ ok: true }>(`/groups/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  deleteGroup: (id: string) => apiFetch<{ ok: true }>(`/groups/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  groupRoster: (id: string) => apiFetch<RosterCharacter[]>(`/groups/${encodeURIComponent(id)}/roster`),
  groupClears: (id: string) => apiFetch<GroupClears>(`/groups/${encodeURIComponent(id)}/clears`),
  groupAttendance: (id: string) => apiFetch<GroupAttendance>(`/groups/${encodeURIComponent(id)}/attendance`),
  groupSignups: (id: string) => apiFetch<RaidSignup[]>(`/groups/${encodeURIComponent(id)}/signups`),
  groupRaidStatus: () => apiFetch<GroupRaidStatus[]>('/groups/raid-status'),
  groupWeekPlan: (id: string) => apiFetch<GroupWeekPlan>(`/groups/${encodeURIComponent(id)}/week-plan`),
  setGroupWeekPlan: (id: string, items: { day?: string | null; encounterName: string; compositionId?: string | null; note?: string | null }[]) =>
    apiFetch<GroupWeekPlan>(`/groups/${encodeURIComponent(id)}/week-plan`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    }),
  groupReminders: (id: string) =>
    apiFetch<{ webhookConfigured: boolean; reminderMins: number; webhookEvents: string[] }>(`/groups/${encodeURIComponent(id)}/reminders`),
  setGroupReminders: (id: string, data: { webhookUrl?: string | null; reminderMins?: number; webhookEvents?: string[] }) =>
    apiFetch<{ ok: true }>(`/groups/${encodeURIComponent(id)}/reminders`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  testGroupReminder: (id: string) =>
    apiFetch<{ ok: true }>(`/groups/${encodeURIComponent(id)}/reminders/test`, { method: 'POST' }),
  setSignup: (id: string, date: string, status: SignupStatus | null) =>
    apiFetch<{ ok: true }>(`/groups/${encodeURIComponent(id)}/signups`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, status }),
    }),
  requestToJoinGroup: (id: string) => apiFetch<{ ok: true }>(`/groups/${encodeURIComponent(id)}/join-requests`, { method: 'POST' }),
  groupJoinRequests: (id: string) => apiFetch<GroupJoinRequest[]>(`/groups/${encodeURIComponent(id)}/join-requests`),
  approveJoinRequest: (id: string, userId: string) =>
    apiFetch<{ ok: true }>(`/groups/${encodeURIComponent(id)}/join-requests/${encodeURIComponent(userId)}/approve`, { method: 'POST' }),
  denyJoinRequest: (id: string, userId: string) =>
    apiFetch<{ ok: true }>(`/groups/${encodeURIComponent(id)}/join-requests/${encodeURIComponent(userId)}/deny`, { method: 'POST' }),
  // Immediately add someone to the group (leader/subleader shortcut). The
  // interactive invite flow that the recipient accepts is inviteToGroup below.
  addGroupMember: (id: string, username: string) =>
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
  inviteToGroup: (id: string, username: string) =>
    apiFetch<{ ok: true; delivered: boolean; pendingSignup?: boolean }>(`/groups/${encodeURIComponent(id)}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    }),

  // --- Notifications ---
  notifications: () => apiFetch<{ items: AppNotification[]; unreadCount: number }>('/notifications'),
  markNotificationRead: (id: string) => apiFetch<{ ok: true }>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => apiFetch<{ ok: true }>('/notifications/read-all', { method: 'POST' }),

  // --- Invites (recipient side) ---
  myInvites: () => apiFetch<IncomingInvite[]>('/invites'),
  acceptInvite: (id: string) => apiFetch<{ ok: true; groupId: string }>(`/invites/${encodeURIComponent(id)}/accept`, { method: 'POST' }),
  declineInvite: (id: string) => apiFetch<{ ok: true }>(`/invites/${encodeURIComponent(id)}/decline`, { method: 'POST' }),

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
  adminUserDetail: (id: string) => apiFetch<AdminUserDetail>(`/admin/users/${encodeURIComponent(id)}/detail`),
  adminSetUserSuspended: (id: string, suspended: boolean) =>
    apiFetch<{ id: string; suspendedAt: string | null }>(`/admin/users/${encodeURIComponent(id)}/suspend`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspended }),
    }),
  adminUnlinkUserGw2: (id: string) =>
    apiFetch<{ ok: true }>(`/admin/users/${encodeURIComponent(id)}/unlink-gw2`, { method: 'POST' }),
  adminDeleteUserLogs: (id: string) =>
    apiFetch<{ ok: true; deleted: number }>(`/admin/users/${encodeURIComponent(id)}/delete-logs`, { method: 'POST' }),
  adminHealth: () => apiFetch<AdminHealth>('/admin/health'),
  adminCleanupStuck: () => apiFetch<{ ok: true; cleaned: number }>('/admin/health/cleanup-stuck', { method: 'POST' }),
  adminGuilds: () => apiFetch<AdminGuildRow[]>('/admin/guilds'),
  adminGuildResync: (id: string) =>
    apiFetch<{ ok: true; matched: number }>(`/admin/guilds/${encodeURIComponent(id)}/resync`, { method: 'POST' }),
  adminGuildClearSyncKey: (id: string) =>
    apiFetch<{ ok: true }>(`/admin/guilds/${encodeURIComponent(id)}/clear-sync-key`, { method: 'POST' }),
  adminDeleteGuild: (id: string) => apiFetch<{ ok: true }>(`/admin/guilds/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  adminAnnouncements: () => apiFetch<AdminAnnouncement[]>('/admin/announcements'),
  adminCreateAnnouncement: (data: { message: string; severity: string; expiresAt?: string | null }) =>
    apiFetch<{ id: string }>('/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  adminExpireAnnouncement: (id: string) =>
    apiFetch<{ ok: true }>(`/admin/announcements/${encodeURIComponent(id)}/expire`, { method: 'POST' }),
  adminDeleteAnnouncement: (id: string) =>
    apiFetch<{ ok: true }>(`/admin/announcements/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  adminSettings: () => apiFetch<AppSettings>('/admin/settings'),
  adminSetSetting: (key: string, value: string) =>
    apiFetch<AppSettings>('/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    }),
  adminAudit: (params: { limit?: number; offset?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.offset) qs.set('offset', String(params.offset));
    const query = qs.toString();
    return apiFetch<{ total: number; entries: AdminAuditEntry[] }>(`/admin/audit${query ? `?${query}` : ''}`);
  },
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
