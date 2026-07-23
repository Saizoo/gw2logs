import type { CSSProperties, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PARSE_LEGEND, parseTier } from '../data/gw2-data';

// Underline tab strip for sibling pages within a nav section (Encounters /
// All Logs, Benchmarks / Leaderboard) — same treatment as the Characters
// page's filter tabs, but routing links instead of local state.
export function SubNav({ tabs }: { tabs: { label: string; to: string }[] }) {
  const location = useLocation();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, borderBottom: '2px solid var(--border)', marginBottom: 20 }}>
      {tabs.map((t) => {
        const active = location.pathname === t.to;
        return (
          <Link
            key={t.to}
            to={t.to}
            style={{
              padding: '12px 2px',
              marginBottom: -2,
              font: '700 13.5px var(--font-sans)',
              borderBottom: `2px solid ${active ? 'var(--gold)' : 'transparent'}`,
              color: active ? 'var(--text)' : 'var(--text-55)',
              transition: 'color .15s ease, border-color .15s ease',
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

// Scoped tab strip for the Rankings / Statistics / All Reports views. Given a
// boss or a wing, it carries that scope across the three views via the query
// string. Wings have no Rankings (rankings are boss-only), so that tab is
// omitted at wing scope. Active state keys off the pathname, not the full
// href (which includes the scope query).
export function ScopeSubNav({ boss, wing }: { boss?: string; wing?: string }) {
  const location = useLocation();
  const scopeQ = boss ? `boss=${encodeURIComponent(boss)}` : `wing=${encodeURIComponent(wing ?? '')}`;
  const tabs = [
    ...(boss ? [{ label: 'Rankings', path: '/rankings' }] : []),
    { label: 'Statistics', path: '/statistics' },
    { label: 'All Reports', path: '/reports' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24, borderBottom: '2px solid var(--border)', marginBottom: 20 }}>
      {tabs.map((t) => {
        const active = location.pathname === t.path;
        return (
          <Link
            key={t.path}
            to={`${t.path}?${scopeQ}`}
            style={{
              padding: '12px 2px',
              marginBottom: -2,
              font: '700 13.5px var(--font-sans)',
              borderBottom: `2px solid ${active ? 'var(--gold)' : 'transparent'}`,
              color: active ? 'var(--text)' : 'var(--text-55)',
              transition: 'color .15s ease, border-color .15s ease',
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

export function Logo() {
  return (
    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img
        src="/logo.png"
        alt=""
        width={32}
        height={32}
        style={{
          width: 32,
          height: 32,
          borderRadius: 0,
          flex: 'none',
        }}
      />
      <div style={{ font: '800 16px var(--font-sans)', letterSpacing: '-.01em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        Hero<span style={{ color: 'var(--gold)' }}>Panel</span>
        <span className="nav-logo-sub" style={{ color: 'var(--text-55)', fontWeight: 600 }}> GW2</span>
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
  // null renders a plain (non-link) avatar — for people with no profile
  // page to link to, e.g. group members who haven't linked a GW2 account.
  to?: string | null;
  imgSrc?: string | null;
}) {
  const style: CSSProperties = {
    width: size,
    height: size,
    borderRadius: 0,
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
  };
  const inner = imgSrc ? (
    <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    (name ?? '?').charAt(0)
  );
  if (to === null) {
    return (
      <div title={name} className="nav-avatar" style={style}>
        {inner}
      </div>
    );
  }
  return (
    <Link to={to} title={name ?? 'Sign in'} className="nav-avatar" style={style}>
      {inner}
    </Link>
  );
}

// Decorative art layer (spec banners, raid backgrounds). Purely visual:
// hidden from screen readers, and if the asset file isn't shipped yet the
// image hides itself so the element's plain background shows instead.
export function ArtImg({ src, style }: { src: string; style?: CSSProperties }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
      // Modernist prints photography in black and white (readme: the .grayscale
      // wrapper). Every raid/spec backdrop goes through it here.
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1) contrast(1.05)', ...style }}
    />
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
        borderRadius: 0,
        font: '800 11px var(--font-mono)',
        color: tier.color,
        background: tier.bg,
        border: `1px solid color-mix(in oklab, ${tier.color} 35%, transparent)`,
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
  boon_dps: { label: 'Boon DPS', color: 'var(--gold)', bg: 'var(--gold-dim)' },
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
        borderRadius: 0,
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
      className="u-chip"
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'block',
        margin: '16px auto 0',
        padding: '9px 20px',
        borderRadius: 0,
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

// Small numeric pip for "N things need your attention" — pending group
// join requests today, potentially other counts later. Renders nothing at
// zero rather than a badge reading "0", which reads as broken.
export function CountBadge({ count, style }: { count: number; style?: CSSProperties }) {
  if (count <= 0) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 16,
        height: 16,
        padding: '0 4px',
        borderRadius: 0,
        font: '800 10px var(--font-mono)',
        color: 'var(--gold-fg)',
        background: 'var(--gold-grad)',
        ...style,
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function ResultPill({ success }: { success: boolean }) {
  return (
    <span
      style={{
        font: '700 10px var(--font-sans)',
        letterSpacing: '.4px',
        padding: '2px 7px',
        borderRadius: 0,
        background: success ? 'var(--good-dim)' : 'var(--bad-dim)',
        color: success ? 'var(--good)' : 'var(--bad)',
        border: `1px solid color-mix(in oklab, ${success ? 'var(--good)' : 'var(--bad)'} 30%, transparent)`,
      }}
    >
      {success ? 'KILL' : 'WIPE'}
    </span>
  );
}

export function Card({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Delta tone is derived from the sign the caller already formatted in
// ("+3" / "-1,200") — a regression rendering in cheerful green was the
// old behavior, and it read as a data bug.
export function StatCard({ label, value, delta }: { label: string; value: ReactNode; delta?: string }) {
  const negative = delta?.trimStart().startsWith('-') ?? false;
  return (
    <Card style={{ padding: '18px 20px' }}>
      <div style={{ font: '600 11.5px var(--font-sans)', color: 'var(--text-58)', textTransform: 'uppercase', letterSpacing: '.6px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
        <div style={{ font: '800 26px var(--font-sans)', letterSpacing: '-.5px' }}>{value}</div>
        {delta && (
          <div style={{ font: '600 12px var(--font-sans)', color: negative ? 'var(--bad)' : 'var(--good)' }}>
            <span aria-hidden style={{ fontSize: 9, marginRight: 2, verticalAlign: '1px' }}>
              {negative ? '▼' : '▲'}
            </span>
            {delta}
          </div>
        )}
      </div>
    </Card>
  );
}

// One consistent page title block — several pages hand-rolled the same
// title/subtitle pair with slightly different sizes and margins; this
// pins them all to a single rhythm and gives an optional right-hand
// actions slot.
export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
      <div>
        <h1 style={{ font: '800 24px var(--font-sans)', letterSpacing: '-.4px' }}>{title}</h1>
        {subtitle && <div style={{ font: '400 13px var(--font-sans)', color: 'var(--text-60)', marginTop: 5 }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{actions}</div>}
    </div>
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
        borderRadius: 0,
      }}
    >
      {children}
    </span>
  );
}

export function GoldButton({
  children,
  onClick,
  to,
  disabled,
  type,
  style: styleOverride,
}: {
  children: ReactNode;
  onClick?: () => void;
  to?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  // Layout tweaks from the call site (margins, flex placement) — merged
  // over the base look so the gold styling itself stays consistent.
  style?: CSSProperties;
}) {
  const style: CSSProperties = {
    cursor: disabled ? 'default' : 'pointer',
    display: 'inline-block',
    font: '700 12.5px var(--font-sans)',
    padding: '9px 16px',
    borderRadius: 0,
    background: 'var(--gold-grad)',
    color: 'var(--gold-fg)',
    opacity: disabled ? 0.45 : 1,
    ...styleOverride,
  };
  if (to) {
    return (
      <Link to={to} className="u-btn-gold" style={style}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={disabled ? undefined : 'u-btn-gold'} style={style}>
      {children}
    </button>
  );
}
