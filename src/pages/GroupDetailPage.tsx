import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Avatar, Card, GoldButton } from '../components/atoms';
import { LoadingState, ErrorState } from '../components/QueryStates';

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

  const [inviteName, setInviteName] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading) return <LoadingState label="Loading group…" />;
  if (error) return <ErrorState message={error} />;
  if (!group) return null;

  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Action failed');
    }
  }

  async function handleInvite() {
    if (!inviteName.trim()) return;
    setInviteError(null);
    try {
      await api.inviteToGroup(id, inviteName.trim());
      setInviteName('');
      refetch();
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : 'Failed to invite');
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
            <GoldButton onClick={() => run(() => api.requestToJoinGroup(id))}>Request to join</GoldButton>
          )}
          {group.myRole === 'leader' && (
            <button
              onClick={() => {
                if (confirm(`Delete "${group.name}"? This cannot be undone.`)) run(() => api.deleteGroup(id));
              }}
              style={{ ...ghostBtnStyle, color: 'var(--bad)' }}
            >
              Delete group
            </button>
          )}
        </div>
      </Card>

      {actionError && <div style={{ marginBottom: 16, font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{actionError}</div>}

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
                    <button onClick={() => run(() => api.setGroupMemberRole(id, m.userId, 'promote'))} style={smallBtnStyle}>
                      Promote
                    </button>
                  )}
                  {m.role === 'subleader' && (
                    <>
                      <button onClick={() => run(() => api.setGroupMemberRole(id, m.userId, 'demote'))} style={smallBtnStyle}>
                        Demote
                      </button>
                      <button onClick={() => run(() => api.setGroupMemberRole(id, m.userId, 'makeleader'))} style={smallBtnStyle}>
                        Make leader
                      </button>
                    </>
                  )}
                  <button onClick={() => run(() => api.removeGroupMember(id, m.userId))} style={{ ...smallBtnStyle, color: 'var(--bad)' }}>
                    Remove
                  </button>
                </div>
              )}
              {group.canManage && group.myRole !== 'leader' && m.role === 'member' && (
                <button onClick={() => run(() => api.removeGroupMember(id, m.userId))} style={{ ...smallBtnStyle, color: 'var(--bad)' }}>
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
                  <button onClick={() => run(() => api.approveJoinRequest(id, r.userId))} style={smallBtnStyle}>
                    Approve
                  </button>
                  <button onClick={() => run(() => api.denyJoinRequest(id, r.userId))} style={{ ...smallBtnStyle, color: 'var(--bad)' }}>
                    Deny
                  </button>
                </div>
              ))}
            </Card>
          </div>
        )}
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
