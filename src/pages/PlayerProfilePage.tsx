import { PLAYER_PROFILE } from '../data/gw2-data';
import { ProfDot, RankPill } from '../components/atoms';

export default function PlayerProfilePage() {
  const player = PLAYER_PROFILE;

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
          <h1 style={{ font: '800 24px var(--font-sans)', color: 'var(--text)' }}>{player.name}</h1>
          <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-45)', marginTop: 4 }}>
            {player.guild} · {player.region}
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '10px 22px', background: 'var(--gold-dim)', borderRadius: 8 }}>
          <div style={{ font: '800 26px var(--font-mono)', color: 'var(--gold)' }}>{player.rating}</div>
          <div style={{ font: '600 10px var(--font-sans)', color: 'var(--text-45)', textTransform: 'uppercase' }}>
            Overall rating
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, padding: '24px 28px 0', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 480px', minWidth: 0 }}>
          <div
            style={{
              font: '600 12px var(--font-sans)', color: 'var(--text-45)', textTransform: 'uppercase',
              letterSpacing: '.04em', marginBottom: 12,
            }}
          >
            Best parses
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {player.bestParses.map((bp) => (
              <div key={bp.boss} style={{ background: 'var(--bg-row)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                <div style={{ font: '700 13px var(--font-sans)', color: 'var(--text)', marginBottom: 4 }}>{bp.boss}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <ProfDot color={bp.color} size={7} />
                  <span style={{ font: '500 11px var(--font-sans)', color: 'var(--text-50)' }}>{bp.spec}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ font: '700 16px var(--font-mono)', color: 'var(--text)' }}>{bp.dps.toLocaleString()}</span>
                  <RankPill pct={bp.pct} color={bp.rankColor} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: 260, flex: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
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
          <div style={{ background: 'var(--bg-row)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
            <div style={{ font: '800 28px var(--font-mono)', color: 'var(--gold)' }}>{player.consistency}</div>
            <div style={{ font: '600 10px var(--font-sans)', color: 'var(--text-45)', textTransform: 'uppercase', marginTop: 4 }}>
              Consistency score
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 28px 0' }}>
        <div
          style={{
            font: '600 12px var(--font-sans)', color: 'var(--text-45)', textTransform: 'uppercase',
            letterSpacing: '.04em', marginBottom: 12,
          }}
        >
          Recent uploads
        </div>
        {player.recent.map((r, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
            <div style={{ width: 4, height: 34, background: r.rankColor, borderRadius: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ font: '700 13px var(--font-sans)', color: 'var(--text)' }}>{r.boss}</div>
              <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-40)' }}>
                {r.spec} · {r.uploadedAgo}
              </div>
            </div>
            <div style={{ font: '700 13px var(--font-mono)', color: 'var(--text)' }}>{r.dps.toLocaleString()} dps</div>
            <RankPill pct={r.pct} color={r.rankColor} />
          </div>
        ))}
      </div>
    </div>
  );
}
