import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { LoadingState, ErrorState } from '../components/QueryStates';
import { Badge, Card } from '../components/atoms';

export default function GuildPage() {
  const { tag = '' } = useParams();
  const { data: guild, loading, error } = useApiQuery(() => api.guildRoster(tag), [tag]);

  if (loading) return <LoadingState label="Loading guild…" />;
  if (error) return <ErrorState message={error} />;
  if (!guild) return null;

  return (
    <div>
      <div style={{ font: '800 22px var(--font-sans)', marginBottom: 4 }}>
        {guild.name} <span style={{ color: 'var(--gold)' }}>[{guild.tag}]</span>
      </div>
      <div style={{ font: '400 13px var(--font-sans)', color: 'var(--text-60)', marginBottom: 20 }}>
        {guild.memberCount} member{guild.memberCount === 1 ? '' : 's'} linked
      </div>

      <Card style={{ overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: 8,
            padding: '12px 20px',
            font: '700 10.5px var(--font-sans)',
            textTransform: 'uppercase',
            letterSpacing: '.5px',
            color: 'var(--text-55)',
            borderBottom: '1px solid var(--border-soft)',
          }}
        >
          <div>Member</div>
          <div>Best spec</div>
          <div>Logs (7d)</div>
          <div>Total logs</div>
        </div>
        {guild.roster.map((m, i) => (
          <div
            key={m.account ?? m.displayName}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              gap: 8,
              alignItems: 'center',
              padding: '12px 20px',
              borderBottom: i === guild.roster.length - 1 ? 'none' : '1px solid var(--border-faint)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {m.account ? (
                <Link to={`/players/${encodeURIComponent(m.account)}`} style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>
                  {m.displayName}
                </Link>
              ) : (
                <span style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>{m.displayName}</span>
              )}
              {m.isLeader && <Badge>Leader</Badge>}
            </div>
            <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-62)' }}>{m.bestSpec ?? '—'}</div>
            <div style={{ font: '400 12px var(--font-mono)', color: 'var(--text-70)' }}>{m.logsThisWeek}</div>
            <div style={{ font: '400 12px var(--font-mono)', color: 'var(--text-70)' }}>{m.totalLogs}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}
