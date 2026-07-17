import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, type GroupSummary } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Card, CountBadge, GoldButton } from '../components/atoms';
import { LoadingState, EmptyState } from '../components/QueryStates';
import { WEEKDAYS, formatSchedule } from '../data/schedule';

type SortOption = 'members' | 'newest' | 'name';

const SORT_LABELS: Record<SortOption, string> = {
  members: 'Most members',
  newest: 'Newest',
  name: 'Name (A–Z)',
};

export default function MyGroupsPage() {
  const { user } = useCurrentUser();
  const [reloadNonce, setReloadNonce] = useState(0);
  const refetch = () => setReloadNonce((n) => n + 1);

  const { data: myGroups, loading: myLoading } = useApiQuery(() => (user ? api.myGroups() : Promise.resolve([])), [user, reloadNonce]);

  const [search, setSearch] = useState('');
  const [dayFilter, setDayFilter] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>('members');
  const [searchResults, setSearchResults] = useState<Awaited<ReturnType<typeof api.searchGroups>> | null>(null);
  const [searching, setSearching] = useState(false);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleSearch() {
    setSearching(true);
    try {
      setSearchResults(await api.searchGroups(search.trim(), { days: dayFilter, sort }));
    } finally {
      setSearching(false);
    }
  }

  // Browse-all-groups is a real mode now (empty search + filters/sort), so
  // this runs once on load and again whenever a filter/sort changes —
  // typed search text still only re-runs on Enter/click, same as before.
  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayFilter, sort]);

  function toggleDay(d: string) {
    setDayFilter((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
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
          {myLoading && <LoadingState label="Loading groups…" />}
          {!myLoading && myGroups?.length === 0 && <EmptyState>You're not in any groups yet — create one or search below.</EmptyState>}

          {/* Guild groups first (auto-created from displayed guilds), then
              hand-made statics — same card, different section + badge. */}
          {(myGroups?.some((g) => g.guild) ?? false) && (
            <>
              <div style={{ font: '600 12px var(--font-sans)', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
                My guild
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 22 }}>
                {myGroups?.filter((g) => g.guild).map((g) => <GroupCard key={g.id} group={g} />)}
              </div>
            </>
          )}

          {(myGroups?.some((g) => !g.guild) ?? false) && (
            <>
              <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
                My statics
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                {myGroups?.filter((g) => !g.guild).map((g) => <GroupCard key={g.id} group={g} />)}
              </div>
            </>
          )}
        </div>
      )}

      <div>
        <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
          Find a group
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            placeholder="Search group name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ ...inputStyle, flex: 1 }}
          />
          <select className="u-select" value={sort} onChange={(e) => setSort(e.target.value as SortOption)} style={inputStyle}>
            {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <GoldButton onClick={handleSearch}>{searching ? 'Searching…' : 'Search'}</GoldButton>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          <span style={{ font: '600 11px var(--font-sans)', color: 'var(--text-55)', marginRight: 2 }}>Raids on:</span>
          {WEEKDAYS.map((d) => {
            const active = dayFilter.includes(d);
            return (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={active ? undefined : 'u-chip'}
                style={{
                  padding: '5px 11px',
                  borderRadius: 20,
                  font: '600 11.5px var(--font-sans)',
                  background: active ? 'var(--gold-dim)' : 'var(--bg-chip)',
                  color: active ? 'var(--gold)' : 'var(--text-65)',
                  border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
                }}
              >
                {d}
              </button>
            );
          })}
          {dayFilter.length > 0 && (
            <button onClick={() => setDayFilter([])} style={{ font: '600 11px var(--font-sans)', color: 'var(--text-55)', padding: '4px 8px' }}>
              Clear
            </button>
          )}
        </div>
        {searchResults && searchResults.length === 0 && (
          <EmptyState>{search.trim() ? `No groups match "${search}".` : 'No groups match those filters.'}</EmptyState>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {searchResults?.map((g) => (
            <Card key={g.id} className="u-card-link" style={{ padding: 16 }}>
              <Link to={`/groups/${g.id}`}>
                <div style={{ font: '700 14px var(--font-sans)' }}>{g.name}</div>
                <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)', marginTop: 4 }}>
                  Led by {g.leader} · {g.memberCount} member{g.memberCount === 1 ? '' : 's'}
                </div>
                {formatSchedule(g) && (
                  <div style={{ font: '400 11px var(--font-sans)', color: 'var(--gold)', marginTop: 4 }}>{formatSchedule(g)}</div>
                )}
              </Link>
              {user && (
                <button className="u-btn-ghost" onClick={() => handleRequestJoin(g.id)} style={{ ...ghostBtnStyle, marginTop: 10 }}>
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

export function GuildBadge({ tag }: { tag: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        font: '800 9px var(--font-sans)',
        letterSpacing: '.6px',
        textTransform: 'uppercase',
        padding: '2px 7px',
        borderRadius: 5,
        color: 'var(--gold)',
        background: 'oklch(0.78 0.14 85 / 15%)',
        border: '1px solid oklch(0.78 0.14 85 / 35%)',
        whiteSpace: 'nowrap',
      }}
    >
      ⚜ Guild · [{tag}]
    </span>
  );
}

function GroupCard({ group: g }: { group: GroupSummary }) {
  return (
    <Link to={`/groups/${g.id}`} style={{ display: 'block' }}>
      <Card className="u-card-link" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ font: '700 14px var(--font-sans)' }}>{g.name}</div>
          {g.guild && <GuildBadge tag={g.guild.tag} />}
          <CountBadge count={g.pendingRequestCount ?? 0} />
        </div>
        <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)', marginTop: 4 }}>
          {g.memberCount} member{g.memberCount === 1 ? '' : 's'}
          {g.pendingRequestCount ? ` · ${g.pendingRequestCount} pending request${g.pendingRequestCount === 1 ? '' : 's'}` : ''}
        </div>
        {formatSchedule(g) && (
          <div style={{ font: '400 11px var(--font-sans)', color: 'var(--gold)', marginTop: 4 }}>{formatSchedule(g)}</div>
        )}
      </Card>
    </Link>
  );
}
