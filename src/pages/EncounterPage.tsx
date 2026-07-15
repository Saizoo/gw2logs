import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { BOSSES, PROFESSION_CHIPS, rankColorForPct } from '../data/gw2-data';
import { ProfDot, RankPill } from '../components/atoms';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export default function EncounterPage() {
  const { bossName = '' } = useParams();
  const [searchParams] = useSearchParams();
  const isCm = searchParams.get('cm') !== 'false';
  const [activeProf, setActiveProf] = useState<string | null>(null);

  const bossMeta = BOSSES.find((b) => b.name === bossName);

  const { data: leaderboard, loading, error } = useApiQuery(
    () => api.leaderboard(bossName, isCm, activeProf ?? undefined),
    [bossName, isCm, activeProf],
  );
  const { data: stats } = useApiQuery(() => api.encounterStats(bossName, isCm), [bossName, isCm]);

  const heroStats = useMemo(
    () => [
      { label: 'Fastest kill', value: stats?.fastestKill ? formatDuration(stats.fastestKill.durationMs) : '—', sub: '' },
      { label: 'Top DPS', value: stats?.topDps ? stats.topDps.dps.toLocaleString() : '—', sub: stats?.topDps?.name ?? '' },
      { label: 'Clear rate', value: stats?.clearRate != null ? `${stats.clearRate}%` : '—', sub: `${stats?.totalLogs ?? 0} pulls logged` },
    ],
    [stats],
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
          {isCm ? 'CHALLENGE MODE' : 'NORMAL MODE'}
        </span>
        <h1 style={{ font: '800 40px var(--font-sans)', color: 'var(--text)', position: 'relative' }}>
          {bossName}
        </h1>
        <div style={{ font: '500 13px var(--font-mono)', color: 'var(--text-50)', marginTop: 6, position: 'relative' }}>
          {bossMeta?.wing ?? ''}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--border)' }}>
        {heroStats.map((hs) => (
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
        {loading && <LoadingState label="Loading leaderboard…" />}
        {error && <ErrorState message={error} />}
        {!loading && !error && leaderboard?.length === 0 && (
          <EmptyState>No logs uploaded for this encounter yet. Be the first — upload a log to see it here.</EmptyState>
        )}
        {leaderboard?.map((row) => (
          <Link
            key={row.logId + row.account}
            to={`/logs/${row.logId}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '36px 1fr 120px 110px 90px 100px',
              gap: 14,
              alignItems: 'center',
              padding: '12px 16px',
              marginBottom: 6,
              background: 'var(--bg-card)',
              borderLeft: `3px solid var(--gold)`,
              borderRadius: 6,
            }}
          >
            <div style={{ font: '700 14px var(--font-mono)', color: 'var(--text-35)' }}>{row.rank}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ font: '700 14px var(--font-sans)', color: 'var(--text)' }}>{row.name}</span>
              <span style={{ font: '500 11px var(--font-sans)', color: 'var(--text-40)' }}>{row.spec}</span>
            </div>
            <div style={{ font: '700 14px var(--font-mono)', color: 'var(--text)' }}>
              {row.dps.toLocaleString()} <span style={{ font: '500 10px var(--font-sans)', color: 'var(--text-40)' }}>dps</span>
            </div>
            <div style={{ font: '500 13px var(--font-mono)', color: 'var(--text-55)' }}>{formatDuration(row.durationMs)}</div>
            <div>
              <RankPill pct={row.pct} color={rankColorForPct(row.pct)} />
            </div>
            <div style={{ font: '400 11px var(--font-mono)', color: 'var(--text-35)', textAlign: 'right' }}>
              {new Date(row.date).toLocaleDateString()}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
