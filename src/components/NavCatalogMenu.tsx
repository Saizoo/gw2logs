import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { groupImage, type CatalogBoss, type CatalogGroup } from '../data/catalog';
import { ArtImg } from './atoms';

// The Raids / Fractals nav item: an accordion catalog panel. The label itself
// links to the overview page (/raids or /fractals); hovering or focusing opens
// the panel, where each wing / instance is a row with its own scoped links and
// a dropdown revealing its bosses. Wings get no Rankings (rankings are
// boss-only); bosses get Rankings + Statistics + All Reports.

function q(kind: 'boss' | 'wing', value: string): string {
  return `${kind}=${encodeURIComponent(value)}`;
}

function ScopeLinks({ scope, value, includeRankings, onNavigate }: { scope: 'boss' | 'wing'; value: string; includeRankings: boolean; onNavigate: () => void }) {
  const s = q(scope, value);
  const links = [
    ...(includeRankings ? [{ label: 'Rankings', to: `/rankings?${s}` }] : []),
    { label: 'Statistics', to: `/statistics?${s}` },
    { label: 'All Reports', to: `/reports?${s}` },
  ];
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {links.map((l) => (
        <Link
          key={l.label}
          to={l.to}
          onClick={onNavigate}
          style={{ font: '700 10px var(--font-sans)', letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--gold)', whiteSpace: 'nowrap' }}
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease', flex: 'none' }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function GroupRow({ group, onNavigate }: { group: CatalogGroup; onNavigate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const img = groupImage(group);
  return (
    <div style={{ borderBottom: '1px solid var(--border-faint)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px' }}>
        <button
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${group.name}`}
          className="u-row"
          style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, padding: 0, background: 'none', color: 'inherit', textAlign: 'left' }}
        >
          <div style={{ position: 'relative', width: 30, height: 30, flex: 'none', overflow: 'hidden', border: '1px solid var(--border-faint)', background: 'color-mix(in srgb, var(--color-text) 6%, transparent)' }}>
            {img && <ArtImg src={img} />}
          </div>
          <span style={{ font: '800 12.5px var(--font-sans)', letterSpacing: '-.1px', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</span>
          <span style={{ color: 'var(--text-55)' }}><Chevron open={expanded} /></span>
        </button>
      </div>
      <div style={{ padding: '0 12px 10px 52px' }}>
        <ScopeLinks scope="wing" value={group.name} includeRankings={false} onNavigate={onNavigate} />
      </div>

      {expanded && (
        <div style={{ padding: '2px 12px 10px', background: 'color-mix(in srgb, var(--color-text) 3%, transparent)' }}>
          {group.bosses.map((b: CatalogBoss) => (
            <div key={b.name} style={{ padding: '7px 6px 7px 40px', borderTop: '1px solid var(--border-faint)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ font: '600 12px var(--font-sans)' }}>{b.name}</span>
                {b.hasCm && <span style={{ font: '800 8px var(--font-sans)', letterSpacing: '.4px', padding: '1px 5px', color: 'var(--gold)', background: 'color-mix(in srgb, var(--color-accent) 14%, transparent)' }}>CM</span>}
              </div>
              <ScopeLinks scope="boss" value={b.name} includeRankings onNavigate={onNavigate} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function NavCatalogMenu({ label, to, catalog }: { label: string; to: string; catalog: CatalogGroup[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const active = location.pathname.startsWith(to);

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
      style={{ position: 'relative' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <Link
        to={to}
        className="nav-tab"
        data-tour={label.toLowerCase()}
        onFocus={() => setOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '7px 12px',
          font: '700 12.5px var(--font-sans)',
          letterSpacing: '.04em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          color: active ? 'var(--gold)' : 'var(--text-65)',
        }}
      >
        {label}
        <span style={{ color: 'var(--text-55)' }}><Chevron open={open} /></span>
      </Link>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 8,
            width: 360,
            maxHeight: '72vh',
            overflowY: 'auto',
            background: 'var(--color-surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            zIndex: 70,
            animation: 'fadeIn 0.14s ease both',
          }}
        >
          {catalog.map((group) => (
            <GroupRow key={group.name} group={group} onNavigate={() => setOpen(false)} />
          ))}
        </div>
      )}
    </div>
  );
}
