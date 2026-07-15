import { useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { Card, GoldButton } from '../components/atoms';
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
      <div style={{ maxWidth: 560, margin: '80px auto 0' }}>
        <Card style={{ padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ font: '800 20px var(--font-sans)', color: 'var(--text)', marginBottom: 10 }}>
            Pick two parses to compare
          </div>
          <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-55)', lineHeight: 1.6, marginBottom: 20 }}>
            Select two players on the Leaderboards page, or two squad members on a Fight Report's Squad tab, and hit
            Compare — this page fills in once a pairing is picked that way.
          </div>
          <GoldButton to="/leaderboards">Go to Leaderboards</GoldButton>
        </Card>
      </div>
    );
  }

  if (loading) return <LoadingState label="Loading comparison…" />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Card style={{ overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border-soft)' }}>
          <div style={{ padding: '22px 28px', textAlign: 'center', borderRight: '1px solid var(--border-soft)' }}>
            <div style={{ font: '800 20px var(--font-sans)', color: 'var(--text)' }}>{data.playerA.name}</div>
            <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-55)', marginTop: 4 }}>{data.playerA.spec}</div>
          </div>
          <div style={{ padding: '22px 28px', textAlign: 'center' }}>
            <div style={{ font: '800 20px var(--font-sans)', color: 'var(--text)' }}>{data.playerB.name}</div>
            <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-55)', marginTop: 4 }}>{data.playerB.spec}</div>
          </div>
        </div>

        <div style={{ padding: '20px 28px 28px' }}>
          <div style={{ textAlign: 'center', font: '700 11.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 18 }}>
            {data.playerA.boss} — head to head
          </div>
          {data.rows.map((row) => (
            <div key={row.label} style={{ marginBottom: 14 }}>
              <div style={{ textAlign: 'center', font: '600 12px var(--font-sans)', color: 'var(--text-70)', marginBottom: 6 }}>
                {row.label}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row-reverse' }}>
                  <div style={{ font: '700 13px var(--font-mono)', color: 'var(--text)', width: 64, textAlign: 'left' }}>{row.a.toLocaleString()}</div>
                  <div style={{ flex: 1, height: 8, background: 'var(--bg-chip)', borderRadius: 4, overflow: 'hidden', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: `${row.aPct}%`, height: 8, background: 'var(--gold)', borderRadius: 4 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 8, background: 'var(--bg-chip)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${row.bPct}%`, height: 8, background: 'var(--blue)', borderRadius: 4 }} />
                  </div>
                  <div style={{ font: '700 13px var(--font-mono)', color: 'var(--text)', width: 64 }}>{row.b.toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
