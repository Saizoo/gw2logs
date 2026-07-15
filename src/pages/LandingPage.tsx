import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { professionColor } from '../data/gw2-data';
import { ProfDot } from '../components/atoms';
import { LoadingState, ErrorState } from '../components/QueryStates';

const STEPS = [
  {
    title: '1. Upload your log',
    body: 'Drag in a .zevtc from arcdps — no account required. It\'s parsed automatically in the background.',
  },
  {
    title: '2. See the breakdown',
    body: 'Full squad DPS, boon uptimes, mechanics, and per-player stats, the moment parsing finishes.',
  },
  {
    title: '3. Rank & compare',
    body: 'See where you land on the global leaderboard for that boss, and compare any two parses side by side.',
  },
];

export default function LandingPage() {
  const { data: stats } = useApiQuery(() => api.stats(), []);
  const { data: home, loading, error } = useApiQuery(() => api.home(), []);

  return (
    <div>
      <div
        style={{
          position: 'relative',
          padding: '56px 28px',
          background: 'linear-gradient(160deg,#241a10,#0f0d0a 80%)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
            background: 'repeating-linear-gradient(115deg,rgba(224,180,88,.06) 0 12px,rgba(224,180,88,.015) 12px 24px)',
          }}
        />
        <div style={{ position: 'relative', maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ font: '800 34px var(--font-sans)', color: 'var(--text)', lineHeight: 1.2 }}>
            Every log makes
            <br />
            the rankings sharper.
          </div>
          <div style={{ font: '500 14px var(--font-sans)', color: 'var(--text-50)', marginTop: 16, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
            Upload arcdps combat logs, get an instant breakdown, and see how you stack up against the whole
            community — patch over patch.
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 26 }}>
            <Link
              to="/upload"
              style={{ padding: '11px 22px', background: 'var(--gold)', borderRadius: 8, font: '700 13px var(--font-sans)', color: '#14120f' }}
            >
              Upload a log
            </Link>
            <Link
              to="/encounters"
              style={{ padding: '11px 22px', border: '1px solid rgba(224,180,88,.35)', borderRadius: 8, font: '700 13px var(--font-sans)', color: 'var(--gold)' }}
            >
              Browse encounters
            </Link>
          </div>
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 34 }}>
            <div>
              <div style={{ font: '800 24px var(--font-mono)', color: 'var(--gold)' }}>{stats?.totalLogs ?? '—'}</div>
              <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-40)' }}>logs parsed</div>
            </div>
            <div>
              <div style={{ font: '800 24px var(--font-mono)', color: 'var(--gold)' }}>{stats?.totalPlayers ?? '—'}</div>
              <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-40)' }}>players ranked</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '40px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 44 }}>
          {STEPS.map((s) => (
            <div key={s.title} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 18 }}>
              <div style={{ font: '700 14px var(--font-sans)', color: 'var(--gold)', marginBottom: 6 }}>{s.title}</div>
              <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-45)', lineHeight: 1.6 }}>{s.body}</div>
            </div>
          ))}
        </div>

        {loading && <LoadingState label="Loading highlights…" />}
        {error && <ErrorState message={error} />}

        {home && (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '2 1 480px', minWidth: 0 }}>
              <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text-45)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
                Highest DPS logged, by profession
              </div>
              {home.topByProfession.length === 0 ? (
                <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-40)' }}>
                  No logs uploaded yet — this fills in as parses come in.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                  {home.topByProfession.map((row) => (
                    <Link
                      key={row.profession}
                      to={`/logs/${row.logId}`}
                      style={{ background: 'var(--bg-row)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                        <ProfDot color={professionColor(row.profession)} />
                        <span style={{ font: '700 12px var(--font-sans)', color: 'var(--text)' }}>{row.profession}</span>
                      </div>
                      <div style={{ font: '800 20px var(--font-mono)', color: 'var(--gold)' }}>{row.dps.toLocaleString()}</div>
                      <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-45)', marginTop: 4 }}>
                        {row.name} · {row.spec}
                      </div>
                      <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-35)', marginTop: 2 }}>{row.boss}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: '1 1 300px', minWidth: 0 }}>
              <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text-45)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
                Recently uploaded
              </div>
              {home.recentLogs.length === 0 ? (
                <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-40)' }}>Nothing uploaded yet.</div>
              ) : (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  {home.recentLogs.map((log, i) => (
                    <Link
                      key={log.id}
                      to={`/logs/${log.id}`}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                        padding: '12px 16px', borderBottom: i === home.recentLogs.length - 1 ? 'none' : '1px solid var(--border-soft)',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ font: '700 13px var(--font-sans)', color: 'var(--text)' }}>
                          {log.boss}{log.isCm ? ' CM' : ''}
                        </div>
                        <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-40)' }}>
                          {log.playerCount} players · {new Date(log.uploadedAt).toLocaleString()}
                        </div>
                      </div>
                      <span
                        style={{
                          font: '600 10px var(--font-sans)', padding: '2px 8px', borderRadius: 4, flex: 'none',
                          background: log.success ? 'var(--good-dim)' : 'rgba(245,93,78,.15)',
                          color: log.success ? 'var(--good)' : 'var(--bad)',
                        }}
                      >
                        {log.success ? 'Kill' : 'Wipe'}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
