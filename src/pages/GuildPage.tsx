import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { LoadingState, ErrorState } from '../components/QueryStates';
import { Badge } from '../components/atoms';

export default function GuildPage() {
  const { tag = '' } = useParams();
  const { data: guild, loading, error } = useApiQuery(() => api.guildRoster(tag), [tag]);

  if (loading) return <LoadingState label="Loading guild…" />;
  if (error) return <ErrorState message={error} />;
  if (!guild) return null;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ font: '800 22px var(--font-sans)', color: 'var(--text)' }}>
          {guild.name} <span style={{ color: 'var(--gold)' }}>[{guild.tag}]</span>
        </h1>
        <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-40)', marginTop: 4 }}>
          {guild.memberCount} member{guild.memberCount === 1 ? '' : 's'} linked
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 16px',
            font: '600 10px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.04em',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div>Member</div>
          <div>Best spec</div>
          <div>Logs (7d)</div>
          <div>Total logs</div>
        </div>
        {guild.roster.map((m) => (
          <div
            key={m.account ?? m.displayName}
            style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '12px 16px', alignItems: 'center',
              borderBottom: '1px solid var(--border)',
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
            <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-45)' }}>{m.bestSpec ?? '—'}</div>
            <div style={{ font: '400 12px var(--font-mono)', color: 'var(--text-45)' }}>{m.logsThisWeek}</div>
            <div style={{ font: '400 12px var(--font-mono)', color: 'var(--text-45)' }}>{m.totalLogs}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
