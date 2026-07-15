import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { rankColorForPct, professionColor } from '../data/gw2-data';
import { rowBg, medalFor } from '../data/derived';
import { ProfDot, RankPill } from '../components/atoms';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';

export default function LeaderboardPage() {
  const { data: encounters, loading: encountersLoading } = useApiQuery(() => api.encounters(), []);
  const [selected, setSelected] = useState<{ fightName: string; isCm: boolean } | null>(null);

  useEffect(() => {
    if (!selected && encounters && encounters.length > 0) {
      setSelected({ fightName: encounters[0].fightName, isCm: encounters[0].isCm });
    }
  }, [encounters, selected]);

  const { data: leaderboard, loading: leaderboardLoading, error } = useApiQuery(
    () => (selected ? api.leaderboard(selected.fightName, selected.isCm) : Promise.resolve([])),
    [selected],
  );

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '22px 28px 40px' }}>
      <h1 style={{ font: '800 22px var(--font-sans)', color: 'var(--text)', marginBottom: 16 }}>
        Global Leaderboards
      </h1>

      {encountersLoading && <LoadingState label="Loading encounters…" />}
      {!encountersLoading && encounters?.length === 0 && (
        <EmptyState>No logs have been uploaded yet — leaderboards will appear once the first log comes in.</EmptyState>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {encounters?.map((e) => {
          const active = selected?.fightName === e.fightName && selected?.isCm === e.isCm;
          return (
            <button
              key={`${e.fightName}-${e.isCm}`}
              onClick={() => setSelected({ fightName: e.fightName, isCm: e.isCm })}
              style={{
                padding: '7px 14px',
                background: active ? 'var(--gold)' : 'var(--bg-chip)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                font: active ? '600 12px var(--font-sans)' : '500 12px var(--font-sans)',
                color: active ? '#14120f' : 'var(--text-60)',
              }}
            >
              {e.fightName}{e.isCm ? ' CM' : ''} · {e.logCount}
            </button>
          );
        })}
      </div>

      {selected && (
        <>
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

          {leaderboardLoading && <LoadingState />}
          {error && <ErrorState message={error} />}

          {leaderboard?.map((row, i) => {
            const { medal, color } = medalFor(i, row.rank);
            return (
              <Link
                key={row.logId + row.account}
                to={`/players/${encodeURIComponent(row.account)}`}
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
                <div style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>{row.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <ProfDot color={professionColor(row.profession)} />
                  <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-70)' }}>{row.spec}</div>
                </div>
                <div style={{ font: '700 13px var(--font-mono)', color: 'var(--text)' }}>{row.dps.toLocaleString()}</div>
                <div style={{ font: '500 13px var(--font-mono)', color: 'var(--text-60)' }}>
                  {Math.floor(row.durationMs / 60000)}:{String(Math.round((row.durationMs % 60000) / 1000)).padStart(2, '0')}
                </div>
                <div>
                  <RankPill pct={row.pct} color={rankColorForPct(row.pct)} />
                </div>
                <div style={{ font: '400 12px var(--font-mono)', color: 'var(--text-40)' }}>
                  {new Date(row.date).toLocaleDateString()}
                </div>
              </Link>
            );
          })}
        </>
      )}
    </div>
  );
}
