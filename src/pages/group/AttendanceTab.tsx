import { api, type AttendanceNight, type GroupDetail } from '../../lib/api';
import { useApiQuery } from '../../hooks/useApiQuery';
import { Card } from '../../components/atoms';
import { LoadingState, ErrorState, EmptyState } from '../../components/QueryStates';

// Attendance tab: members × recent raid nights. "Attended" is measured
// from the group's logs (the member's GW2 account appeared in at least
// one log that night) — RSVPs fill in the story where logs can't: a red
// ✗ for a called-out absence, an amber ! for an RSVP'd-In no-show.
export default function AttendanceTab({ group, groupId }: { group: GroupDetail; groupId: string }) {
  const isMember = group.myRole !== null;
  const { data, loading, error } = useApiQuery(
    () => (isMember ? api.groupAttendance(groupId) : Promise.resolve(null)),
    [groupId, isMember],
  );

  if (!isMember) return <EmptyState>Attendance history is visible to group members only.</EmptyState>;
  if (loading) return <LoadingState label="Loading attendance…" />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.nights.length === 0) {
    return <EmptyState>No raid nights recorded yet — attendance builds up from group logs and RSVPs.</EmptyState>;
  }

  // Only nights that actually produced logs count toward the rate — a
  // signup-only night (e.g. tonight, before the raid) proves nothing
  // about who showed up.
  const logNights = data.nights.filter((n) => n.logCount > 0);

  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', flexWrap: 'wrap' }}>
        <div style={{ font: '700 13.5px var(--font-sans)' }}>Attendance</div>
        <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-55)' }}>
          last {data.nights.length} raid night{data.nights.length === 1 ? '' : 's'}
        </div>
        <div style={{ display: 'flex', gap: 12, marginLeft: 'auto', flexWrap: 'wrap', font: '500 10.5px var(--font-sans)', color: 'var(--text-55)' }}>
          <span><span style={{ color: 'var(--good)', fontWeight: 800 }}>✓</span> raided</span>
          <span><span style={{ color: 'var(--bad)', fontWeight: 800 }}>✗</span> called out</span>
          <span><span style={{ color: 'var(--gold)', fontWeight: 800 }}>!</span> in, but absent</span>
          <span><span style={{ color: 'var(--text-50)', fontWeight: 800 }}>·</span> no record</span>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 520 + data.nights.length * 64 }}>
          <div style={{ display: 'grid', gridTemplateColumns: gridColumns(data.nights.length), gap: 4, padding: '10px 20px', borderBottom: '1px solid var(--border-soft)' }}>
            <div style={{ font: '700 10px var(--font-sans)', textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text-55)', alignSelf: 'end' }}>
              Member
            </div>
            {data.nights.map((n) => (
              <div key={n.date} style={{ textAlign: 'center' }}>
                <div style={{ font: '700 10.5px var(--font-sans)', color: 'var(--text-70)' }}>{shortDate(n.date)}</div>
                <div style={{ font: '400 9.5px var(--font-sans)', color: 'var(--text-50)' }}>
                  {n.logCount > 0 ? `${n.kills}/${n.logCount} kills` : 'RSVP only'}
                </div>
              </div>
            ))}
            <div style={{ font: '700 10px var(--font-sans)', textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text-55)', textAlign: 'right', alignSelf: 'end' }}>
              Rate
            </div>
          </div>

          {data.members.map((m, i) => {
            const attendedCount = logNights.filter((n) => n.attended.includes(m.userId)).length;
            const rate = logNights.length > 0 ? Math.round((attendedCount / logNights.length) * 100) : null;
            return (
              <div
                key={m.userId}
                style={{
                  display: 'grid',
                  gridTemplateColumns: gridColumns(data.nights.length),
                  gap: 4,
                  alignItems: 'center',
                  padding: '9px 20px',
                  borderBottom: i === data.members.length - 1 ? 'none' : '1px solid var(--border-faint)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: '600 12.5px var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.name}>
                    {m.name}
                  </div>
                  {!m.linked && (
                    <div style={{ font: '400 9.5px var(--font-sans)', color: 'var(--text-50)' }} title="Log attendance can't be matched without a linked GW2 account — cells show RSVPs only.">
                      GW2 account not linked
                    </div>
                  )}
                </div>
                {data.nights.map((n) => (
                  <NightCell key={n.date} night={n} userId={m.userId} linked={m.linked} />
                ))}
                <div style={{ font: '700 12px var(--font-mono)', textAlign: 'right', color: rate === null ? 'var(--text-50)' : rate >= 75 ? 'var(--good)' : rate >= 40 ? 'var(--gold)' : 'var(--bad)' }}>
                  {rate === null || !m.linked ? '—' : `${rate}%`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function gridColumns(nightCount: number): string {
  return `minmax(150px, 1.4fr) repeat(${nightCount}, minmax(56px, 1fr)) 60px`;
}

function shortDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
}

function NightCell({ night, userId, linked }: { night: AttendanceNight; userId: string; linked: boolean }) {
  const attended = night.attended.includes(userId);
  const signup = night.signups[userId];

  let glyph = '·';
  let color = 'var(--text-50)';
  let title = 'No record';
  if (attended) {
    glyph = '✓';
    color = 'var(--good)';
    title = `Appeared in the group's logs${signup ? ` (RSVP'd ${signup})` : ''}`;
  } else if (night.logCount > 0 && linked) {
    if (signup === 'out') {
      glyph = '✗';
      color = 'var(--bad)';
      title = 'Called out';
    } else if (signup === 'in' || signup === 'late') {
      glyph = '!';
      color = 'var(--gold)';
      title = `RSVP'd ${signup} but never appeared in a log`;
    }
  } else if (signup) {
    // Signup-only night (no logs yet) or unlinked member: the RSVP is the
    // only signal there is, so show it as a letter instead of guessing.
    glyph = signup === 'in' ? 'I' : signup === 'late' ? 'L' : 'O';
    color = signup === 'out' ? 'var(--bad)' : signup === 'late' ? 'var(--gold)' : 'var(--good)';
    title = `RSVP'd ${signup}`;
  }

  return (
    <div title={title} style={{ textAlign: 'center', font: '800 13px var(--font-sans)', color }}>
      {glyph}
    </div>
  );
}
