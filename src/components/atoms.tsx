import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PARSE_LEGEND, parseTier } from '../data/gw2-data';

export function Logo() {
  return (
    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: 'var(--gold-grad)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 15,
          color: 'var(--gold-fg)',
          flex: 'none',
        }}
      >
        H
      </div>
      <div style={{ font: '700 15px var(--font-sans)', letterSpacing: '.2px' }}>
        Hero<span style={{ color: 'var(--gold)' }}>Panel</span>
        <span style={{ color: 'var(--text-55)', fontWeight: 500 }}> GW2</span>
      </div>
    </Link>
  );
}

export function Avatar({
  size = 34,
  name,
  to = '/login',
  imgSrc,
}: {
  size?: number;
  name?: string;
  to?: string;
  imgSrc?: string | null;
}) {
  return (
    <Link
      to={to}
      title={name ?? 'Sign in'}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: 'var(--bg-chip)',
        border: '1px solid var(--border)',
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans)',
        fontWeight: 800,
        fontSize: size * 0.4,
        color: 'var(--gold)',
        overflow: 'hidden',
      }}
    >
      {imgSrc ? (
        <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        (name ?? '?').charAt(0)
      )}
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

export function ParseBadge({ pct, style }: { pct: number; style?: CSSProperties }) {
  const tier = parseTier(pct);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 26,
        height: 20,
        padding: '0 6px',
        borderRadius: 6,
        font: '800 11px var(--font-mono)',
        color: tier.color,
        background: tier.bg,
        border: `1px solid ${tier.color}`,
        ...style,
      }}
    >
      {Math.round(pct)}
    </span>
  );
}

export function ParseLegend() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
        Parse
      </div>
      {PARSE_LEGEND.map((t) => (
        <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: parseTier(t.pct).color }} />
          <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-62)' }}>{t.label}</div>
        </div>
      ))}
    </div>
  );
}

const SQUAD_ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  boon_heal: { label: 'Healer', color: 'var(--good)', bg: 'var(--good-dim)' },
  boon_dps: { label: 'Boon DPS', color: 'var(--gold)', bg: 'oklch(0.7 0.15 85 / 15%)' },
};

// Only rendered for boon-support roles — plain 'dps' is the unmarked
// default and doesn't need a badge cluttering every other row.
export function SquadRoleBadge({ squadRole, style }: { squadRole: string; style?: CSSProperties }) {
  const meta = SQUAD_ROLE_LABELS[squadRole];
  if (!meta) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 18,
        padding: '0 6px',
        borderRadius: 5,
        font: '700 9.5px var(--font-sans)',
        letterSpacing: '.3px',
        textTransform: 'uppercase',
        color: meta.color,
        background: meta.bg,
        ...style,
      }}
    >
      {meta.label}
    </span>
  );
}

export function LoadMoreButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'block',
        margin: '16px auto 0',
        padding: '9px 20px',
        borderRadius: 10,
        font: '600 12.5px var(--font-sans)',
        background: 'var(--bg-chip)',
        color: 'var(--text-80)',
        border: '1px solid var(--border)',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? 'Loading…' : 'Load more'}
    </button>
  );
}

export function ResultPill({ success }: { success: boolean }) {
  return (
    <span
      style={{
        font: '700 10px var(--font-sans)',
        letterSpacing: '.4px',
        padding: '2px 7px',
        borderRadius: 5,
        background: success ? 'var(--good-dim)' : 'var(--bad-dim)',
        color: success ? 'var(--good)' : 'var(--bad)',
        border: `1px solid ${success ? 'var(--good)' : 'var(--bad)'}`,
      }}
    >
      {success ? 'KILL' : 'WIPE'}
    </span>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value, delta }: { label: string; value: ReactNode; delta?: string }) {
  return (
    <Card style={{ padding: '18px 20px' }}>
      <div style={{ font: '600 11.5px var(--font-sans)', color: 'var(--text-58)', textTransform: 'uppercase', letterSpacing: '.6px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
        <div style={{ font: '800 26px var(--font-sans)', letterSpacing: '-.5px' }}>{value}</div>
        {delta && <div style={{ font: '600 12px var(--font-sans)', color: 'var(--good)' }}>{delta}</div>}
      </div>
    </Card>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        font: '600 11px var(--font-sans)',
        color: 'var(--text-55)',
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
  const bg = tone === 'good' ? 'var(--good-dim)' : tone === 'bad' ? 'var(--bad-dim)' : 'var(--gold-dim)';
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

export function GoldButton({ children, onClick, to }: { children: ReactNode; onClick?: () => void; to?: string }) {
  const style: CSSProperties = {
    cursor: 'pointer',
    display: 'inline-block',
    font: '600 12.5px var(--font-sans)',
    padding: '9px 16px',
    borderRadius: 10,
    background: 'var(--gold-grad)',
    color: 'var(--gold-fg)',
  };
  if (to) {
    return (
      <Link to={to} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <button onClick={onClick} style={style}>
      {children}
    </button>
  );
}
