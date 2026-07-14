import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Logo() {
  return (
    <Link
      to="/"
      style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', letterSpacing: '.3px' }}
    >
      GW2<span style={{ color: 'var(--gold)' }}>LOGS</span>
    </Link>
  );
}

export function Avatar({ size = 30, name }: { size?: number; name?: string }) {
  return (
    <Link
      to="/players/Sai Zu"
      title={name ?? 'Sai Zu'}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--gold)',
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans)',
        fontWeight: 800,
        fontSize: size * 0.4,
        color: '#14120f',
      }}
    >
      {(name ?? 'Sai Zu').charAt(0)}
    </Link>
  );
}

export function ProfDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size, borderRadius: '50%', background: color, flex: 'none' }}
    />
  );
}

export function RankPill({ pct, color, style }: { pct: number; color: string; style?: CSSProperties }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        font: '700 11px var(--font-mono)',
        color: '#14120f',
        background: color,
        ...style,
      }}
    >
      {pct}%
    </span>
  );
}

export function StatTile({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', padding: '18px 24px' }}>
      <div
        style={{
          font: '600 10px var(--font-sans)',
          color: 'var(--text-40)',
          textTransform: 'uppercase',
          letterSpacing: '.05em',
        }}
      >
        {label}
      </div>
      <div style={{ font: '700 22px var(--font-mono)', color: 'var(--gold)', marginTop: 6 }}>
        {value}
      </div>
      {sub && <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-40)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        font: '600 11px var(--font-sans)',
        color: 'var(--text-40)',
        textTransform: 'uppercase',
        letterSpacing: '.04em',
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

export function Badge({ children, tone = 'gold' }: { children: ReactNode; tone?: 'gold' | 'good' | 'bad' }) {
  const bg = tone === 'good' ? 'var(--good-dim)' : tone === 'bad' ? 'rgba(245,93,78,.15)' : 'var(--gold-dim)';
  const color = tone === 'good' ? 'var(--good)' : tone === 'bad' ? 'var(--bad)' : 'var(--gold)';
  return (
    <span
      style={{
        font: '600 10px var(--font-sans)',
        padding: '2px 8px',
        background: bg,
        color,
        borderRadius: 4,
      }}
    >
      {children}
    </span>
  );
}
