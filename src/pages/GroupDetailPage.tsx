import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, type GroupDetail, type LogListItem } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { toast } from '../lib/toast';
import { Avatar, Card, GoldButton, LoadMoreButton, ParseBadge, ResultPill } from '../components/atoms';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';
import { DURATION_OPTIONS_MINS, WEEKDAYS, formatDurationMins, formatSchedule } from '../data/schedule';

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
              style={{ ...ghostBtnStyle, color: 'var(--bad)' }}
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
              <Avatar size={28} name={m.username} imgSrc={m.avatar} to={`/players/${encodeURIComponent(m.username)}`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link to={`/players/${encodeURIComponent(m.username)}`} style={{ font: '600 13px var(--font-sans)' }}>
                  {m.username}
                </Link>
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
                    <button onClick={() => run(() => api.setGroupMemberRole(id, m.userId, 'promote'), `Promoted ${m.username} to subleader`)} style={smallBtnStyle}>
                      Promote
                    </button>
                  )}
                  {m.role === 'subleader' && (
                    <>
                      <button onClick={() => run(() => api.setGroupMemberRole(id, m.userId, 'demote'), `Demoted ${m.username} to member`)} style={smallBtnStyle}>
                        Demote
                      </button>
                      <button onClick={() => run(() => api.setGroupMemberRole(id, m.userId, 'makeleader'), `${m.username} is now the leader`)} style={smallBtnStyle}>
                        Make leader
                      </button>
                    </>
                  )}
                  <button onClick={() => run(() => api.removeGroupMember(id, m.userId), `Removed ${m.username}`)} style={{ ...smallBtnStyle, color: 'var(--bad)' }}>
                    Remove
                  </button>
                </div>
              )}
              {group.canManage && group.myRole !== 'leader' && m.role === 'member' && (
                <button onClick={() => run(() => api.removeGroupMember(id, m.userId), `Removed ${m.username}`)} style={{ ...smallBtnStyle, color: 'var(--bad)' }}>
                  Remove
                </button>
              )}
            </div>
          ))}
        </Card>

        {group.canManage && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Card style={{ padding: '16px 20px' }}>
              <div style={{ font: '700 13.5px var(--font-sans)', marginBottom: 10 }}>Invite by Discord username</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="Discord username" value={inviteName} onChange={(e) => setInviteName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <GoldButton onClick={handleInvite}>Invite</GoldButton>
              </div>
              {inviteError && <div style={{ marginTop: 8, font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{inviteError}</div>}
            </Card>

            <Card style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', font: '700 13.5px var(--font-sans)' }}>
                Join requests
              </div>
              {requests?.length === 0 && (
                <div style={{ padding: 20, font: '500 12px var(--font-sans)', color: 'var(--text-55)' }}>No pending requests.</div>
              )}
              {requests?.map((r) => (
                <div key={r.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', borderBottom: '1px solid var(--border-faint)' }}>
                  <Avatar size={26} name={r.username} imgSrc={r.avatar} />
                  <div style={{ flex: 1, font: '600 12.5px var(--font-sans)' }}>{r.username}</div>
                  <button onClick={() => run(() => api.approveJoinRequest(id, r.userId), `${r.username} joined the group`)} style={smallBtnStyle}>
                    Approve
                  </button>
                  <button onClick={() => run(() => api.denyJoinRequest(id, r.userId), `Denied ${r.username}'s request`)} style={{ ...smallBtnStyle, color: 'var(--bad)' }}>
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
