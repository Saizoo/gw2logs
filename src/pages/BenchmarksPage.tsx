import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type SpecDistribution } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { professionColor, professionIconPath } from '../data/gw2-data';
import { Card, PageHeader, SubNav } from '../components/atoms';
import { TooltipPortal } from '../components/TooltipPortal';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';

export const BENCH_SUBNAV = [
  { label: 'Benchmarks', to: '/benchmarks' },
  { label: 'Leaderboard', to: '/leaderboards' },
];

// Box-and-whisker per elite spec: the thin line is the DPS spread (min to
// 95th percentile), the thick box the middle half (Q1–Q3) with a tick at
// the median, and the dot the single highest parse on record. Rows sort by
// median, so the chart reads as a ranking of typical performance rather
// than lucky best-cases.

const LABEL_W = 168;
const ROW_H = 38;
const BOX_H = 15;
const PAD_TOP = 10;
const AXIS_H = 46;
const PAD_RIGHT = 46;
const CHART_W = 1080;

function niceStep(range: number, targetTicks: number): number {
  const raw = range / targetTicks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  for (const mult of [1, 2, 2.5, 5, 10]) {
    if (raw <= mult * mag) return mult * mag;
  }
  return 10 * mag;
}

export default function BenchmarksPage() {
  const { data: rows, loading, error } = useApiQuery(() => api.specBenchmarkDistribution(), []);

  return (
    <div>
      <PageHeader
        title="Benchmarks"
        subtitle="DPS distribution per elite specialization, kills only — box is the middle half, line the full spread, dot the best parse on record"
      />
      <SubNav tabs={BENCH_SUBNAV} />

      {loading && <LoadingState label="Loading benchmarks…" />}
      {error && <ErrorState message={error} />}
      {rows && rows.length === 0 && (
        <EmptyState>No kills logged yet — elite-spec benchmarks appear once the first kill comes in.</EmptyState>
      )}

      {rows && rows.length > 0 && (
        <Card style={{ padding: '22px 16px 14px', overflowX: 'auto' }}>
          <div style={{ minWidth: 720 }}>
            <BoxPlot rows={rows} />
          </div>
        </Card>
      )}
    </div>
  );
}

function BoxPlot({ rows }: { rows: SpecDistribution[] }) {
  const navigate = useNavigate();
  // Cursor position is stored in viewport coords so the tooltip can be
  // portalled to <body> (never clipped by the chart card's overflow).
  const [hover, setHover] = useState<{ index: number; cx: number; cy: number } | null>(null);

  const { xMin, xMax, ticks } = useMemo(() => {
    const lo = Math.min(...rows.map((r) => r.min));
    const hi = Math.max(...rows.map((r) => r.max));
    const pad = Math.max((hi - lo) * 0.06, 200);
    const min = Math.max(0, lo - pad);
    const max = hi + pad;
    const step = niceStep(max - min, 9);
    const first = Math.ceil(min / step) * step;
    const tickList: number[] = [];
    for (let v = first; v <= max; v += step) tickList.push(v);
    return { xMin: min, xMax: max, ticks: tickList };
  }, [rows]);

  const plotW = CHART_W - LABEL_W - PAD_RIGHT;
  const x = (dps: number) => LABEL_W + ((dps - xMin) / (xMax - xMin)) * plotW;
  const height = PAD_TOP + rows.length * ROW_H + AXIS_H;
  const hovered = hover ? rows[hover.index] : null;

  return (
    <div
      style={{ position: 'relative' }}
      onMouseLeave={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${CHART_W} ${height}`}
        style={{ display: 'block', width: '100%', height: 'auto' }}
        role="img"
        aria-label="DPS distribution per elite specialization"
      >
        {/* Recessive vertical gridlines with axis labels */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={PAD_TOP} y2={PAD_TOP + rows.length * ROW_H} stroke="color-mix(in srgb, var(--color-text) 8%, transparent)" strokeWidth="1" />
            <text x={x(t)} y={PAD_TOP + rows.length * ROW_H + 20} textAnchor="middle" style={{ font: '600 11px var(--font-mono)', fill: 'var(--text-50)' }}>
              {t >= 1000 ? `${Math.round(t / 1000)}k` : t}
            </text>
          </g>
        ))}
        <text x={LABEL_W + plotW / 2} y={height - 6} textAnchor="middle" style={{ font: '700 11.5px var(--font-sans)', fill: 'var(--text-60)' }}>
          DPS
        </text>

        {rows.map((row, i) => {
          const color = professionColor(row.profession);
          const cy = PAD_TOP + i * ROW_H + ROW_H / 2;
          const isHovered = hover?.index === i;
          const whiskerEnd = Math.max(row.p95, row.q3);
          return (
            <g key={row.spec} opacity={hover === null || isHovered ? 1 : 0.45} style={{ transition: 'opacity .12s ease' }}>
              {/* Row label: icon + spec name in text ink (identity is icon + label, not color alone) */}
              <image href={professionIconPath(row.profession, row.spec)} x={8} y={cy - 10} width={20} height={20} />
              <text x={34} y={cy + 4} style={{ font: `${isHovered ? 700 : 600} 12px var(--font-sans)`, fill: isHovered ? 'var(--text)' : 'var(--text-80)' }}>
                {row.spec}
              </text>

              {/* Whisker: min → p95 with end caps */}
              <line x1={x(row.min)} x2={x(whiskerEnd)} y1={cy} y2={cy} stroke={color} strokeWidth="1.4" opacity="0.75" />
              <line x1={x(row.min)} x2={x(row.min)} y1={cy - 5} y2={cy + 5} stroke={color} strokeWidth="1.4" opacity="0.75" />
              <line x1={x(whiskerEnd)} x2={x(whiskerEnd)} y1={cy - 5} y2={cy + 5} stroke={color} strokeWidth="1.4" opacity="0.75" />

              {/* Box: Q1 → Q3, median tick inside */}
              <rect
                x={x(row.q1)}
                y={cy - BOX_H / 2}
                width={Math.max(x(row.q3) - x(row.q1), 2)}
                height={BOX_H}
                rx={3}
                fill={color}
                opacity={isHovered ? 0.95 : 0.8}
              />
              <line x1={x(row.median)} x2={x(row.median)} y1={cy - BOX_H / 2 + 1.5} y2={cy + BOX_H / 2 - 1.5} stroke="oklch(0 0 0 / 55%)" strokeWidth="2" />

              {/* Best on record: dot with a 2px surface ring so it stays
                  readable when it sits on the whisker */}
              <circle cx={x(row.max)} cy={cy} r={5} fill="var(--bg-card, var(--color-surface))" />
              <circle cx={x(row.max)} cy={cy} r={3.6} fill={color} />

              {/* Full-row hit target for hover + click-through to the record log */}
              <rect
                x={0}
                y={PAD_TOP + i * ROW_H}
                width={CHART_W}
                height={ROW_H}
                fill="transparent"
                style={{ cursor: row.best ? 'pointer' : 'default' }}
                onMouseMove={(e) => setHover({ index: i, cx: e.clientX, cy: e.clientY })}
                onClick={() => {
                  if (row.best) navigate(`/logs/${row.best.logId}`);
                }}
              />
            </g>
          );
        })}
      </svg>

      {hovered && hover && (
        <TooltipPortal anchor={{ kind: 'point', x: hover.cx, y: hover.cy }}>
        <div
          style={{
            width: 244,
            padding: '12px 14px',
            borderRadius: 0,
            background: 'color-mix(in srgb, var(--color-surface) 97%, transparent)',
            border: '1px solid var(--border)',
            boxShadow: '0 18px 44px -14px rgba(0,0,0,.7)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <img src={professionIconPath(hovered.profession, hovered.spec)} alt="" width={20} height={20} style={{ objectFit: 'contain' }} />
            <span style={{ font: '700 13px var(--font-sans)' }}>{hovered.spec}</span>
            <span style={{ font: '500 10.5px var(--font-sans)', color: 'var(--text-50)', marginLeft: 'auto' }}>
              {hovered.count} parse{hovered.count === 1 ? '' : 's'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 12px', font: '500 11.5px var(--font-sans)', color: 'var(--text-70)' }}>
            <span>Highest</span>
            <span style={{ font: '700 11.5px var(--font-mono)', color: 'var(--gold)', textAlign: 'right' }}>{hovered.max.toLocaleString()}</span>
            <span>Upper quartile</span>
            <span style={{ font: '600 11.5px var(--font-mono)', textAlign: 'right' }}>{hovered.q3.toLocaleString()}</span>
            <span>Median</span>
            <span style={{ font: '700 11.5px var(--font-mono)', textAlign: 'right' }}>{hovered.median.toLocaleString()}</span>
            <span>Lower quartile</span>
            <span style={{ font: '600 11.5px var(--font-mono)', textAlign: 'right' }}>{hovered.q1.toLocaleString()}</span>
            <span>Lowest</span>
            <span style={{ font: '600 11.5px var(--font-mono)', textAlign: 'right' }}>{hovered.min.toLocaleString()}</span>
          </div>
          {hovered.best && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-faint)', font: '400 11px/1.5 var(--font-sans)', color: 'var(--text-60)' }}>
              Record: <span style={{ color: 'var(--text-85)', fontWeight: 600 }}>{hovered.best.account}</span> on {hovered.best.fightName}
              {hovered.best.isCm ? ' CM' : ''} — click to open the log
            </div>
          )}
        </div>
        </TooltipPortal>
      )}
    </div>
  );
}
