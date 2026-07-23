import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, type GroupSummary } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Card, CountBadge, GoldButton } from '../components/atoms';
import { Select } from '../components/Select';
import { LoadingState, EmptyState } from '../components/QueryStates';
import { WEEKDAYS, formatSchedule, nextRaid } from '../data/schedule';
import { groupBgPath } from '../data/gw2-data';
import { toast } from '../lib/toast';

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
  const { data: invites } = useApiQuery(() => (user ? api.myInvites() : Promise.resolve([])), [user, reloadNonce]);

  async function acceptInvite(id: string) {
    try {
      await api.acceptInvite(id);
      refetch();
    } catch (err) {
      // eslint-disable-next-line no-alert
      console.error(err);
    }
  }
  async function declineInvite(id: string) {
    try {
      await api.declineInvite(id);
      refetch();
    } catch (err) {
      console.error(err);
    }
  }

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
    try {
      await api.requestToJoinGroup(groupId);
      // Flip this row to its "Pending" state right away rather than waiting on
      // a refetch — the button shouldn't keep offering a request you just sent.
      setSearchResults((prev) => prev?.map((g) => (g.id === groupId ? { ...g, requestPending: true } : g)) ?? prev);
      toast.success('Join request sent');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to send join request');
    }
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

      {user && invites && invites.length > 0 && (
        <Card style={{ padding: '16px 20px', marginBottom: 20, borderColor: 'color-mix(in srgb, var(--color-accent) 35%, transparent)' }}>
          <div style={{ font: '700 12px var(--font-sans)', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
            Invitations ({invites.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {invites.map((inv) => (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ font: '700 13.5px var(--font-sans)' }}>{inv.group.name}</div>
                  <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-55)' }}>Invited by {inv.invitedBy}</div>
                </div>
                <GoldButton onClick={() => acceptInvite(inv.id)}>Accept</GoldButton>
                <button
                  onClick={() => declineInvite(inv.id)}
                  className="u-btn-ghost"
                  style={{ font: '600 12px var(--font-sans)', padding: '9px 14px', borderRadius: 0, background: 'var(--bg-chip)', color: 'var(--text-70)', border: '1px solid var(--border)' }}
                >
                  Decline
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

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

          {/* One unified grid — guilds and hand-made statics together, guild
              groups leading, each self-labelled by its guild badge. */}
          {(myGroups?.length ?? 0) > 0 && (
            <>
              <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
                My groups
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {[...(myGroups ?? [])]
                  .sort((a, b) => Number(!!b.guild) - Number(!!a.guild))
                  .map((g) => <GroupCard key={g.id} group={g} />)}
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
          <Select
            ariaLabel="Sort"
            value={sort}
            onChange={(v) => setSort(v as SortOption)}
            options={(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([key, label]) => ({ value: key, label }))}
            style={{ minWidth: 180 }}
          />
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
                  borderRadius: 0,
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {searchResults?.map((g) => (
            <GroupBrowseRow key={g.id} group={g} canJoin={!!user} onJoin={() => handleRequestJoin(g.id)} />
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
  borderRadius: 0,
  fontFamily: 'var(--font-sans)',
} as const;

const ghostBtnStyle = {
  font: '600 12px var(--font-sans)',
  padding: '8px 14px',
  borderRadius: 0,
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
        borderRadius: 0,
        color: 'var(--gold)',
        background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
        border: '1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)',
        whiteSpace: 'nowrap',
      }}
    >
      ⚜ Guild · [{tag}]
    </span>
  );
}

// Direction A — poster tile. A grayscale hero strip (procedural, seeded by the
// group so each keeps a stable look), the name set big over a scrim, a 2px
// accent base rule, then a quiet meta foot. The `background`/`icon` fields
// aren't wired to real art yet, so the poster is generated; drop a real image
// in here later and the layout doesn't change.
function GroupCard({ group: g }: { group: GroupSummary }) {
  const next = nextRaid(g);
  const bg = groupBgPath(g.background);
  return (
    <Link to={`/groups/${g.id}`} style={{ display: 'block' }}>
      <Card className="u-card-link" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ position: 'relative', height: 116, overflow: 'hidden', background: bg ? 'var(--color-neutral-900)' : groupPoster(g.id || g.name) }}>
          {/* a chosen image (full colour) when set, else the procedural poster */}
          {bg && <img src={bg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
          {/* legibility scrim + a faint diagonal light streak */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(114deg, transparent 42%, rgba(255,255,255,.07) 50%, transparent 58%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(8,7,7,.9) 0%, rgba(8,7,7,.35) 42%, transparent 72%)' }} />
          <div style={{ position: 'absolute', inset: 0, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              {next?.soon ? <TonightTag time={next.time} /> : <span />}
              <CountBadge count={g.pendingRequestCount ?? 0} />
            </div>
            <div style={{ font: '800 19px/1.05 var(--font-sans)', letterSpacing: '-.01em', color: 'var(--on-art)', textShadow: '0 1px 8px rgba(0,0,0,.6)' }}>
              {g.name}
            </div>
          </div>
        </div>
        <div style={{ height: 2, background: 'var(--gold)' }} />
        <div style={{ padding: '12px 13px 13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text-70)' }}>
            {g.memberCount} member{g.memberCount === 1 ? '' : 's'}
            {g.pendingRequestCount ? ` · ${g.pendingRequestCount} pending` : ''}
          </div>
          {g.guild ? (
            <GuildBadge tag={g.guild.tag} />
          ) : next && !next.soon ? (
            <span style={{ font: '600 11.5px var(--font-sans)', color: 'var(--text-60)' }}>Next · {next.label}</span>
          ) : formatSchedule(g) ? (
            <span style={{ font: '600 11.5px var(--font-sans)', color: 'var(--text-60)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{g.raidDays?.join(' · ')}</span>
          ) : null}
        </div>
      </Card>
    </Link>
  );
}

// Direction D — full-width fixture row for the "find a group" browse. Big name,
// a schedule sub-line, and the next raid pinned right with a join action.
function GroupBrowseRow({ group: g, canJoin, onJoin }: { group: GroupSummary; canJoin: boolean; onJoin: () => void }) {
  const next = nextRaid(g);
  const sched = formatSchedule(g);
  return (
    <div
      className="u-card-link"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        alignItems: 'center',
        gap: 20,
        padding: '14px 18px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-faint)',
        borderLeft: '3px solid var(--gold)',
      }}
    >
      <Link to={`/groups/${g.id}`} style={{ display: 'block', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <div style={{ font: '800 16px var(--font-sans)', letterSpacing: '-.01em', color: 'var(--text)' }}>{g.name}</div>
          {g.guild && <GuildBadge tag={g.guild.tag} />}
        </div>
        <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-60)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {g.leader ? `Led by ${g.leader} · ` : ''}
          {g.memberCount} member{g.memberCount === 1 ? '' : 's'}
          {sched ? ` · ${sched}` : ''}
        </div>
      </Link>
      <ActivitySpark data={g.activity} total={g.logsThisWeek} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {next?.soon ? (
          <TonightTag time={next.time} />
        ) : next ? (
          <span style={{ font: '600 12px var(--font-sans)', color: 'var(--text-60)', whiteSpace: 'nowrap' }}>Next · {next.label}</span>
        ) : null}
        <JoinAction group={g} canJoin={canJoin} onJoin={onJoin} />
      </div>
    </div>
  );
}

// The join control's three states: already a member → a quiet marker, no
// button; request already sent → a "Pending" marker; otherwise the actual
// "Request to join" button (only when signed in).
function JoinAction({ group: g, canJoin, onJoin }: { group: GroupSummary; canJoin: boolean; onJoin: () => void }) {
  if (g.isMember) {
    return (
      <span style={{ font: '700 11px var(--font-sans)', color: 'var(--text-55)', whiteSpace: 'nowrap' }}>✓ Member</span>
    );
  }
  if (g.requestPending) {
    return (
      <span
        style={{
          font: '700 11px var(--font-sans)',
          letterSpacing: '.03em',
          textTransform: 'uppercase',
          color: 'var(--text-55)',
          background: 'var(--bg-chip)',
          border: '1px solid var(--border)',
          padding: '7px 13px',
          whiteSpace: 'nowrap',
        }}
      >
        Pending
      </span>
    );
  }
  if (!canJoin) return null;
  return (
    <button className="u-btn-ghost" onClick={onJoin} style={ghostBtnStyle}>
      Request to join
    </button>
  );
}

// The "Raids tonight" flag — accent fill, live dot. Shared by A and D.
function TonightTag({ time }: { time: string | null }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        font: '800 10px var(--font-sans)',
        letterSpacing: '.05em',
        textTransform: 'uppercase',
        color: 'var(--gold-fg)',
        background: 'var(--gold-grad)',
        padding: '3px 8px',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
      Tonight{time ? ` · ${time}` : ''}
    </span>
  );
}

// The 7-day activity spark for a browse row — one bar per day, oldest first,
// today's bar in full accent. Falls back to a quiet label when a group had no
// logs in the window, so it reads honestly rather than as seven empty bars.
function ActivitySpark({ data, total }: { data?: number[]; total?: number }) {
  const bars = data && data.length === 7 ? data : null;
  if (!bars || !total) {
    return (
      <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-45)', whiteSpace: 'nowrap', minWidth: 78 }}>
        Quiet this week
      </div>
    );
  }
  const max = Math.max(...bars, 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28 }} aria-hidden>
        {bars.map((v, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: `${v === 0 ? 2 : Math.max(4, Math.round((v / max) * 28))}px`,
              background: v === 0
                ? 'color-mix(in srgb, var(--color-text) 12%, transparent)'
                : i === bars.length - 1
                  ? 'var(--gold)'
                  : 'color-mix(in srgb, var(--color-accent) 78%, transparent)',
            }}
          />
        ))}
      </div>
      <span style={{ font: '700 9px var(--font-sans)', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-50)', whiteSpace: 'nowrap' }}>
        {total} log{total === 1 ? '' : 's'} · 7 days
      </span>
    </div>
  );
}

// Deterministic grayscale "poster" per group — a stable pick from a small set
// of neutral-ramp gradients so a group always renders the same tile. The
// neutral ramp is fixed across light/dark, so posters stay dark in both.
const POSTER_PRESETS = [
  'radial-gradient(120% 110% at 22% -5%, var(--color-neutral-600), transparent 58%), linear-gradient(158deg, var(--color-neutral-800), #0e0d0d)',
  'radial-gradient(95% 120% at 82% 8%, var(--color-neutral-600), transparent 52%), linear-gradient(202deg, var(--color-neutral-700), #0d0c0c)',
  'radial-gradient(100% 100% at 50% 128%, var(--color-neutral-600), transparent 60%), linear-gradient(180deg, var(--color-neutral-800), #0c0b0b)',
  'radial-gradient(90% 130% at 12% 30%, var(--color-neutral-700), transparent 55%), linear-gradient(135deg, var(--color-neutral-800), #100e0e)',
  'radial-gradient(110% 110% at 70% -10%, var(--color-neutral-600), transparent 55%), linear-gradient(168deg, var(--color-neutral-700), #0e0d0d)',
];
function groupPoster(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return POSTER_PRESETS[Math.abs(h) % POSTER_PRESETS.length];
}
