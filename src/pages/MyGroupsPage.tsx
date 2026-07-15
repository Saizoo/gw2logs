import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Card, CountBadge, GoldButton } from '../components/atoms';
import { LoadingState, EmptyState } from '../components/QueryStates';

export default function MyGroupsPage() {
  const { user } = useCurrentUser();
  const [reloadNonce, setReloadNonce] = useState(0);
  const refetch = () => setReloadNonce((n) => n + 1);

  const { data: myGroups, loading: myLoading } = useApiQuery(() => (user ? api.myGroups() : Promise.resolve([])), [user, reloadNonce]);

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Awaited<ReturnType<typeof api.searchGroups>> | null>(null);
  const [searching, setSearching] = useState(false);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleSearch() {
    if (!search.trim()) return;
    setSearching(true);
    try {
      setSearchResults(await api.searchGroups(search.trim()));
    } finally {
      setSearching(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreateError(null);
    try {
      await api.createGroup(newName.trim());
      setNewName('');
      setCreating(false);
      refetch();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to create group');
    }
  }

  async function handleRequestJoin(groupId: string) {
    await api.requestToJoinGroup(groupId);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: '800 22px var(--font-sans)', marginBottom: 6 }}>My Groups</div>
          <div style={{ font: '400 13px var(--font-sans)', color: 'var(--text-62)' }}>
            Ad-hoc raid-planning teams — create one, invite people, and save squad compositions together.
          </div>
        </div>
        {user && <GoldButton onClick={() => setCreating((c) => !c)}>Create group</GoldButton>}
      </div>

      {creating && (
        <Card style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input placeholder="Group name" value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} />
          <GoldButton onClick={handleCreate}>Create</GoldButton>
          {createError && <span style={{ font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{createError}</span>}
        </Card>
      )}

      {user && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
            My groups
          </div>
          {myLoading && <LoadingState label="Loading groups…" />}
          {!myLoading && myGroups?.length === 0 && <EmptyState>You're not in any groups yet — create one or search below.</EmptyState>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {myGroups?.map((g) => (
              <Link key={g.id} to={`/groups/${g.id}`} style={{ display: 'block' }}>
                <Card style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ font: '700 14px var(--font-sans)' }}>{g.name}</div>
                    <CountBadge count={g.pendingRequestCount ?? 0} />
                  </div>
                  <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)', marginTop: 4 }}>
                    {g.memberCount} member{g.memberCount === 1 ? '' : 's'}
                    {g.pendingRequestCount ? ` · ${g.pendingRequestCount} pending request${g.pendingRequestCount === 1 ? '' : 's'}` : ''}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
          Find a group
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            placeholder="Search group name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ ...inputStyle, flex: 1 }}
          />
          <GoldButton onClick={handleSearch}>{searching ? 'Searching…' : 'Search'}</GoldButton>
        </div>
        {searchResults && searchResults.length === 0 && <EmptyState>No groups match "{search}".</EmptyState>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {searchResults?.map((g) => (
            <Card key={g.id} style={{ padding: 16 }}>
              <Link to={`/groups/${g.id}`}>
                <div style={{ font: '700 14px var(--font-sans)' }}>{g.name}</div>
                <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)', marginTop: 4 }}>
                  Led by {g.leader} · {g.memberCount} member{g.memberCount === 1 ? '' : 's'}
                </div>
              </Link>
              {user && (
                <button onClick={() => handleRequestJoin(g.id)} style={{ ...ghostBtnStyle, marginTop: 10 }}>
                  Request to join
                </button>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
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

const ghostBtnStyle = {
  font: '600 12px var(--font-sans)',
  padding: '8px 14px',
  borderRadius: 10,
  background: 'var(--bg-chip)',
  color: 'var(--text-80)',
  border: '1px solid var(--border)',
} as const;
