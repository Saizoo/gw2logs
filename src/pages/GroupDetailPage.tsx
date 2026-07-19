import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { toast } from '../lib/toast';
import { Card, GoldButton, SubNav } from '../components/atoms';
import { LoadingState, ErrorState } from '../components/QueryStates';
import { ghostBtnStyle } from './group/shared';
import { GuildBadge } from './MyGroupsPage';
import OverviewTab from './group/OverviewTab';
import ThisWeekTab from './group/ThisWeekTab';
import RosterTab from './group/RosterTab';
import AttendanceTab from './group/AttendanceTab';
import LogsTab from './group/LogsTab';

// Shell for the group section: header card + sub-page tabs. Each tab
// fetches its own data so switching tabs never loads the whole page's
// worth of queries at once.
export default function GroupDetailPage() {
  const { id = '', tab } = useParams();
  const { user } = useCurrentUser();
  const [reloadNonce, setReloadNonce] = useState(0);
  const refetch = () => setReloadNonce((n) => n + 1);

  const { data: group, loading, error } = useApiQuery(() => api.group(id), [id, reloadNonce]);

  if (loading) return <LoadingState label="Loading group…" />;
  if (error) return <ErrorState message={error} />;
  if (!group) return null;

  async function run(action: () => Promise<unknown>, successMessage?: string) {
    try {
      await action();
      if (successMessage) toast.success(successMessage);
      refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Action failed');
    }
  }

  const isMember = group.myRole !== null;
  const active = tab === 'week' || tab === 'roster' || tab === 'attendance' || tab === 'logs' ? tab : 'overview';

  return (
    <div>
      <Card style={{ padding: '28px 32px', marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ font: '800 24px var(--font-sans)', letterSpacing: '-.3px' }}>{group.name}</div>
            {group.guild && <GuildBadge tag={group.guild.tag} />}
          </div>
          <div style={{ font: '400 13px var(--font-sans)', color: 'var(--text-62)', marginTop: 4 }}>
            Led by {group.leader} · {group.members.length} member{group.members.length === 1 ? '' : 's'}
            {group.guild && (
              <span style={{ color: 'var(--text-50)' }}>
                {' '}· guild roster{group.guild.lastRankSyncAt ? `, ranks synced ${new Date(group.guild.lastRankSyncAt).toLocaleDateString()}` : ', ranks not synced yet'}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isMember && <GoldButton to={`/planner?group=${id}`}>Open Encounter Planner</GoldButton>}
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

      <SubNav
        tabs={[
          { label: 'Overview', to: `/groups/${id}` },
          // The weekly plan is member-facing content; non-members browsing a
          // public group page have nothing to see there, so the tab is hidden.
          ...(isMember ? [{ label: 'This Week', to: `/groups/${id}/week` }] : []),
          { label: 'Roster', to: `/groups/${id}/roster` },
          { label: 'Attendance', to: `/groups/${id}/attendance` },
          { label: 'Logs', to: `/groups/${id}/logs` },
        ]}
      />

      {active === 'overview' && <OverviewTab group={group} groupId={id} onGroupChanged={refetch} />}
      {active === 'week' && isMember && <ThisWeekTab group={group} groupId={id} />}
      {active === 'roster' && <RosterTab group={group} groupId={id} onGroupChanged={refetch} />}
      {active === 'attendance' && <AttendanceTab group={group} groupId={id} />}
      {active === 'logs' && <LogsTab groupId={id} groupName={group.name} />}
    </div>
  );
}
