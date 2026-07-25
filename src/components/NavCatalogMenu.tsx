import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { bossImage, type CatalogBoss, type CatalogGroup } from '../data/catalog';
import { ArtImg } from './atoms';

// The Raids / Fractals nav item: a full-width mega-menu of encounter poster
// tiles, grouped by wing / fractal instance. The label itself links to the
// overview page (/raids or /fractals); hovering or focusing opens the panel,
// and each boss tile links to that boss's rankings ladder.

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease', flex: 'none', opacity: 0.7 }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// A single encounter poster: boss art under a bottom scrim, name pinned to the
// bottom edge, and a CM chip top-right when the boss has a challenge mode.
function BossTile({ boss, onNavigate }: { boss: CatalogBoss; onNavigate: () => void }) {
  const img = bossImage(boss.name);
  return (
    <Link
      to={`/rankings?boss=${encodeURIComponent(boss.name)}`}
      onClick={onNavigate}
      className="u-card-link"
      style={{
        position: 'relative',
        height: 92,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 10,
        border: '1px solid var(--border)',
        background: 'var(--color-neutral-800)',
      }}
    >
      {img && <ArtImg src={img} />}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,.86) 6%, rgba(0,0,0,.3) 46%, transparent 78%)' }} />
      {boss.hasCm && (
        <span style={{ position: 'absolute', top: 8, right: 8, font: '800 8.5px var(--font-sans)', letterSpacing: '.4px', padding: '2px 6px', borderRadius: 999, color: 'var(--gold)', background: 'color-mix(in srgb, var(--color-accent) 22%, transparent)', border: '1px solid color-mix(in srgb, var(--color-accent) 45%, transparent)' }}>
          CM
        </span>
      )}
      <div style={{ position: 'relative', font: '700 12.5px var(--font-sans)', color: 'var(--on-art)', textShadow: '0 1px 3px rgba(0,0,0,.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {boss.name}
      </div>
    </Link>
  );
}

export function NavCatalogMenu({ label, to, catalog }: { label: string; to: string; catalog: CatalogGroup[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const location = useLocation();
  const active = location.pathname.startsWith(to);

  // Hover open/close with a short close delay so the diagonal move from the
  // trigger down into the full-width panel doesn't flicker it shut.
  function openNow() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpen(true);
  }
  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 200);
  }
  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  // Close on outside click, Escape, and whenever the route changes.
  useEffect(() => setOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      style={{ position: 'relative', alignSelf: 'stretch', display: 'flex', alignItems: 'center' }}
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <Link
        to={to}
        className="nav-tab"
        data-tour={label.toLowerCase()}
        onFocus={openNow}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          font: '600 14px var(--font-sans)',
          whiteSpace: 'nowrap',
          color: active ? 'var(--gold)' : 'var(--text-70)',
        }}
      >
        {label}
        <Chevron open={open} />
      </Link>

      {open && (
        // Full-bleed mega-menu. Fixed to the viewport just under the 60px nav
        // bar so it spans the whole width like the design's Encounters menu;
        // an inner max-width container keeps the grid aligned to the page.
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            top: 60,
            background: 'color-mix(in srgb, var(--bg-nav) 98%, transparent)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderTop: '1px solid var(--border)',
            borderBottom: '1px solid var(--border-soft)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 70,
            maxHeight: '78vh',
            overflowY: 'auto',
            animation: 'fadeIn 0.16s ease both',
          }}
        >
          <div style={{ maxWidth: 1220, margin: '0 auto', padding: '20px 24px 26px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ font: '700 10.5px var(--font-sans)', letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--text-55)' }}>{label}</div>
                <div style={{ font: '800 18px var(--font-sans)', marginTop: 2, letterSpacing: '-.2px' }}>Browse every encounter</div>
              </div>
              <Link to={to} onClick={() => setOpen(false)} style={{ font: '600 13px var(--font-sans)', color: 'var(--gold)', whiteSpace: 'nowrap' }}>
                View all {label.toLowerCase()} →
              </Link>
            </div>

            {catalog.map((group) => (
              <div key={group.name} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 11 }}>
                  <div style={{ font: '700 11px var(--font-sans)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-60)', whiteSpace: 'nowrap' }}>{group.name}</div>
                  <div style={{ flex: 1, height: 1, background: 'var(--border-faint)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(188px, 1fr))', gap: 12 }}>
                  {group.bosses.map((b) => (
                    <BossTile key={b.name} boss={b} onNavigate={() => setOpen(false)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
