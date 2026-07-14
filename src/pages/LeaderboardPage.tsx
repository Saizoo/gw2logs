import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ENCOUNTER_LEADERBOARD } from '../data/gw2-data';
import { rowBg, medalFor } from '../data/derived';
import { ProfDot, RankPill } from '../components/atoms';

const FILTERS = ['Dhuum CM', 'All professions', 'Current patch', 'NA + EU'];

export default function LeaderboardPage() {
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '22px 28px 40px' }}>
      <h1 style={{ font: '800 22px var(--font-sans)', color: 'var(--text)', marginBottom: 16 }}>
        Global Leaderboards
      </h1>
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              padding: '7px 14px',
              background: activeFilter === f ? 'var(--gold)' : 'var(--bg-chip)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              font: activeFilter === f ? '600 12px var(--font-sans)' : '500 12px var(--font-sans)',
              color: activeFilter === f ? '#14120f' : 'var(--text-60)',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '44px 1fr 140px 110px 100px 90px 110px',
          gap: 10,
          padding: '0 14px 10px',
          font: '600 11px var(--font-sans)',
          color: 'var(--text-40)',
          textTransform: 'uppercase',
          letterSpacing: '.04em',
        }}
      >
        <div>#</div>
        <div>Player</div>
        <div>Profession</div>
        <div>DPS</div>
        <div>Duration</div>
        <div>Rank</div>
        <div>Date</div>
      </div>

      {ENCOUNTER_LEADERBOARD.map((row, i) => {
        const { medal, color } = medalFor(i, row.rank);
        return (
          <Link
            key={row.rank}
            to={`/players/${encodeURIComponent(row.name)}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '44px 1fr 140px 110px 100px 90px 110px',
              gap: 10,
              alignItems: 'center',
              padding: '11px 14px',
              background: rowBg(i),
              borderRadius: 6,
              marginBottom: 3,
            }}
          >
            <div style={{ font: '700 13px var(--font-mono)', color }}>{medal}</div>
            <div>
              <div style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>{row.name}</div>
              <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-40)' }}>{row.guild}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <ProfDot color={row.color} />
              <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-70)' }}>{row.spec}</div>
            </div>
            <div style={{ font: '700 13px var(--font-mono)', color: 'var(--text)' }}>{row.dps.toLocaleString()}</div>
            <div style={{ font: '500 13px var(--font-mono)', color: 'var(--text-60)' }}>{row.duration}</div>
            <div>
              <RankPill pct={row.pct} color={row.rankColor} />
            </div>
            <div style={{ font: '400 12px var(--font-mono)', color: 'var(--text-40)' }}>{row.date}</div>
          </Link>
        );
      })}
    </div>
  );
}
