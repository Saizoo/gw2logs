import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { bossImage, type CatalogBoss, type CatalogGroup } from '../data/catalog';
import { ArtImg } from './atoms';

// The single "Encounters" nav item: a full-width mega-menu with a toggle bar
// that switches the poster grid between categories (Raids / Raid Encounters /
// FOTM). The label links to the active category's overview; each boss tile
// links to that boss's rankings ladder.

export interface EncounterCategory {
  key: string;
  label: string;
  to: string;
  catalog: CatalogGroup[];
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease', flex: 'none', opacity: 0.7 }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// One encounter action pill (Leaderboards / Logs / Statistics), revealed on
// tile hover. Dark translucent chip over the boss art, matching the design.
function ActionPill({ to, label, onNavigate }: { to: string; label: string; onNavigate: () => void }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      style={{
        font: '700 10px var(--font-sans)',
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        padding: '6px 11px',
        borderRadius: 999,
        color: 'var(--on-art)',
        background: 'rgba(10,12,12,.72)',
        border: '1px solid rgba(255,255,255,.16)',
        whiteSpace: 'nowrap',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold-fg)'; e.currentTarget.style.borderColor = 'transparent'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(10,12,12,.72)'; e.currentTarget.style.color = 'var(--on-art)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.16)'; }}
    >
      {label}
    </Link>
  );
}

// A wide encounter tile: boss art under a scrim, the boss name pinned to the
// bottom, and a Leaderboards / Logs / Statistics action row that fades in on
// hover (see .enc-tile in index.css). Grouped under a wing header by the menu.
function BossTile({ boss, onNavigate }: { boss: CatalogBoss; onNavigate: () => void }) {
  const img = bossImage(boss.name);
  const q = `boss=${encodeURIComponent(boss.name)}`;
  return (
    <div
      className="enc-tile"
      style={{
        position: 'relative',
        height: 122,
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--color-neutral-800)',
        transition: 'border-color .14s ease',
      }}
    >
      {img && <ArtImg src={img} />}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,.9) 8%, rgba(0,0,0,.35) 52%, rgba(0,0,0,.12) 100%)' }} />

      {/* Hover actions — Logs + Statistics on one centered row. */}
      <div className="enc-actions" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: 'rgba(6,8,8,.45)' }}>
        <ActionPill to={`/reports?${q}`} label="Logs" onNavigate={onNavigate} />
        <ActionPill to={`/statistics?${q}`} label="Statistics" onNavigate={onNavigate} />
      </div>

      {/* CM chip (top-right). */}
      {boss.hasCm && (
        <span style={{ position: 'absolute', top: 8, right: 8, font: '800 8.5px var(--font-sans)', letterSpacing: '.4px', padding: '2px 6px', borderRadius: 999, color: 'var(--gold)', background: 'color-mix(in srgb, var(--color-accent) 26%, transparent)', border: '1px solid color-mix(in srgb, var(--color-accent) 50%, transparent)' }}>
          CM
        </span>
      )}

      {/* Boss name (bottom). */}
      <div style={{ position: 'absolute', left: 11, right: 11, bottom: 9 }}>
        <span style={{ display: 'block', font: '700 12.5px var(--font-sans)', letterSpacing: '-.2px', color: 'var(--on-art)', textShadow: '0 1px 4px rgba(0,0,0,.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {boss.name}
        </span>
      </div>
    </div>
  );
}

export function NavCatalogMenu({ label, categories }: { label: string; categories: EncounterCategory[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const location = useLocation();

  // Which category owns the current route (so a boss/overview page highlights
  // the nav item and the menu opens on the matching toggle).
  const routeIdx = categories.findIndex((c) => location.pathname.startsWith(c.to));
  const active = routeIdx !== -1;
  const [activeIdx, setActiveIdx] = useState(routeIdx === -1 ? 0 : routeIdx);
  const activeCat = categories[activeIdx] ?? categories[0];

  // Hover open/close with a short close delay so the diagonal move from the
  // trigger down into the full-width panel doesn't flicker it shut.
  function openNow() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    // Reopen on the toggle that matches where the viewer currently is.
    setActiveIdx(routeIdx === -1 ? 0 : routeIdx);
    setOpen(true);
  }
  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 200);
  }
  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  // Lock page scroll while the full-screen mega-menu is open. The scroll
  // container is <html> (its overflow-x:hidden forces overflow-y:auto), so
  // locking body alone does nothing — lock the root element too.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prevRoot = root.style.overflow;
    const prevBody = document.body.style.overflow;
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      root.style.overflow = prevRoot;
      document.body.style.overflow = prevBody;
    };
  }, [open]);

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
        to={activeCat.to}
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
        // Full-bleed mega-menu, fixed to the viewport just under the 60px nav
        // bar so it spans the whole width; an inner max-width container keeps
        // the grid aligned to the page.
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
            // Fill the screen below the 60px nav so the full wing grid fits
            // without scrolling on typical displays.
            maxHeight: 'calc(100vh - 60px)',
            overflowY: 'auto',
            animation: 'fadeIn 0.16s ease both',
          }}
        >
          <div style={{ maxWidth: 2200, margin: '0 auto', padding: '18px 40px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
              {/* Category toggle bar */}
              <div style={{ display: 'inline-flex', gap: 3, padding: 4, background: 'var(--bg-chip)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                {categories.map((c, i) => {
                  const on = i === activeIdx;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => setActiveIdx(i)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 'var(--radius-sm)',
                        font: '700 12.5px var(--font-sans)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        background: on ? 'var(--gold-dim)' : 'transparent',
                        color: on ? 'var(--gold)' : 'var(--text-60)',
                        transition: 'background .13s ease, color .13s ease',
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <Link to={activeCat.to} onClick={() => setOpen(false)} style={{ font: '600 13px var(--font-sans)', color: 'var(--gold)', whiteSpace: 'nowrap' }}>
                View all {activeCat.label.toLowerCase()} →
              </Link>
            </div>

            {/* Two columns of wing sections — Wing 1 | Wing 2, then the next
                pair on the row below — each with its bosses stacked beneath a
                wing header. */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px 28px', alignItems: 'start' }}>
              {activeCat.catalog.map((group) => (
                <section key={group.name}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={{ font: '700 11px var(--font-sans)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-65)', whiteSpace: 'nowrap' }}>{group.name}</div>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-faint)' }} />
                  </div>
                  {/* auto-fit (not auto-fill) collapses empty tracks, so each
                      wing's bosses stretch to fill the whole half-width instead
                      of leaving trailing gaps. */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
                    {group.bosses.map((b) => (
                      <BossTile key={b.name} boss={b} onNavigate={() => setOpen(false)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
