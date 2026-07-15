import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { LoadingState, ErrorState } from '../components/QueryStates';

export default function ComparePage() {
  const [params] = useSearchParams();
  const logIdA = params.get('logIdA');
  const accountA = params.get('accountA');
  const logIdB = params.get('logIdB');
  const accountB = params.get('accountB');
  const ready = Boolean(logIdA && accountA && logIdB && accountB);

  const { data, loading, error } = useApiQuery(
    () => (ready ? api.compare(logIdA!, accountA!, logIdB!, accountB!) : Promise.resolve(null)),
    [logIdA, accountA, logIdB, accountB],
  );

  if (!ready) {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 28px', textAlign: 'center' }}>
        <div style={{ font: '800 22px var(--font-sans)', color: 'var(--text)', marginBottom: 12 }}>
          Pick two parses to compare
        </div>
        <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-45)', lineHeight: 1.6 }}>
          This tool works off real log data — open two players' logs for the same encounter and pass their
          log/account IDs here (<code>?logIdA=…&amp;accountA=…&amp;logIdB=…&amp;accountB=…</code>). A picker UI
          from the leaderboard is the natural next step.
        </div>
      </div>
    );
  }

  if (loading) return <LoadingState label="Loading comparison…" />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 0 40px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--bg-header)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '22px 28px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
          <div style={{ font: '800 20px var(--font-sans)', color: 'var(--text)' }}>{data.playerA.name}</div>
          <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-50)', marginTop: 4 }}>{data.playerA.spec}</div>
        </div>
        <div style={{ padding: '22px 28px', textAlign: 'center' }}>
          <div style={{ font: '800 20px var(--font-sans)', color: 'var(--text)' }}>{data.playerB.name}</div>
          <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-50)', marginTop: 4 }}>{data.playerB.spec}</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '20px 28px 28px' }}>
        <div style={{ textAlign: 'center', font: '600 12px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 16 }}>
          {data.playerA.boss} — head to head
        </div>
        {data.rows.map((row) => (
          <div key={row.label} style={{ marginBottom: 14 }}>
            <div style={{ textAlign: 'center', font: '600 12px var(--font-sans)', color: 'var(--text-60)', marginBottom: 6 }}>
              {row.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row-reverse' }}>
                <div style={{ font: '700 13px var(--font-mono)', color: 'var(--text)', width: 64, textAlign: 'left' }}>{row.a.toLocaleString()}</div>
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,.06)', borderRadius: 4, overflow: 'hidden', display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ width: `${row.aPct}%`, height: 8, background: 'var(--gold)', borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${row.bPct}%`, height: 8, background: 'var(--blue)', borderRadius: 4 }} />
                </div>
                <div style={{ font: '700 13px var(--font-mono)', color: 'var(--text)', width: 64 }}>{row.b.toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
