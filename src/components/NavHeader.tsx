import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo, Avatar, CountBadge } from './atoms';
import { SearchBar } from './SearchBar';
import { NotificationBell } from './NotificationBell';
import { NavCatalogMenu, type EncounterCategory } from './NavCatalogMenu';
import { RAID_CATALOG, STRIKE_CATALOG, FRACTAL_CATALOG } from '../data/catalog';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { api, type CurrentUser } from '../lib/api';

// Raids and Fractals are catalog mega-menus (see NavCatalogMenu); the rest are
// plain tabs. Raid Planner is deliberately not here — it's reached from a
// group's page. Dashboard leads; Groups/Characters/Compare (and Admin) follow
// the two menus.
const DASH_TAB = { label: 'Dashboard', to: '/' };
const AFTER_TABS: { label: string; to: string }[] = [
  { label: 'Groups', to: '/groups' },
  { label: 'Compare', to: '/compare' },
];

// The single "Encounters" menu toggles between these three categories. Order
// here is the order of the toggle bar.
const ENCOUNTER_CATEGORIES: EncounterCategory[] = [
  { key: 'raids', label: 'Raids', to: '/raids', catalog: RAID_CATALOG },
  { key: 'strikes', label: 'Raid Encounters', to: '/strikes', catalog: STRIKE_CATALOG },
  { key: 'fractals', label: 'FOTM', to: '/fractals', catalog: FRACTAL_CATALOG },
];

function isTabActive(to: string, pathname: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname.startsWith(to);
}

export function NavHeader() {
  const location = useLocation();
  const { user } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Admin lives in the user menu now, not the main nav bar.
  const afterTabs = AFTER_TABS;
  // Flat list used only for the mobile panel (menus collapse to plain links
  // there). Admin is appended for admins so it stays reachable on mobile.
  const mobileTabs = [DASH_TAB, { label: 'Raids', to: '/raids' }, { label: 'Raid Encounters', to: '/strikes' }, { label: 'FOTM', to: '/fractals' }, ...afterTabs, ...(user?.isAdmin ? [{ label: 'Admin', to: '/admin' }] : [])];

  const tabStyle = (active: boolean) =>
    ({
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '8px 12px',
      borderRadius: 'var(--radius-md)',
      font: '600 14px var(--font-sans)',
      letterSpacing: 'normal',
      textTransform: 'none',
      whiteSpace: 'nowrap',
      background: 'transparent',
      color: active ? 'var(--gold)' : 'var(--text-70)',
    }) as const;

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      <div
        className="nav-bar-inner"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          padding: '0 24px',
          height: 60,
          background: 'var(--bg-nav)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <Logo />

        <button
          className="nav-hamburger-btn"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          style={{
            display: 'none',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 4,
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-chip)',
            border: '1px solid var(--border)',
            flex: 'none',
          }}
        >
          {mobileOpen ? (
            <span style={{ font: '700 15px var(--font-sans)', color: 'var(--text-80)', lineHeight: '1' }}>×</span>
          ) : (
            <>
              <span style={{ display: 'block', width: 16, height: 2, margin: '0 auto', background: 'var(--text-70)', borderRadius: 'var(--radius-md)' }} />
              <span style={{ display: 'block', width: 16, height: 2, margin: '0 auto', background: 'var(--text-70)', borderRadius: 'var(--radius-md)' }} />
              <span style={{ display: 'block', width: 16, height: 2, margin: '0 auto', background: 'var(--text-70)', borderRadius: 'var(--radius-md)' }} />
            </>
          )}
        </button>

        <div className="nav-collapsible" style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'visible' }}>
            <Link to={DASH_TAB.to} data-tour="dashboard" className={`nav-tab${isTabActive('/', location.pathname) ? ' is-active' : ''}`} style={tabStyle(isTabActive('/', location.pathname))}>
              {DASH_TAB.label}
            </Link>
            <NavCatalogMenu label="Encounters" categories={ENCOUNTER_CATEGORIES} />
            {afterTabs.map((tab) => {
              const active = isTabActive(tab.to, location.pathname);
              const badgeCount = tab.to === '/groups' ? user?.pendingGroupRequests ?? 0 : 0;
              return (
                <Link key={tab.to} to={tab.to} data-tour={tab.label.toLowerCase()} className={`nav-tab${active ? ' is-active' : ''}`} style={tabStyle(active)}>
                  {tab.label}
                  {badgeCount > 0 && <CountBadge count={badgeCount} />}
                </Link>
              );
            })}
          </div>

          <div style={{ marginLeft: 'auto', flex: '0 1 420px', minWidth: 0 }}>
            <SearchBar width="100%" defaultValue="" />
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          {user?.dpsReportLinked ? (
            <Link
              to="/account"
              data-tour="connect"
              title="dps.report auto-import is on — manage in settings"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px', borderRadius: 999, font: '700 12px var(--font-sans)', color: 'var(--good)', background: 'color-mix(in srgb, var(--good) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--good) 40%, transparent)', whiteSpace: 'nowrap' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              Logs connected
            </Link>
          ) : (
            <Link
              to="/account"
              data-tour="connect"
              className="nav-connect"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 999, font: '700 12.5px var(--font-sans)', color: 'var(--gold-fg)', background: 'var(--gold)', whiteSpace: 'nowrap' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              Connect logs
            </Link>
          )}
          {user && <NotificationBell />}
          {user ? (
            <UserMenu user={user} />
          ) : (
            <Avatar to="/login" />
          )}
        </div>
      </div>

      {mobileOpen && (
        <div
          style={{
            position: 'absolute',
            top: 62,
            left: 0,
            right: 0,
            padding: 16,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            animation: 'fadeIn 0.18s ease both',
            zIndex: 60,
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <SearchBar width="100%" defaultValue="" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {mobileTabs.map((tab) => {
              const active = isTabActive(tab.to, location.pathname);
              const badgeCount = tab.to === '/groups' ? user?.pendingGroupRequests ?? 0 : 0;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  data-tour={tab.label.toLowerCase()}
                  className={`nav-tab${active ? ' is-active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '11px 14px',
                    borderRadius: 'var(--radius-md)',
                    font: '650 14px var(--font-sans)',
                    letterSpacing: 'normal',
                    textTransform: 'none',
                    background: active ? 'var(--gold)' : 'var(--bg-chip)',
                    color: active ? 'var(--gold-fg)' : 'var(--text-70)',
                  }}
                >
                  {tab.label}
                  {badgeCount > 0 && (
                    <CountBadge count={badgeCount} style={active ? { background: 'var(--gold-fg)', color: 'var(--gold)' } : undefined} />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// The signed-in user's menu: the identity pill (avatar + name + account)
// toggles a dropdown with profile / settings / admin links and sign-out.
function UserMenu({ user }: { user: CurrentUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
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

  async function signOut() {
    try {
      await api.logout();
    } finally {
      window.location.href = '/';
    }
  }

  const profileTo = user.gw2AccountName ? `/players/${encodeURIComponent(user.gw2AccountName)}` : '/account';
  const items: { label: string; to: string; icon: ReactNode }[] = [
    { label: 'My profile', to: profileTo, icon: <path d="M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /> },
    { label: 'My settings', to: '/account', icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></> },
    ...(user.isAdmin ? [{ label: 'Admin', to: '/admin', icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /> }] : []),
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 9px 5px 5px', borderRadius: 999, cursor: 'pointer', background: open ? 'var(--bg-chip)' : 'transparent', border: '1px solid ' + (open ? 'var(--border)' : 'transparent'), transition: 'background .13s ease' }}
      >
        <Avatar size={30} name={user.discordUsername} imgSrc={user.discordAvatar} to={null} />
        <span className="nav-user-text" style={{ textAlign: 'left', lineHeight: 1.15 }}>
          <span style={{ display: 'block', font: '650 12.5px var(--font-sans)' }}>{user.discordUsername}</span>
          <span style={{ display: 'block', font: '600 10.5px var(--font-sans)', color: 'var(--gold)' }}>{user.gw2AccountName ?? 'Not linked'}</span>
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }}><path d="M6 9l6 6 6-6" /></svg>
      </button>

      {open && (
        <div
          role="menu"
          style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 210, padding: 6, background: 'color-mix(in srgb, var(--bg-nav) 98%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 80 }}
        >
          {items.map((it) => (
            <Link
              key={it.label}
              to={it.to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="u-row"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 'var(--radius-sm)', font: '600 13px var(--font-sans)', color: 'var(--text-80)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-55)', flex: 'none' }}>{it.icon}</svg>
              {it.label}
            </Link>
          ))}
          <div style={{ height: 1, background: 'var(--border-faint)', margin: '6px 4px' }} />
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="u-row"
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 11px', borderRadius: 'var(--radius-sm)', font: '600 13px var(--font-sans)', color: 'var(--bad)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
