import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { professionColor, professionIconPath, specBgPath } from '../data/gw2-data';
import { ArtImg, Card, PageHeader, SquadRoleBadge, SubNav } from '../components/atoms';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';

export const BENCH_SUBNAV = [
  { label: 'Benchmarks', to: '/benchmarks' },
  { label: 'Leaderboard', to: '/leaderboards' },
];

const CHART_H = 240;
const BAR_W = 46;
const BAR_GAP = 18;
const PAD_X = 16;
const LABEL_H = 44;

export default function BenchmarksPage() {
  const { data: rows, loading, error } = useApiQuery(() => api.specBenchmarks(), []);

  return (
    <div>
      <PageHeader
        title="Benchmarks"
        subtitle="The highest DPS ever logged on each elite specialization, kills only"
      />
      <SubNav tabs={BENCH_SUBNAV} />

      {loading && <LoadingState label="Loading benchmarks…" />}
      {error && <ErrorState message={error} />}
      {rows && rows.length === 0 && (
        <EmptyState>No kills logged yet — elite-spec benchmarks appear once the first kill comes in.</EmptyState>
      )}

      {rows && rows.length > 0 && (
        <>
          <Card style={{ padding: '20px 18px 12px', marginBottom: 18, overflowX: 'auto' }}>
            <BenchmarkChart rows={rows} />
          </Card>

          <Card style={{ overflow: 'hidden' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1.4fr 1.4fr 1.4fr 0.9fr 0.9fr',
                gap: 8,
                padding: '12px 20px',
                font: '700 10.5px var(--font-sans)',
                textTransform: 'uppercase',
                letterSpacing: '.5px',
                color: 'var(--text-55)',
                borderBottom: '1px solid var(--border-soft)',
              }}
            >
              <div>Rank</div>
              <div>Elite Spec</div>
              <div>Player</div>
              <div>Encounter</div>
              <div>DPS</div>
              <div>Date</div>
            </div>
            {rows.map((row, i) => {
              const color = professionColor(row.profession);
              return (
                <div
                  key={row.spec}
                  className="u-row"
                  style={{
                    position: 'relative',
                    isolation: 'isolate',
                    display: 'grid',
                    gridTemplateColumns: '40px 1.4fr 1.4fr 1.4fr 0.9fr 0.9fr',
                    gap: 8,
                    alignItems: 'center',
                    padding: '12px 20px',
                    borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--border-faint)',
                    overflow: 'hidden',
                  }}
                >
                  <ArtImg src={specBgPath(row.profession, row.spec)} style={{ opacity: 0.22, zIndex: -1 }} />
                  <div
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: -1,
                      background:
                        'linear-gradient(90deg, oklch(0.13 0.014 250 / 90%) 0%, oklch(0.13 0.014 250 / 60%) 55%, oklch(0.13 0.014 250 / 90%) 100%)',
                    }}
                  />
                  <div style={{ font: '800 14px var(--font-sans)', color: i === 0 ? 'var(--gold)' : 'var(--text-55)' }}>
                    #{row.rank}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <img
                      src={professionIconPath(row.profession, row.spec)}
                      alt=""
                      style={{ width: 26, height: 26, objectFit: 'contain', flex: 'none' }}
                    />
                    <div style={{ font: '700 13px var(--font-sans)', color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.spec}
                    </div>
                  </div>
                  <Link to={`/players/${encodeURIComponent(row.account)}`} style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ font: '600 13px var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.name}
                      </div>
                      <SquadRoleBadge squadRole={row.squadRole} />
                    </div>
                    <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--text-55)' }}>{row.account}</div>
                  </Link>
                  <Link
                    to={`/logs/${row.logId}`}
                    style={{ font: '400 12px var(--font-sans)', color: 'var(--text-70)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {row.fightName}
                    {row.isCm ? ' CM' : ''}
                  </Link>
                  <div style={{ font: '700 13.5px var(--font-mono)', color: 'var(--gold)' }}>{row.dps.toLocaleString()}</div>
                  <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>
                    {new Date(row.date).toLocaleDateString()}
                  </div>
                </div>
              );
            })}
          </Card>
        </>
      )}
    </div>
  );
}

function BenchmarkChart({ rows }: { rows: { spec: string; profession: string; dps: number; name: string }[] }) {
  const max = Math.max(...rows.map((r) => r.dps));
  const width = PAD_X * 2 + rows.length * BAR_W + (rows.length - 1) * BAR_GAP;
  const height = CHART_H + LABEL_H;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block', width: '100%', minWidth: Math.min(width, 640), maxWidth: width, height: 'auto', margin: '0 auto' }}
      role="img"
      aria-label="Highest DPS per elite specialization"
    >
      <defs>
        <filter id="benchGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Faint horizontal gridlines at quarter intervals */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={PAD_X}
          x2={width - PAD_X}
          y1={CHART_H - CHART_H * f}
          y2={CHART_H - CHART_H * f}
          stroke="oklch(1 0 0 / 7%)"
          strokeWidth="1"
        />
      ))}
      {rows.map((row, i) => {
        const color = professionColor(row.profession);
        const h = Math.max(6, (row.dps / max) * (CHART_H - 26));
        const x = PAD_X + i * (BAR_W + BAR_GAP);
        const y = CHART_H - h;
        return (
          <g key={row.spec}>
            <title>{`${row.spec} — ${row.dps.toLocaleString()} DPS (${row.name})`}</title>
            <rect x={x} y={y} width={BAR_W} height={h} rx={6} fill={color} opacity={0.28} filter="url(#benchGlow)" />
            <rect x={x} y={y} width={BAR_W} height={h} rx={6} fill={color} opacity={0.82} />
            <rect x={x} y={y} width={BAR_W} height={Math.min(5, h)} rx={2.5} fill="oklch(1 0 0 / 45%)" />
            <text
              x={x + BAR_W / 2}
              y={y - 8}
              textAnchor="middle"
              style={{ font: '700 11px var(--font-mono)', fill: 'var(--text-80)' }}
            >
              {row.dps >= 1000 ? `${(row.dps / 1000).toFixed(1)}k` : row.dps}
            </text>
            <image
              href={professionIconPath(row.profession, row.spec)}
              x={x + BAR_W / 2 - 12}
              y={CHART_H + 8}
              width={24}
              height={24}
            />
            <text
              x={x + BAR_W / 2}
              y={CHART_H + LABEL_H - 4}
              textAnchor="middle"
              style={{ font: '600 8.5px var(--font-sans)', fill: 'var(--text-55)' }}
            >
              {row.spec}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
