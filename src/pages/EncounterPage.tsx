import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BOSSES, ENCOUNTER_LEADERBOARD, HERO_STATS, PROFESSION_CHIPS } from '../data/gw2-data';
import { ProfDot, RankPill } from '../components/atoms';

export default function EncounterPage() {
  const { bossName } = useParams();
  const boss = BOSSES.find((b) => b.name === bossName) ?? BOSSES.find((b) => b.name === 'Qadim the Peerless')!;
  const [activeProf, setActiveProf] = useState<string | null>(null);

  const rows = useMemo(
    () => (activeProf ? ENCOUNTER_LEADERBOARD.filter((r) => r.profession === activeProf) : ENCOUNTER_LEADERBOARD),
    [activeProf],
  );

  return (
    <div>
      <div
        style={{
          position: 'relative',
          minHeight: 220,
          background: 'linear-gradient(160deg,#241a10,#0f0d0a 70%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '26px 32px',
          borderBottom: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 340,
            background:
              'repeating-linear-gradient(115deg,rgba(224,180,88,.08) 0 12px,rgba(224,180,88,.02) 12px 24px)',
          }}
        />
        <span
          style={{
            font: '600 10px var(--font-sans)',
            padding: '3px 9px',
            background: 'var(--gold)',
            color: '#14120f',
            borderRadius: 4,
            width: 'fit-content',
            marginBottom: 10,
            position: 'relative',
          }}
        >
          {boss.cm ? 'CHALLENGE MODE' : 'NORMAL MODE'}
        </span>
        <h1 style={{ font: '800 40px var(--font-sans)', color: 'var(--text)', position: 'relative' }}>
          {boss.name}
        </h1>
        <div style={{ font: '500 13px var(--font-mono)', color: 'var(--text-50)', marginTop: 6, position: 'relative' }}>
          {boss.wing}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--border)' }}>
        {HERO_STATS.map((hs) => (
          <div key={hs.label} style={{ background: 'var(--bg-card)', padding: '18px 24px' }}>
            <div style={{ font: '600 10px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              {hs.label}
            </div>
            <div style={{ font: '700 22px var(--font-mono)', color: 'var(--gold)', marginTop: 6 }}>{hs.value}</div>
            <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-40)', marginTop: 2 }}>{hs.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '18px 32px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-40)', marginRight: 6 }}>Filter</div>
        <button
          onClick={() => setActiveProf(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px',
            background: activeProf === null ? 'var(--gold)' : 'var(--bg-chip)',
            border: '1px solid var(--border)', borderRadius: 20,
            font: '500 11px var(--font-sans)', color: activeProf === null ? '#14120f' : 'var(--text-65)',
          }}
        >
          All
        </button>
        {PROFESSION_CHIPS.map((p) => (
          <button
            key={p.name}
            onClick={() => setActiveProf(activeProf === p.name ? null : p.name)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px',
              background: activeProf === p.name ? 'var(--gold)' : 'var(--bg-chip)',
              border: '1px solid var(--border)', borderRadius: 20,
            }}
          >
            <ProfDot color={p.color} size={7} />
            <span style={{ font: '500 11px var(--font-sans)', color: activeProf === p.name ? '#14120f' : 'var(--text-65)' }}>
              {p.name}
            </span>
          </button>
        ))}
      </div>

      <div style={{ padding: '20px 32px 40px' }}>
        {rows.map((row) => (
          <Link
            key={row.rank}
            to={`/logs/${row.rank}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '36px 1fr 120px 110px 90px 100px',
              gap: 14,
              alignItems: 'center',
              padding: '12px 16px',
              marginBottom: 6,
              background: 'var(--bg-card)',
              borderLeft: `3px solid ${row.color}`,
              borderRadius: 6,
            }}
          >
            <div style={{ font: '700 14px var(--font-mono)', color: 'var(--text-35)' }}>{row.rank}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ font: '700 14px var(--font-sans)', color: 'var(--text)' }}>{row.name}</span>
              <span style={{ font: '500 11px var(--font-sans)', color: 'var(--text-40)' }}>
                {row.spec} · {row.guild}
              </span>
            </div>
            <div style={{ font: '700 14px var(--font-mono)', color: 'var(--text)' }}>
              {row.dps.toLocaleString()} <span style={{ font: '500 10px var(--font-sans)', color: 'var(--text-40)' }}>dps</span>
            </div>
            <div style={{ font: '500 13px var(--font-mono)', color: 'var(--text-55)' }}>{row.duration}</div>
            <div>
              <RankPill pct={row.pct} color={row.rankColor} />
            </div>
            <div style={{ font: '400 11px var(--font-mono)', color: 'var(--text-35)', textAlign: 'right' }}>
              {row.date}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
