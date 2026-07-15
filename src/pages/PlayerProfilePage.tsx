import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { LoadingState, ErrorState } from '../components/QueryStates';

export default function PlayerProfilePage() {
  const { name = '' } = useParams();
  const { data: player, loading, error } = useApiQuery(() => api.player(name), [name]);

  if (loading) return <LoadingState label="Loading profile…" />;
  if (error) return <ErrorState message={error === 'Player not found' ? `No logs found for ${name} yet.` : error} />;
  if (!player) return null;

  return (
    <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 0 40px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          padding: '26px 28px',
          background: 'var(--bg-header)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'repeating-linear-gradient(115deg,rgba(224,180,88,.25) 0 6px,rgba(224,180,88,.08) 6px 12px)',
            flex: 'none',
          }}
        />
        <div style={{ flex: 1 }}>
          <h1 style={{ font: '800 24px var(--font-sans)', color: 'var(--text)' }}>{player.displayName}</h1>
          <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-45)', marginTop: 4 }}>{player.account}</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ textAlign: 'center', padding: '10px 22px', background: 'var(--gold-dim)', borderRadius: 8 }}>
            <div style={{ font: '800 26px var(--font-mono)', color: 'var(--gold)' }}>{player.totalLogs}</div>
            <div style={{ font: '600 10px var(--font-sans)', color: 'var(--text-45)', textTransform: 'uppercase' }}>
              Logs uploaded
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '10px 22px', background: 'var(--gold-dim)', borderRadius: 8 }}>
            <div style={{ font: '800 26px var(--font-mono)', color: 'var(--gold)' }}>{player.overallScore ?? '—'}</div>
            <div style={{ font: '600 10px var(--font-sans)', color: 'var(--text-45)', textTransform: 'uppercase' }}>
              Overall score
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '10px 22px', background: 'var(--gold-dim)', borderRadius: 8 }}>
            <div style={{ font: '800 26px var(--font-mono)', color: 'var(--gold)' }}>{player.consistencyScore ?? '—'}</div>
            <div style={{ font: '600 10px var(--font-sans)', color: 'var(--text-45)', textTransform: 'uppercase' }}>
              Consistency
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, padding: '24px 28px 0', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 480px', minWidth: 0 }}>
          <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text-45)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
            Best parses
          </div>
          {player.bestParses.length === 0 && (
            <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-40)' }}>No logs yet.</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {player.bestParses.map((bp) => (
              <Link
                key={bp.logId}
                to={`/logs/${bp.logId}`}
                style={{ background: 'var(--bg-row)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}
              >
                <div style={{ font: '700 13px var(--font-sans)', color: 'var(--text)', marginBottom: 4 }}>
                  {bp.boss}{bp.isCm ? ' CM' : ''}
                </div>
                <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-50)', marginBottom: 10 }}>{bp.spec}</div>
                <span style={{ font: '700 16px var(--font-mono)', color: 'var(--text)' }}>{bp.dps.toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </div>

        <div style={{ width: 260, flex: 'none' }}>
          <div style={{ background: 'var(--bg-row)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
            <div style={{ font: '600 11px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', marginBottom: 12 }}>
              Profession breakdown
            </div>
            {player.professionBreakdown.map((pb) => (
              <div key={pb.profession} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', font: '500 11px var(--font-sans)', color: 'var(--text-60)', marginBottom: 4 }}>
                  <span>{pb.profession}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{pb.pct}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,.06)', borderRadius: 3 }}>
                  <div style={{ height: 6, width: `${pb.pct}%`, background: 'var(--gold)', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 28px 0' }}>
        <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text-45)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
          Recent uploads
        </div>
        {player.recent.length === 0 && (
          <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-40)' }}>Nothing uploaded yet.</div>
        )}
        {player.recent.map((r) => (
          <Link
            key={r.logId}
            to={`/logs/${r.logId}`}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ font: '700 13px var(--font-sans)', color: 'var(--text)' }}>
                {r.boss}{r.isCm ? ' CM' : ''}
              </div>
              <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-40)' }}>
                {r.spec} · {new Date(r.uploadedAt).toLocaleString()}
              </div>
            </div>
            <div style={{ font: '700 13px var(--font-mono)', color: 'var(--text)' }}>{r.dps.toLocaleString()} dps</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
