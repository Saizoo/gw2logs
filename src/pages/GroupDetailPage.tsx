import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, type GroupClears, type GroupDetail, type LogListItem, type RaidSignup, type RosterCharacter, type SignupStatus } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { toast } from '../lib/toast';
import { Avatar, Card, GoldButton, LoadMoreButton, ParseBadge, ResultPill } from '../components/atoms';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';
import { DURATION_OPTIONS_MINS, WEEKDAYS, formatDurationMins, formatSchedule } from '../data/schedule';
import { CAT, PROF, toBuildEntry, type BuildCategory, type BuildEntry } from '../data/builds';

const LOGS_PAGE_SIZE = 20;

function formatLogDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function GroupDetailPage() {
  const { id = '' } = useParams();
  const { user } = useCurrentUser();
  const [reloadNonce, setReloadNonce] = useState(0);
  const refetch = () => setReloadNonce((n) => n + 1);

  const { data: group, loading, error } = useApiQuery(() => api.group(id), [id, reloadNonce]);
  // Clears + roster are member-only server-side; don't even ask when the
  // viewer isn't a member so a public visit stays free of 403 noise.
  const memberView = group?.myRole != null;
  const { data: clears } = useApiQuery(
    () => (memberView ? api.groupClears(id) : Promise.resolve(null)),
    [id, memberView, reloadNonce],
  );
  const { data: roster } = useApiQuery(
    () => (memberView ? api.groupRoster(id) : Promise.resolve(null)),
    [id, memberView, reloadNonce],
  );
  const { data: buildRows } = useApiQuery(() => (memberView ? api.builds() : Promise.resolve(null)), [memberView]);
  // Signups get their own reload nonce so an RSVP click refreshes just
  // this data instead of re-fetching the whole page.
  const [signupNonce, setSignupNonce] = useState(0);
  const { data: signups } = useApiQuery(
    () => (memberView ? api.groupSignups(id) : Promise.resolve(null)),
    [id, memberView, signupNonce],
  );
  const { data: requests } = useApiQuery(
    () => (group?.canManage ? api.groupJoinRequests(id) : Promise.resolve([])),
    [id, group?.canManage, reloadNonce],
  );
  const {
    items: groupLogs,
    loading: logsLoading,
    loadingMore: logsLoadingMore,
    hasMore: logsHasMore,
    loadMore: loadMoreLogs,
  } = usePaginatedList<LogListItem>(
    (offset) =>
      api
        .logs({ groupId: id, limit: LOGS_PAGE_SIZE, offset })
        .then((items) => ({ items, hasMore: items.length === LOGS_PAGE_SIZE })),
    [id],
  );

  const [inviteName, setInviteName] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading) return <LoadingState label="Loading group…" />;
  if (error) return <ErrorState message={error} />;
  if (!group) return null;

  async function run(action: () => Promise<unknown>, successMessage?: string) {
    setActionError(null);
    try {
      await action();
      if (successMessage) toast.success(successMessage);
      refetch();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Action failed';
      setActionError(message);
      toast.error(message);
    }
  }

  async function handleInvite() {
    if (!inviteName.trim()) return;
    setInviteError(null);
    try {
      await api.inviteToGroup(id, inviteName.trim());
      toast.success(`Invited ${inviteName.trim()}`);
      setInviteName('');
      refetch();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to invite';
      setInviteError(message);
      toast.error(message);
    }
  }

  const isMember = group.myRole !== null;

  return (
    <div>
      <Card style={{ padding: '28px 32px', marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: '800 24px var(--font-sans)', letterSpacing: '-.3px' }}>{group.name}</div>
          <div style={{ font: '400 13px var(--font-sans)', color: 'var(--text-62)', marginTop: 4 }}>
            Led by {group.leader} · {group.members.length} member{group.members.length === 1 ? '' : 's'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isMember && <GoldButton to={`/planner?group=${id}`}>Open Raid Planner</GoldButton>}
          {!isMember && user && (
            <GoldButton onClick={() => run(() => api.requestToJoinGroup(id), 'Join request sent')}>Request to join</GoldButton>
          )}
          {group.myRole === 'leader' && (
            <button
              onClick={() => {
                if (confirm(`Delete "${group.name}"? This cannot be undone.`)) run(() => api.deleteGroup(id), `Deleted "${group.name}"`);
              }}
              className="u-btn-ghost" style={{ ...ghostBtnStyle, color: 'var(--bad)' }}
            >
              Delete group
            </button>
          )}
        </div>
      </Card>

      {actionError && <div style={{ marginBottom: 16, font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{actionError}</div>}

      <div style={{ marginBottom: 20 }}>
        <RaidScheduleCard group={group} groupId={id} canManage={group.canManage} onSaved={refetch} />
      </div>

      {isMember && clears && (
        <div style={{ marginBottom: 20 }}>
          <WeeklyClearsCard clears={clears} />
        </div>
      )}

      {isMember && signups && user && (
        <div style={{ marginBottom: 20 }}>
          <RaidSignupsCard
            group={group}
            signups={signups}
            myUserId={user.id}
            onSet={async (date, status) => {
              try {
                await api.setSignup(id, date, status);
                setSignupNonce((n) => n + 1);
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : 'Failed to update signup');
              }
            }}
          />
        </div>
      )}

      {isMember && roster && buildRows && (
        <div style={{ marginBottom: 20 }}>
          <RosterReadinessCard
            members={group.members}
            roster={roster}
            builds={buildRows.map(toBuildEntry)}
            nextNight={(() => {
              const next = upcomingRaidDates(group.raidDays, 1)[0];
              if (!next || !signups) return null;
              const confirmed = new Set(
                signups.filter((s) => s.date === next && s.status !== 'out').map((s) => s.userId),
              );
              return confirmed.size > 0 ? { date: next, confirmed } : null;
            })()}
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: group.canManage ? '1.4fr 1fr' : '1fr', gap: 20, alignItems: 'start' }}>
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', font: '700 13.5px var(--font-sans)' }}>Members</div>
          {group.members.map((m, i) => (
            <div
              key={m.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 20px',
                borderBottom: i === group.members.length - 1 ? 'none' : '1px solid var(--border-faint)',
              }}
            >
              {/* GW2 account name leads (it's also the player-profile key);
                  Discord stays as a secondary line. Members without a linked
                  API key fall back to Discord-only with no profile link. */}
              <Avatar size={28} name={m.account ?? m.username} imgSrc={m.avatar} to={m.account ? `/players/${encodeURIComponent(m.account)}` : null} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {m.account ? (
                  <>
                    <Link to={`/players/${encodeURIComponent(m.account)}`} style={{ font: '600 13px var(--font-sans)' }}>
                      {m.account}
                    </Link>
                    <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--text-55)' }}>{m.username}</div>
                  </>
                ) : (
                  <>
                    <div style={{ font: '600 13px var(--font-sans)' }}>{m.username}</div>
                    <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--text-50)' }}>GW2 account not linked</div>
                  </>
                )}
              </div>
              <span
                style={{
                  font: '700 9.5px var(--font-sans)',
                  letterSpacing: '.4px',
                  textTransform: 'uppercase',
                  padding: '2px 7px',
                  borderRadius: 5,
                  background: m.role === 'leader' ? 'var(--gold-dim)' : 'var(--bg-chip)',
                  color: m.role === 'leader' ? 'var(--gold)' : 'var(--text-70)',
                }}
              >
                {m.role}
              </span>
              {group.myRole === 'leader' && m.role !== 'leader' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {m.role === 'member' && (
                    <button onClick={() => run(() => api.setGroupMemberRole(id, m.userId, 'promote'), `Promoted ${m.username} to subleader`)} className="u-btn-ghost" style={smallBtnStyle}>
                      Promote
                    </button>
                  )}
                  {m.role === 'subleader' && (
                    <>
                      <button onClick={() => run(() => api.setGroupMemberRole(id, m.userId, 'demote'), `Demoted ${m.username} to member`)} className="u-btn-ghost" style={smallBtnStyle}>
                        Demote
                      </button>
                      <button onClick={() => run(() => api.setGroupMemberRole(id, m.userId, 'makeleader'), `${m.username} is now the leader`)} className="u-btn-ghost" style={smallBtnStyle}>
                        Make leader
                      </button>
                    </>
                  )}
                  <button onClick={() => run(() => api.removeGroupMember(id, m.userId), `Removed ${m.username}`)} className="u-btn-ghost" style={{ ...smallBtnStyle, color: 'var(--bad)' }}>
                    Remove
                  </button>
                </div>
              )}
              {group.canManage && group.myRole !== 'leader' && m.role === 'member' && (
                <button onClick={() => run(() => api.removeGroupMember(id, m.userId), `Removed ${m.username}`)} className="u-btn-ghost" style={{ ...smallBtnStyle, color: 'var(--bad)' }}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </Card>

        {group.canManage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Card style={{ padding: '16px 20px' }}>
              <div style={{ font: '700 13.5px var(--font-sans)', marginBottom: 10 }}>Invite a member</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="Discord username or GW2 account (Name.1234)" value={inviteName} onChange={(e) => setInviteName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <GoldButton onClick={handleInvite}>Invite</GoldButton>
              </div>
              {inviteError && <div style={{ marginTop: 8, font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{inviteError}</div>}
            </Card>

            <DiscordRemindersCard groupId={id} />

            <Card style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', font: '700 13.5px var(--font-sans)' }}>
                Join requests
              </div>
              {requests?.length === 0 && (
                <div style={{ padding: 20, font: '500 12px var(--font-sans)', color: 'var(--text-55)' }}>No pending requests.</div>
              )}
              {requests?.map((r) => (
                <div key={r.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', borderBottom: '1px solid var(--border-faint)' }}>
                  <Avatar size={26} name={r.account ?? r.username} imgSrc={r.avatar} to={r.account ? `/players/${encodeURIComponent(r.account)}` : null} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '600 12.5px var(--font-sans)' }}>{r.account ?? r.username}</div>
                    {r.account && <div style={{ font: '400 10px var(--font-sans)', color: 'var(--text-55)' }}>{r.username}</div>}
                  </div>
                  <button onClick={() => run(() => api.approveJoinRequest(id, r.userId), `${r.username} joined the group`)} className="u-btn-ghost" style={smallBtnStyle}>
                    Approve
                  </button>
                  <button onClick={() => run(() => api.denyJoinRequest(id, r.userId), `Denied ${r.username}'s request`)} className="u-btn-ghost" style={{ ...smallBtnStyle, color: 'var(--bad)' }}>
                    Deny
                  </button>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ font: '700 13.5px var(--font-sans)', marginBottom: 12 }}>Group Logs</div>
        {logsLoading && <LoadingState label="Loading logs…" />}
        {!logsLoading && groupLogs?.length === 0 && (
          <EmptyState>
            No logs attached to this group yet — pick "{group.name}" from the group dropdown on the Upload page next
            time someone uploads a log.
          </EmptyState>
        )}
        {groupLogs && groupLogs.length > 0 && (
          <Card style={{ overflow: 'hidden' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2.2fr 0.7fr 0.8fr 0.9fr 0.7fr 0.9fr',
                gap: 8,
                padding: '12px 20px',
                font: '700 10.5px var(--font-sans)',
                textTransform: 'uppercase',
                letterSpacing: '.5px',
                color: 'var(--text-55)',
                borderBottom: '1px solid var(--border-soft)',
              }}
            >
              <div>Encounter</div>
              <div>Duration</div>
              <div>Result</div>
              <div>Squad DPS</div>
              <div>Parse</div>
              <div>Date</div>
            </div>
            {groupLogs.map((log, i) => (
              <Link
                key={log.id}
                to={`/logs/${log.id}`}
                className="u-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.2fr 0.7fr 0.8fr 0.9fr 0.7fr 0.9fr',
                  gap: 8,
                  alignItems: 'center',
                  padding: '12px 20px',
                  borderBottom: i === groupLogs.length - 1 ? 'none' : '1px solid var(--border-faint)',
                }}
              >
                <div style={{ font: '600 13px var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.boss}
                  {log.isCm ? ' CM' : ''}
                </div>
                <div style={{ font: '400 12px var(--font-mono)', color: 'var(--text-70)' }}>{formatLogDuration(log.durationMs)}</div>
                <div>
                  <ResultPill success={log.success} />
                </div>
                <div style={{ font: '700 12.5px var(--font-mono)', color: 'var(--gold)' }}>{log.squadDps.toLocaleString()}</div>
                <div>{log.parsePct != null ? <ParseBadge pct={log.parsePct} /> : <span style={{ color: 'var(--text-50)' }}>—</span>}</div>
                <div style={{ font: '400 12px var(--font-mono)', color: 'var(--text-55)' }}>{new Date(log.date).toLocaleDateString()}</div>
              </Link>
            ))}
          </Card>
        )}
        {logsHasMore && <LoadMoreButton onClick={loadMoreLogs} loading={logsLoadingMore} />}
      </div>
    </div>
  );
}

function RaidScheduleCard({
  group,
  groupId,
  canManage,
  onSaved,
}: {
  group: GroupDetail;
  groupId: string;
  canManage: boolean;
  onSaved: () => void;
}) {
  const [days, setDays] = useState<string[]>(group.raidDays);
  const [startTime, setStartTime] = useState(group.raidStartTime ?? '');
  const [durationMins, setDurationMins] = useState<number | ''>(group.raidDurationMins ?? '');
  const [timezone, setTimezone] = useState(group.raidTimezone ?? '');
  const [saving, setSaving] = useState(false);

  if (!canManage) {
    const summary = formatSchedule(group);
    return (
      <Card style={{ padding: '16px 20px' }}>
        <div style={{ font: '700 13.5px var(--font-sans)', marginBottom: 6 }}>Raid Schedule</div>
        <div style={{ font: '400 13px var(--font-sans)', color: summary ? 'var(--text-80)' : 'var(--text-55)' }}>
          {summary ?? 'No schedule set yet.'}
        </div>
      </Card>
    );
  }

  function toggleDay(d: string) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await api.updateGroup(groupId, {
        raidDays: days,
        raidStartTime: startTime || null,
        raidDurationMins: durationMins === '' ? null : durationMins,
        raidTimezone: timezone.trim() || null,
      });
      toast.success('Raid schedule updated');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update schedule');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={{ padding: '16px 20px' }}>
      <div style={{ font: '700 13.5px var(--font-sans)', marginBottom: 12 }}>Raid Schedule</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {WEEKDAYS.map((d) => {
          const active = days.includes(d);
          return (
            <button
              key={d}
              onClick={() => toggleDay(d)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                font: '600 12px var(--font-sans)',
                background: active ? 'var(--gold-grad)' : 'var(--bg-chip)',
                color: active ? 'var(--gold-fg)' : 'var(--text-65)',
                border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ font: '600 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Start time
          </span>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ font: '600 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Duration
          </span>
          <select
            value={durationMins}
            onChange={(e) => setDurationMins(e.target.value ? Number(e.target.value) : '')}
            style={inputStyle}
          >
            <option value="">—</option>
            {DURATION_OPTIONS_MINS.map((m) => (
              <option key={m} value={m}>
                {formatDurationMins(m)}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ font: '600 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Timezone
          </span>
          <input
            placeholder="e.g. EST, UTC"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            style={{ ...inputStyle, width: 110 }}
          />
        </label>
      </div>
      <GoldButton onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save schedule'}
      </GoldButton>
    </Card>
  );
}

// Next `count` raid-night dates (YYYY-MM-DD, local calendar) derived from
// the group's recurring raidDays. The schedule's timezone is free text, so
// nights are identified by calendar day rather than an exact instant —
// "Tuesday's raid" is unambiguous to the people signing up for it.
function upcomingRaidDates(raidDays: string[], count: number): string[] {
  if (raidDays.length === 0) return [];
  const dates: string[] = [];
  const cursor = new Date();
  for (let i = 0; i < 21 && dates.length < count; i++) {
    const weekday = cursor.toLocaleDateString('en-US', { weekday: 'short' });
    if (raidDays.includes(weekday)) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function signupDateLabel(date: string): string {
  // Parse as local calendar day — new Date('YYYY-MM-DD') would read it as
  // UTC midnight and shift the weekday for anyone west of Greenwich.
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const today = new Date();
  const isToday = dt.getFullYear() === today.getFullYear() && dt.getMonth() === today.getMonth() && dt.getDate() === today.getDate();
  const label = dt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  return isToday ? `Tonight — ${label}` : label;
}

const SIGNUP_META: Record<SignupStatus, { label: string; color: string; bg: string }> = {
  in: { label: 'In', color: 'var(--good)', bg: 'var(--good-dim)' },
  late: { label: 'Late', color: 'var(--gold)', bg: 'oklch(0.78 0.14 85 / 15%)' },
  out: { label: 'Out', color: 'var(--bad)', bg: 'var(--bad-dim)' },
};

function RaidSignupsCard({
  group,
  signups,
  myUserId,
  onSet,
}: {
  group: GroupDetail;
  signups: RaidSignup[];
  myUserId: string;
  onSet: (date: string, status: SignupStatus | null) => void;
}) {
  const dates = upcomingRaidDates(group.raidDays, 3);
  const [openDate, setOpenDate] = useState<string | null>(null);
  const shown = openDate && dates.includes(openDate) ? openDate : dates[0];

  if (dates.length === 0) {
    return (
      <Card style={{ padding: '16px 20px' }}>
        <div style={{ font: '700 13.5px var(--font-sans)', marginBottom: 6 }}>Raid Signups</div>
        <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-55)' }}>
          Set raid days in the schedule above and members can RSVP for each raid night here.
        </div>
      </Card>
    );
  }

  const byUser = new Map(signups.filter((s) => s.date === shown).map((s) => [s.userId, s.status]));
  const counts = { in: 0, late: 0, out: 0 } as Record<SignupStatus, number>;
  for (const status of byUser.values()) counts[status]++;
  const noReply = group.members.length - byUser.size;
  const mine = byUser.get(myUserId) ?? null;

  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', flexWrap: 'wrap' }}>
        <div style={{ font: '700 13.5px var(--font-sans)' }}>Raid Signups</div>
        {group.raidStartTime && (
          <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-55)' }}>
            {group.raidStartTime}
            {group.raidTimezone ? ` ${group.raidTimezone}` : ''}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {dates.map((d) => {
            const active = d === shown;
            return (
              <button
                key={d}
                onClick={() => setOpenDate(d)}
                className={active ? undefined : 'u-chip'}
                style={{
                  padding: '5px 12px',
                  borderRadius: 14,
                  font: '600 11.5px var(--font-sans)',
                  background: active ? 'oklch(0.78 0.14 85 / 18%)' : 'oklch(1 0 0 / 4%)',
                  color: active ? 'var(--gold)' : 'var(--text-60)',
                  border: `1px solid ${active ? 'oklch(0.78 0.14 85 / 35%)' : 'var(--border)'}`,
                }}
              >
                {signupDateLabel(d)}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--border-faint)', flexWrap: 'wrap' }}>
        <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text-62)' }}>Your status:</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(Object.keys(SIGNUP_META) as SignupStatus[]).map((s) => {
            const meta = SIGNUP_META[s];
            const active = mine === s;
            return (
              <button
                key={s}
                onClick={() => onSet(shown, active ? null : s)}
                title={active ? 'Click again to clear your RSVP' : undefined}
                className={active ? undefined : 'u-chip'}
                style={{
                  padding: '6px 16px',
                  borderRadius: 16,
                  font: '700 12px var(--font-sans)',
                  background: active ? meta.bg : 'oklch(1 0 0 / 4%)',
                  color: active ? meta.color : 'var(--text-60)',
                  border: `1px solid ${active ? `color-mix(in oklab, ${meta.color} 40%, transparent)` : 'var(--border)'}`,
                }}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
        <div style={{ font: '500 11.5px var(--font-sans)', color: 'var(--text-55)', marginLeft: 'auto' }}>
          {counts.in} in · {counts.late} late · {counts.out} out · {noReply} no reply
        </div>
      </div>

      <div style={{ padding: '10px 20px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {group.members.map((m) => {
          const status = byUser.get(m.userId);
          const meta = status ? SIGNUP_META[status] : null;
          return (
            <span
              key={m.userId}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 14,
                font: '600 11px var(--font-sans)',
                background: meta ? meta.bg : 'oklch(1 0 0 / 3%)',
                color: meta ? meta.color : 'var(--text-50)',
                border: `1px solid ${meta ? `color-mix(in oklab, ${meta.color} 30%, transparent)` : 'var(--border)'}`,
              }}
            >
              {m.account ?? m.username}
              <span style={{ font: '700 9px var(--font-sans)', letterSpacing: '.4px', textTransform: 'uppercase', opacity: 0.85 }}>
                {meta ? meta.label : '—'}
              </span>
            </span>
          );
        })}
      </div>
    </Card>
  );
}

const REMINDER_LEAD_OPTIONS = [
  { mins: 30, label: '30 minutes before' },
  { mins: 60, label: '1 hour before' },
  { mins: 120, label: '2 hours before' },
  { mins: 240, label: '4 hours before' },
  { mins: 720, label: '12 hours before' },
];

function DiscordRemindersCard({ groupId }: { groupId: string }) {
  const [nonce, setNonce] = useState(0);
  const { data: settings } = useApiQuery(() => api.groupReminders(groupId), [groupId, nonce]);
  const [webhookInput, setWebhookInput] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>, successMessage: string) {
    setBusy(true);
    try {
      await action();
      toast.success(successMessage);
      setWebhookInput('');
      setNonce((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  if (!settings) return null;

  return (
    <Card style={{ padding: '16px 20px' }}>
      <div style={{ font: '700 13.5px var(--font-sans)', marginBottom: 4 }}>Discord Reminders</div>
      <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-55)', marginBottom: 12 }}>
        Posts the signup tally to a channel before each raid night. Create a webhook in Discord under
        Channel Settings → Integrations, then paste its URL here.
      </div>

      {settings.webhookConfigured ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 11px',
              borderRadius: 14,
              font: '600 11.5px var(--font-sans)',
              background: 'var(--good-dim)',
              color: 'var(--good)',
            }}
          >
            ✓ Webhook connected
          </span>
          <button
            className="u-btn-ghost"
            disabled={busy}
            onClick={() => run(() => api.testGroupReminder(groupId), 'Test reminder sent — check the channel')}
            style={smallBtnStyle}
          >
            Send test
          </button>
          <button
            className="u-btn-ghost"
            disabled={busy}
            onClick={() => run(() => api.setGroupReminders(groupId, { webhookUrl: null }), 'Webhook removed')}
            style={{ ...smallBtnStyle, color: 'var(--bad)' }}
          >
            Remove
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            placeholder="https://discord.com/api/webhooks/…"
            value={webhookInput}
            onChange={(e) => setWebhookInput(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
          <GoldButton
            disabled={busy || !webhookInput.trim()}
            onClick={() => run(() => api.setGroupReminders(groupId, { webhookUrl: webhookInput.trim() }), 'Webhook saved')}
          >
            Save
          </GoldButton>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ font: '600 11.5px var(--font-sans)', color: 'var(--text-62)' }}>Remind</div>
        <select
          value={settings.reminderMins}
          disabled={busy}
          onChange={(e) =>
            run(() => api.setGroupReminders(groupId, { reminderMins: Number(e.target.value) }), 'Reminder time updated')
          }
          style={{ ...inputStyle, padding: '7px 10px' }}
        >
          {REMINDER_LEAD_OPTIONS.map((o) => (
            <option key={o.mins} value={o.mins}>
              {o.label}
            </option>
          ))}
          {!REMINDER_LEAD_OPTIONS.some((o) => o.mins === settings.reminderMins) && (
            <option value={settings.reminderMins}>{settings.reminderMins} minutes before</option>
          )}
        </select>
      </div>
    </Card>
  );
}

// Shorten "Wing 5 — Hall of Chains" to "W5 · Hall of Chains" so the matrix
// rows don't spend half their width on the word "Wing".
function shortWing(wing: string): string {
  const m = wing.match(/^Wing (\d+) — (.+)$/);
  return m ? `W${m[1]} · ${m[2]}` : wing;
}

function WeeklyClearsCard({ clears }: { clears: GroupClears }) {
  const all = clears.wings.flatMap((w) => w.encounters);
  const done = all.filter((e) => e.killedThisWeek).length;
  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ font: '700 13.5px var(--font-sans)' }}>Weekly Clears</div>
        <div style={{ font: '700 12px var(--font-mono)', color: done === all.length && all.length > 0 ? 'var(--good)' : 'var(--gold)' }}>
          {done}/{all.length}
        </div>
        <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-50)', marginLeft: 'auto' }}>
          Resets Monday 07:30 UTC
        </div>
      </div>
      <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {clears.wings.map(({ wing, encounters }) => (
          <div key={wing} style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ font: '700 11.5px var(--font-sans)', color: 'var(--text-62)', width: 190, flex: 'none' }}>{shortWing(wing)}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 240 }}>
              {encounters.map((enc) => {
                const chip = (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 9px',
                      borderRadius: 14,
                      font: '600 11px var(--font-sans)',
                      background: enc.killedThisWeek ? 'var(--good-dim)' : 'oklch(1 0 0 / 4%)',
                      color: enc.killedThisWeek ? 'var(--good)' : 'var(--text-50)',
                      border: `1px solid ${enc.killedThisWeek ? 'color-mix(in oklab, var(--good) 30%, transparent)' : 'var(--border)'}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span aria-hidden style={{ font: '800 10px var(--font-sans)' }}>{enc.killedThisWeek ? '✓' : '·'}</span>
                    {enc.fightName}
                    {enc.cmThisWeek && (
                      <span style={{ font: '800 8.5px var(--font-sans)', letterSpacing: '.4px', padding: '1px 4px', borderRadius: 4, background: 'oklch(0.78 0.14 85 / 18%)', color: 'var(--gold)' }}>
                        CM
                      </span>
                    )}
                  </span>
                );
                return enc.lastKill ? (
                  <Link key={enc.fightName} to={`/logs/${enc.lastKill.logId}`} className="u-chip" title={`Last kill ${new Date(enc.lastKill.date).toLocaleDateString()}`} style={{ borderRadius: 14 }}>
                    {chip}
                  </Link>
                ) : (
                  <span key={enc.fightName} title="Never killed by this group">{chip}</span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Coverage buckets for a standard 10-player squad: two of each boon source
// and two healers. qdps/qheal both count as quickness sources (same for
// alacrity) — what matters for comp-building is "who can bring the boon",
// not whether they do it from a heal or DPS chair.
const READINESS_BUCKETS: { key: string; label: string; cats: BuildCategory[]; need?: number }[] = [
  { key: 'quick', label: 'Quickness', cats: ['qdps', 'qheal'], need: 2 },
  { key: 'alac', label: 'Alacrity', cats: ['adps', 'aheal'], need: 2 },
  { key: 'heal', label: 'Healer', cats: ['qheal', 'aheal'], need: 2 },
  { key: 'dps', label: 'DPS', cats: ['pdps', 'cdps'] },
];

function RosterReadinessCard({
  members: allMembers,
  roster,
  builds,
  nextNight,
}: {
  members: GroupDetail['members'];
  roster: RosterCharacter[];
  builds: BuildEntry[];
  // Present when the next raid night has RSVPs — enables the
  // "confirmed only" filter (in + late count as attending).
  nextNight: { date: string; confirmed: Set<string> } | null;
}) {
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const members = confirmedOnly && nextNight ? allMembers.filter((m) => nextNight.confirmed.has(m.userId)) : allMembers;
  const buildById = new Map(builds.map((b) => [b.id, b]));

  // owner (account ?? discord) → assigned (character, build) pairs across
  // every character tab that has a build assigned.
  const assignedByOwner = new Map<string, { charName: string; build: BuildEntry }[]>();
  for (const ch of roster) {
    for (const t of ch.templates) {
      const build = t.assignedBuildId ? buildById.get(t.assignedBuildId) : undefined;
      if (!build) continue;
      const list = assignedByOwner.get(ch.owner) ?? [];
      list.push({ charName: ch.name, build });
      assignedByOwner.set(ch.owner, list);
    }
  }

  const coverage = READINESS_BUCKETS.map((bucket) => {
    const providers = members.filter((m) =>
      (assignedByOwner.get(m.account ?? m.username) ?? []).some((a) => bucket.cats.includes(a.build.cat)),
    );
    return { bucket, count: providers.length, short: bucket.need != null && providers.length < bucket.need };
  });

  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', flexWrap: 'wrap' }}>
        <div style={{ font: '700 13.5px var(--font-sans)' }}>Roster Readiness</div>
        {nextNight && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, font: '500 11.5px var(--font-sans)', color: 'var(--text-62)', cursor: 'pointer' }}>
            <input type="checkbox" checked={confirmedOnly} onChange={(e) => setConfirmedOnly(e.target.checked)} />
            Confirmed for {signupDateLabel(nextNight.date)} only
          </label>
        )}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {coverage.map(({ bucket, count, short }) => (
            <span
              key={bucket.key}
              title={short ? `A 10-player squad usually needs ${bucket.need} ${bucket.label.toLowerCase()} sources` : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 9px',
                borderRadius: 12,
                font: '600 11px var(--font-sans)',
                background: short ? 'var(--bad-dim)' : 'var(--good-dim)',
                color: short ? 'var(--bad)' : 'var(--good)',
              }}
            >
              {bucket.label} {count}
              {short && ' ⚠'}
            </span>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 760 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.1fr 1fr 1fr 1fr 1.4fr',
              gap: 8,
              padding: '10px 20px',
              font: '700 10px var(--font-sans)',
              textTransform: 'uppercase',
              letterSpacing: '.5px',
              color: 'var(--text-55)',
              borderBottom: '1px solid var(--border-soft)',
            }}
          >
            <div>Member</div>
            {READINESS_BUCKETS.map((b) => (
              <div key={b.key}>{b.label}</div>
            ))}
          </div>
          {members.map((m, i) => {
            const label = m.account ?? m.username;
            const assigned = assignedByOwner.get(label) ?? [];
            return (
              <div
                key={m.userId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.1fr 1fr 1fr 1fr 1.4fr',
                  gap: 8,
                  alignItems: 'start',
                  padding: '10px 20px',
                  borderBottom: i === members.length - 1 ? 'none' : '1px solid var(--border-faint)',
                }}
              >
                <div style={{ font: '600 12.5px var(--font-sans)', paddingTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>
                  {label}
                </div>
                {assigned.length === 0 ? (
                  <div style={{ gridColumn: 'span 4', font: '400 11.5px var(--font-sans)', color: 'var(--text-50)', paddingTop: 2 }}>
                    No builds assigned — assign builds on the Characters page to appear here.
                  </div>
                ) : (
                  READINESS_BUCKETS.map((bucket) => (
                    <div key={bucket.key} style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {assigned
                        .filter((a) => bucket.cats.includes(a.build.cat))
                        .map((a, j) => (
                          <span
                            key={`${a.build.id}-${j}`}
                            title={`${a.charName} — ${a.build.name} (${CAT[a.build.cat].label})`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '3px 8px',
                              borderRadius: 10,
                              font: '600 10.5px var(--font-sans)',
                              background: 'oklch(1 0 0 / 5%)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-80)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: PROF[a.build.p]?.c ?? 'var(--text-55)', flex: 'none' }} />
                            {a.build.name}
                          </span>
                        ))}
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
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
  padding: '9px 14px',
  borderRadius: 10,
  background: 'var(--bg-chip)',
  color: 'var(--text-80)',
  border: '1px solid var(--border)',
} as const;

const smallBtnStyle = {
  font: '600 11px var(--font-sans)',
  padding: '6px 10px',
  borderRadius: 8,
  background: 'var(--bg-chip)',
  color: 'var(--text-80)',
  border: '1px solid var(--border)',
} as const;
