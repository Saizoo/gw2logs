import { COMPARE_DATA } from '../data/gw2-data';
import { RankPill } from '../components/atoms';

export default function ComparePage() {
  const { playerA, playerB, rows } = COMPARE_DATA;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 0 40px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--bg-header)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '22px 28px', textAlign: 'center', borderRight: '1px solid var(--border)' }}>
          <div style={{ font: '800 20px var(--font-sans)', color: 'var(--text)' }}>{playerA.name}</div>
          <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-50)', marginTop: 4 }}>{playerA.build}</div>
          <div style={{ marginTop: 10 }}>
            <RankPill pct={playerA.pct} color={playerA.rankColor} style={{ borderRadius: 20, padding: '3px 10px' }} />
          </div>
        </div>
        <div style={{ padding: '22px 28px', textAlign: 'center' }}>
          <div style={{ font: '800 20px var(--font-sans)', color: 'var(--text)' }}>{playerB.name}</div>
          <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-50)', marginTop: 4 }}>{playerB.build}</div>
          <div style={{ marginTop: 10 }}>
            <RankPill pct={playerB.pct} color={playerB.rankColor} style={{ borderRadius: 20, padding: '3px 10px' }} />
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '20px 28px 28px' }}>
        <div style={{ textAlign: 'center', font: '600 12px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 16 }}>
          {playerA.boss} — head to head
        </div>
        {rows.map((row) => (
          <div key={row.label} style={{ marginBottom: 14 }}>
            <div style={{ textAlign: 'center', font: '600 12px var(--font-sans)', color: 'var(--text-60)', marginBottom: 6 }}>
              {row.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row-reverse' }}>
                <div style={{ font: '700 13px var(--font-mono)', color: 'var(--text)', width: 64, textAlign: 'left' }}>{row.a}</div>
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,.06)', borderRadius: 4, overflow: 'hidden', display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ width: `${row.aPct}%`, height: 8, background: 'var(--gold)', borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${row.bPct}%`, height: 8, background: 'var(--blue)', borderRadius: 4 }} />
                </div>
                <div style={{ font: '700 13px var(--font-mono)', color: 'var(--text)', width: 64 }}>{row.b}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
