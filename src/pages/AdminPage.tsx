import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, ApiError, type AdminBuild, type AdminLogRow, type AdminUploadJob, type AdminUserRow } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { toast } from '../lib/toast';
import { PROF, PROF_ORDER, CAT, type BuildCategory, type ProfessionKey } from '../data/builds';
import { Card, GoldButton, LoadMoreButton, SectionLabel, StatCard, Badge } from '../components/atoms';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';

const PAGE_SIZE = 50;

type Tab = 'Overview' | 'Uploads' | 'Logs' | 'Users' | 'Guilds' | 'Groups' | 'Builds';
const TABS: Tab[] = ['Overview', 'Uploads', 'Logs', 'Users', 'Guilds', 'Groups', 'Builds'];

export default function AdminPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [tab, setTab] = useState<Tab>('Overview');

  if (userLoading) return <LoadingState label="Loading…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <ErrorState message="Admin access required." />;

  return (
    <div>
      <div style={{ font: '800 22px var(--font-sans)', marginBottom: 6 }}>Admin Panel</div>
      <div style={{ font: '400 13px var(--font-sans)', color: 'var(--text-62)', marginBottom: 20 }}>
        System oversight — upload/parse health, logs, users, guilds, groups, and the raid-planner build catalog.
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '7px 14px',
              borderRadius: 9,
              font: '600 12px var(--font-sans)',
              background: tab === t ? 'var(--gold-grad)' : 'var(--bg-chip)',
              color: tab === t ? 'var(--gold-fg)' : 'var(--text-65)',
              border: `1px solid ${tab === t ? 'transparent' : 'var(--border)'}`,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab />}
      {tab === 'Uploads' && <UploadsTab />}
      {tab === 'Logs' && <LogsTab />}
      {tab === 'Users' && <UsersTab currentUserId={user.id} />}
      {tab === 'Guilds' && <GuildsTab />}
      {tab === 'Groups' && <GroupsTab />}
      {tab === 'Builds' && <BuildsTab />}
    </div>
  );
}

// --- Overview ---

function OverviewTab() {
  const { data, loading, error } = useApiQuery(() => api.adminOverview(), []);
  if (loading) return <LoadingState label="Loading overview…" />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const stats: { label: string; value: number }[] = [
    { label: 'Total logs', value: data.totalLogs },
    { label: 'Total users', value: data.totalUsers },
    { label: 'Total players', value: data.totalPlayers },
    { label: 'Total guilds', value: data.totalGuilds },
    { label: 'Total groups', value: data.totalGroups },
    { label: 'Catalog builds', value: data.totalBuilds },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value.toLocaleString()} />
        ))}
        <StatCard label="Failed uploads (7d)" value={data.failedUploadsThisWeek} />
      </div>

      <SectionLabel>Recent upload activity</SectionLabel>
      {data.recentUploadJobs.length === 0 ? <EmptyState>No upload activity yet.</EmptyState> : <UploadJobList jobs={data.recentUploadJobs} />}
    </div>
  );
}

// --- Uploads ---

function UploadsTab() {
  const [status, setStatus] = useState<string>('');
  const [total, setTotal] = useState<number | null>(null);
  const { items: jobs, loading, loadingMore, error, hasMore, loadMore } = usePaginatedList<AdminUploadJob>(
    (offset) =>
      api.adminUploadJobs({ status: status || undefined, limit: PAGE_SIZE, offset }).then((res) => {
        setTotal(res.total);
        return { items: res.jobs, hasMore: offset + res.jobs.length < res.total };
      }),
    [status],
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {['', 'success', 'failed', 'parsing', 'queued'].map((s) => (
          <button key={s} onClick={() => setStatus(s)} style={pillStyle(status === s)}>
            {s || 'All'}
          </button>
        ))}
      </div>
      {loading && <LoadingState label="Loading upload jobs…" />}
      {error && <ErrorState message={error} />}
      {!loading && jobs.length === 0 && <EmptyState>No upload jobs match this filter.</EmptyState>}
      <UploadJobList jobs={jobs} />
      {hasMore && <LoadMoreButton onClick={loadMore} loading={loadingMore} />}
      {total != null && <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-50)', marginTop: 10 }}>{jobs.length} of {total}</div>}
    </div>
  );
}

function UploadJobList({ jobs }: { jobs: { id: string; status: string; fileName: string; fileSizeByte: number; errorMessage: string | null; logId: string | null; createdAt: string }[] }) {
  if (jobs.length === 0) return null;
  return (
    <Card style={{ overflow: 'hidden' }}>
      {jobs.map((j, i) => (
        <div
          key={j.id}
          style={{
            padding: '11px 18px',
            borderBottom: i === jobs.length - 1 ? 'none' : '1px solid var(--border-faint)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Badge tone={j.status === 'success' ? 'good' : j.status === 'failed' ? 'bad' : 'gold'}>{j.status}</Badge>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: '600 12.5px var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.fileName}</div>
            {j.errorMessage && <div style={{ font: '400 11px var(--font-sans)', color: 'var(--bad)', marginTop: 2 }}>{j.errorMessage}</div>}
          </div>
          <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)', flex: 'none' }}>
            {(j.fileSizeByte / (1024 * 1024)).toFixed(1)} MB
          </div>
          <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-50)', flex: 'none' }}>{new Date(j.createdAt).toLocaleString()}</div>
        </div>
      ))}
    </Card>
  );
}

// --- Logs ---

function LogsTab() {
  const [search, setSearch] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { items: logs, loading, loadingMore, error, hasMore, loadMore } = usePaginatedList<AdminLogRow>(
    (offset) =>
      api.adminLogs({ search: search || undefined, limit: PAGE_SIZE, offset }).then((res) => {
        setTotal(res.total);
        return { items: res.logs, hasMore: offset + res.logs.length < res.total };
      }),
    [search, reloadNonce],
  );

  async function handleDelete(id: string, boss: string) {
    if (!confirm(`Delete this "${boss}" log? This removes it and all its player/mechanic data permanently.`)) return;
    setActionError(null);
    try {
      await api.adminDeleteLog(id);
      toast.success(`Deleted "${boss}"`);
      setReloadNonce((n) => n + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete log';
      setActionError(message);
      toast.error(message);
    }
  }

  return (
    <div>
      <input placeholder="Search by boss name…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, marginBottom: 14, width: 280 }} />
      {actionError && <div style={{ font: '500 12px var(--font-sans)', color: 'var(--bad)', marginBottom: 10 }}>{actionError}</div>}
      {loading && <LoadingState label="Loading logs…" />}
      {error && <ErrorState message={error} />}
      {!loading && logs.length === 0 && <EmptyState>No logs match this search.</EmptyState>}
      {logs.length > 0 && (
        <Card style={{ overflow: 'hidden' }}>
          {logs.map((l, i) => (
            <div
              key={l.id}
              style={{
                padding: '11px 18px',
                borderBottom: i === logs.length - 1 ? 'none' : '1px solid var(--border-faint)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '600 12.5px var(--font-sans)' }}>
                  {l.boss}
                  {l.isCm ? ' CM' : ''} {!l.success && <span style={{ color: 'var(--bad)' }}>(wipe)</span>}
                </div>
                <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>
                  {l.playerCount} players · {l.squadDps.toLocaleString()} squad dps · {new Date(l.uploadedAt).toLocaleString()}
                </div>
              </div>
              <button onClick={() => handleDelete(l.id, l.boss)} style={{ ...ghostBtnStyle, color: 'var(--bad)' }}>
                Delete
              </button>
            </div>
          ))}
        </Card>
      )}
      {hasMore && <LoadMoreButton onClick={loadMore} loading={loadingMore} />}
      {total != null && <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-50)', marginTop: 10 }}>{logs.length} of {total}</div>}
    </div>
  );
}

// --- Users ---

function UsersTab({ currentUserId }: { currentUserId: string }) {
  const [search, setSearch] = useState('');
  const [reloadNonce, setReloadNonce] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { items: users, loading, loadingMore, error, hasMore, loadMore } = usePaginatedList<AdminUserRow>(
    (offset) =>
      api.adminUsers({ search: search || undefined, limit: PAGE_SIZE, offset }).then((res) => {
        setTotal(res.total);
        return { items: res.users, hasMore: offset + res.users.length < res.total };
      }),
    [search, reloadNonce],
  );

  async function toggleAdmin(id: string, name: string, isAdmin: boolean) {
    setActionError(null);
    try {
      await api.adminSetUserAdmin(id, isAdmin);
      toast.success(`${name} is ${isAdmin ? 'now an admin' : 'no longer an admin'}`);
      setReloadNonce((n) => n + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update admin status';
      setActionError(message);
      toast.error(message);
    }
  }

  async function forceLogout(id: string, name: string) {
    if (!confirm(`Force-logout ${name}? This revokes all of their active sessions.`)) return;
    setActionError(null);
    try {
      const res = await api.adminForceLogout(id);
      toast.success(`Revoked ${res.sessionsRevoked} session${res.sessionsRevoked === 1 ? '' : 's'} for ${name}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to force logout';
      setActionError(message);
      toast.error(message);
    }
  }

  return (
    <div>
      <input placeholder="Search by Discord username…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, marginBottom: 14, width: 280 }} />
      {actionError && <div style={{ font: '500 12px var(--font-sans)', color: 'var(--bad)', marginBottom: 10 }}>{actionError}</div>}
      {loading && <LoadingState label="Loading users…" />}
      {error && <ErrorState message={error} />}
      {!loading && users.length === 0 && <EmptyState>No users match this search.</EmptyState>}
      {users.length > 0 && (
        <Card style={{ overflow: 'hidden' }}>
          {users.map((u, i) => (
            <div
              key={u.id}
              style={{
                padding: '11px 18px',
                borderBottom: i === users.length - 1 ? 'none' : '1px solid var(--border-faint)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ font: '600 12.5px var(--font-sans)' }}>{u.discordUsername}</div>
                  {u.isAdmin && <Badge>Admin</Badge>}
                </div>
                <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>
                  {u.gw2AccountName ?? 'Not linked'} {u.linkedPlayerAccount ? `· ${u.linkedPlayerAccount}` : ''} · joined {new Date(u.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button onClick={() => forceLogout(u.id, u.discordUsername)} style={ghostBtnStyle}>
                Force logout
              </button>
              <button
                onClick={() => toggleAdmin(u.id, u.discordUsername, !u.isAdmin)}
                disabled={u.id === currentUserId && u.isAdmin}
                title={u.id === currentUserId && u.isAdmin ? "You can't remove your own admin access" : undefined}
                style={{ ...ghostBtnStyle, opacity: u.id === currentUserId && u.isAdmin ? 0.5 : 1 }}
              >
                {u.isAdmin ? 'Demote' : 'Promote'}
              </button>
            </div>
          ))}
        </Card>
      )}
      {hasMore && <LoadMoreButton onClick={loadMore} loading={loadingMore} />}
      {total != null && <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-50)', marginTop: 10 }}>{users.length} of {total}</div>}
    </div>
  );
}

// --- Guilds ---

function GuildsTab() {
  const { data, loading, error } = useApiQuery(() => api.adminGuilds(), []);
  if (loading) return <LoadingState label="Loading guilds…" />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.length === 0) return <EmptyState>No guilds synced yet.</EmptyState>;

  return (
    <Card style={{ overflow: 'hidden' }}>
      {data.map((g, i) => (
        <div key={g.id} style={{ padding: '11px 18px', borderBottom: i === data.length - 1 ? 'none' : '1px solid var(--border-faint)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: '600 12.5px var(--font-sans)' }}>
              [{g.tag}] {g.name}
            </div>
            <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>
              {g.memberCount} members · last synced {new Date(g.lastSyncedAt).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
}

// --- Groups ---

function GroupsTab() {
  const [reloadNonce, setReloadNonce] = useState(0);
  const { data, loading, error } = useApiQuery(() => api.adminGroups(), [reloadNonce]);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete group "${name}"? This removes all its members, join requests, and saved compositions permanently.`)) return;
    setActionError(null);
    try {
      await api.adminDeleteGroup(id);
      toast.success(`Deleted group "${name}"`);
      setReloadNonce((n) => n + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete group';
      setActionError(message);
      toast.error(message);
    }
  }

  if (loading) return <LoadingState label="Loading groups…" />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.length === 0) return <EmptyState>No raid-planner groups created yet.</EmptyState>;

  return (
    <div>
      {actionError && <div style={{ font: '500 12px var(--font-sans)', color: 'var(--bad)', marginBottom: 10 }}>{actionError}</div>}
      <Card style={{ overflow: 'hidden' }}>
        {data.map((g, i) => (
          <div key={g.id} style={{ padding: '11px 18px', borderBottom: i === data.length - 1 ? 'none' : '1px solid var(--border-faint)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: '600 12.5px var(--font-sans)' }}>{g.name}</div>
              <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>
                Led by {g.leader} · {g.memberCount} members · {g.compositionCount} compositions
              </div>
            </div>
            <button onClick={() => handleDelete(g.id, g.name)} style={{ ...ghostBtnStyle, color: 'var(--bad)' }}>
              Delete
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}

// --- Builds ---

function BuildsTab() {
  const [reloadNonce, setReloadNonce] = useState(0);
  const { data, loading, error } = useApiQuery(() => api.adminBuilds(), [reloadNonce]);
  const [profFilter, setProfFilter] = useState<string>('');
  const [editing, setEditing] = useState<AdminBuild | 'new' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleDelete(b: AdminBuild) {
    if (!confirm(`Delete "${b.name}"? Any composition slot already using it will keep showing its old assignment as unresolved.`)) return;
    setActionError(null);
    try {
      await api.adminDeleteBuild(b.id);
      toast.success(`Deleted "${b.name}"`);
      setReloadNonce((n) => n + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to delete build';
      setActionError(message);
      toast.error(message);
    }
  }

  const builds = (data ?? []).filter((b) => !profFilter || b.profession === profFilter);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={profFilter} onChange={(e) => setProfFilter(e.target.value)} style={selectStyle}>
          <option value="">All professions</option>
          {PROF_ORDER.map((k) => (
            <option key={k} value={k}>
              {PROF[k].name}
            </option>
          ))}
        </select>
        <GoldButton onClick={() => setEditing('new')}>Add build</GoldButton>
        {data && <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-50)', marginLeft: 'auto' }}>{data.length} total</div>}
      </div>

      {editing && (
        <BuildForm
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setReloadNonce((n) => n + 1);
          }}
        />
      )}

      {actionError && <div style={{ font: '500 12px var(--font-sans)', color: 'var(--bad)', marginBottom: 10 }}>{actionError}</div>}
      {loading && <LoadingState label="Loading build catalog…" />}
      {error && <ErrorState message={error} />}
      {data && builds.length === 0 && <EmptyState>No builds match this filter.</EmptyState>}
      {data && builds.length > 0 && (
        <Card style={{ overflow: 'hidden' }}>
          {builds.map((b, i) => (
            <div key={b.id} style={{ padding: '10px 18px', borderBottom: i === builds.length - 1 ? 'none' : '1px solid var(--border-faint)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Badge>{PROF[b.profession as ProfessionKey]?.name ?? b.profession}</Badge>
              <Badge tone={CAT[b.category as BuildCategory]?.group === 'heal' ? 'good' : 'gold'}>{CAT[b.category as BuildCategory]?.label ?? b.category}</Badge>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '600 12.5px var(--font-sans)' }}>{b.name}</div>
                <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>{b.weapons}</div>
              </div>
              <a href={b.url} target="_blank" rel="noreferrer" style={{ font: '600 11px var(--font-sans)', color: 'var(--gold)' }}>
                Guide →
              </a>
              <button onClick={() => setEditing(b)} style={ghostBtnStyle}>
                Edit
              </button>
              <button onClick={() => handleDelete(b)} style={{ ...ghostBtnStyle, color: 'var(--bad)' }}>
                Delete
              </button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function BuildForm({ initial, onCancel, onSaved }: { initial: AdminBuild | null; onCancel: () => void; onSaved: () => void }) {
  const [profession, setProfession] = useState<string>(initial?.profession ?? PROF_ORDER[0]);
  const [category, setCategory] = useState<string>(initial?.category ?? 'pdps');
  const [name, setName] = useState(initial?.name ?? '');
  const [weapons, setWeapons] = useState(initial?.weapons ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      const data = { profession, category, name: name.trim(), weapons: weapons.trim(), url: url.trim() };
      if (initial) await api.adminUpdateBuild(initial.id, data);
      else await api.adminCreateBuild(data);
      toast.success(initial ? `Saved changes to "${data.name}"` : `Added "${data.name}"`);
      onSaved();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Failed to save build');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={{ padding: '16px 20px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ font: '700 13px var(--font-sans)' }}>{initial ? `Edit "${initial.name}"` : 'Add a build'}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select value={profession} onChange={(e) => setProfession(e.target.value)} style={selectStyle}>
          {PROF_ORDER.map((k) => (
            <option key={k} value={k}>
              {PROF[k].name}
            </option>
          ))}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
          {(Object.keys(CAT) as BuildCategory[]).map((k) => (
            <option key={k} value={k}>
              {CAT[k].label}
            </option>
          ))}
        </select>
      </div>
      <input placeholder="Build name (e.g. Heal Alacrity Tempest)" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      <input placeholder="Weapons (e.g. Dagger & Warhorn)" value={weapons} onChange={(e) => setWeapons(e.target.value)} style={inputStyle} />
      <input placeholder="Guide URL (e.g. https://snowcrows.com/builds/raids/...)" value={url} onChange={(e) => setUrl(e.target.value)} style={inputStyle} />
      {saveError && <div style={{ font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{saveError}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <GoldButton onClick={handleSave}>{saving ? 'Saving…' : initial ? 'Save changes' : 'Create build'}</GoldButton>
        <button onClick={onCancel} style={ghostBtnStyle}>
          Cancel
        </button>
      </div>
    </Card>
  );
}

// --- shared styles ---

function pillStyle(active: boolean) {
  return {
    padding: '6px 12px',
    borderRadius: 8,
    font: '600 11.5px var(--font-sans)',
    background: active ? 'var(--gold-grad)' : 'var(--bg-chip)',
    color: active ? 'var(--gold-fg)' : 'var(--text-65)',
    border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
  } as const;
}

const inputStyle = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontSize: 12.5,
  padding: '8px 12px',
  borderRadius: 8,
  fontFamily: 'var(--font-sans)',
} as const;

const selectStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  color: 'var(--text-92)',
  fontSize: 12.5,
  fontWeight: 600,
  padding: '9px 12px',
  borderRadius: 10,
  fontFamily: 'var(--font-sans)',
} as const;

const ghostBtnStyle = {
  font: '600 12px var(--font-sans)',
  padding: '8px 14px',
  borderRadius: 10,
  background: 'var(--bg-chip)',
  color: 'var(--text-80)',
  border: '1px solid var(--border)',
} as const;
