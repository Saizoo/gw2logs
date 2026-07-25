import { useMemo, useState } from 'react';
import type { PlayerProfile } from '../lib/api';
import { Card } from './atoms';

// Parse-percentile trend with a 7D / 30D / 90D window toggle. Shares the
// dashboard's "Performance Trend" look; driven by the profile's parseHistory.

const WINDOWS = [
  { key: '7D', days: 7 },
  { key: '30D', days: 30 },
  { key: '90D', days: 90 },
] as const;

export function ParseTrendCard({ history }: { history: PlayerProfile['parseHistory'] }) {
  const [win, setWin] = useState<(typeof WINDOWS)[number]['key']>('30D');
  const days = WINDOWS.find((w) => w.key === win)!.days;

  const points = useMemo(() => {
    const cutoff = Date.now() - days * 86_400_000;
    const filtered = history.filter((h) => new Date(h.date).getTime() >= cutoff);
    return (filtered.length >= 2 ? filtered : history).map((h) => h.pct);
  }, [history, days]);

  const best = points.length ? Math.max(...points) : 0;
  const median = points.length ? [...points].sort((a, b) => a - b)[Math.floor(points.length / 2)] : 0;
  const trend = points.length >= 2 ? points[points.length - 1] - points[0] : 0;

  const { line, area } = useMemo(() => {
    const w = 340, h = 120, pad = 8;
    if (points.length < 2) return { line: '', area: '' };
    const step = (w - pad * 2) / (points.length - 1);
    const pts = points.map((v, i) => [pad + i * step, pad + (1 - v / 100) * (h - pad * 2)] as const);
    const l = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    return { line: l, area: `${l} L${pts[pts.length - 1][0].toFixed(1)} ${h - pad} L${pts[0][0].toFixed(1)} ${h - pad} Z` };
  }, [points]);

  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '15px 17px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ font: '750 15px var(--font-sans)', display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ color: 'var(--gold)', display: 'grid', placeItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 13l3-3 3 2 4-5" /></svg>
          </span>
          Performance trend
        </div>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg-chip)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
          {WINDOWS.map((w) => {
            const on = w.key === win;
            return (
              <button key={w.key} type="button" onClick={() => setWin(w.key)} style={{ font: '700 11px var(--font-sans)', padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: on ? 'var(--gold)' : 'transparent', color: on ? 'var(--gold-fg)' : 'var(--text-55)' }}>
                {w.key}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ padding: '16px 17px' }}>
        {line ? (
          <svg viewBox="0 0 340 120" style={{ width: '100%', height: 'auto', aspectRatio: '340 / 120', display: 'block' }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="ptFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#ptFill)" />
            <path d={line} fill="none" stroke="var(--gold)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
        ) : (
          <div style={{ height: 120, display: 'grid', placeItems: 'center', font: '500 12.5px var(--font-sans)', color: 'var(--text-50)' }}>Not enough kills in this window.</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
          {[
            { label: 'Trend', node: <span style={{ color: trend >= 0 ? 'var(--good)' : 'var(--bad)' }}>{trend >= 0 ? '+' : ''}{trend}</span> },
            { label: 'Best', node: best },
            { label: 'Median', node: median },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ font: '800 18px var(--font-sans)' }}>{s.node}</div>
              <div style={{ font: '600 9.5px var(--font-sans)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-50)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
