import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, type GroupDetail, type RosterCharacter } from '../../lib/api';
import { useApiQuery } from '../../hooks/useApiQuery';
import { toast } from '../../lib/toast';
import { Avatar, Card, GoldButton } from '../../components/atoms';
import { CAT, PROF, toBuildEntry, type BuildCategory, type BuildEntry } from '../../data/builds';
import { inputStyle, signupDateLabel, smallBtnStyle, upcomingRaidDates } from './shared';

// Roster tab: who's in the group and what they can play — members list,
// invite + join-request management, and the role-coverage readiness board.
export default function RosterTab({ group, groupId, onGroupChanged }: { group: GroupDetail; groupId: string; onGroupChanged: () => void }) {
  const isMember = group.myRole !== null;
  const { data: roster } = useApiQuery(
    () => (isMember ? api.groupRoster(groupId) : Promise.resolve(null)),
    [groupId, isMember],
  );
  const { data: buildRows } = useApiQuery(() => (isMember ? api.builds() : Promise.resolve(null)), [isMember]);
  const { data: signups } = useApiQuery(
    () => (isMember ? api.groupSignups(groupId) : Promise.resolve(null)),
    [groupId, isMember],
  );
  const { data: requests } = useApiQuery(
    () => (group.canManage ? api.groupJoinRequests(groupId) : Promise.resolve([])),
    [groupId, group.canManage],
  );

  const [inviteName, setInviteName] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, successMessage?: string) {
    try {
      await action();
      if (successMessage) toast.success(successMessage);
      onGroupChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    }
  }

  async function handleInvite() {
    if (!inviteName.trim()) return;
    setInviteError(null);
    try {
      const res = await api.inviteToGroup(groupId, inviteName.trim());
      toast.success(
        res.pendingSignup
          ? `Invite saved — ${inviteName.trim()} will see it when they sign in`
          : `Invited ${inviteName.trim()}`,
      );
      setInviteName('');
      onGroupChanged();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to invite';
      setInviteError(message);
      toast.error(message);
    }
  }

  const id = groupId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {isMember && roster && buildRows && (
        <RosterReadinessCard
          members={group.members}
          roster={roster}
          builds={buildRows.map(toBuildEntry)}
          nextNight={(() => {
            const next = upcomingRaidDates(group.raidDays, 1, group.resolvedTimezone)[0];
            if (!next || !signups) return null;
            const confirmed = new Set(
              signups.filter((s) => s.date === next && s.status !== 'out').map((s) => s.userId),
            );
            return confirmed.size > 0 ? { date: next, confirmed, timeZone: group.resolvedTimezone } : null;
          })()}
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: group.canManage ? '1.4fr 1fr' : '1fr', gap: 20, alignItems: 'start' }}>
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--border-soft)' }}>
            <div style={{ font: '700 13.5px var(--font-sans)' }}>Members</div>
            {group.guild && (
              <button
                className="u-btn-ghost"
                onClick={() =>
                  run(async () => {
                    const r = await api.syncGuildRanks(groupId);
                    toast.success(`Guild ranks synced — ${r.matched} member${r.matched === 1 ? '' : 's'} matched`);
                  })
                }
                title="Pull in-game ranks from the GW2 API (requires the guild leader's linked API key)"
                style={{ ...smallBtnStyle, marginLeft: 'auto' }}
              >
                Sync guild ranks
              </button>
            )}
          </div>
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
              {m.guildRank && (
                <span
                  title="In-game guild rank (from rank sync)"
                  style={{
                    font: '600 9.5px var(--font-sans)',
                    letterSpacing: '.3px',
                    padding: '2px 7px',
                    borderRadius: 5,
                    background: 'oklch(0.78 0.14 85 / 10%)',
                    color: 'oklch(0.8 0.1 85)',
                    border: '1px solid oklch(0.78 0.14 85 / 25%)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ⚜ {m.guildRank}
                </span>
              )}
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
    </div>
  );
}

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
  nextNight: { date: string; confirmed: Set<string>; timeZone: string } | null;
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
            Confirmed for {signupDateLabel(nextNight.date, nextNight.timeZone)} only
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
