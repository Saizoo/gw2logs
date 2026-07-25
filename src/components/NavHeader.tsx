import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo, Avatar, CountBadge } from './atoms';
import { SearchBar } from './SearchBar';
import { NotificationBell } from './NotificationBell';
import { NavCatalogMenu, type EncounterCategory } from './NavCatalogMenu';
import { RAID_CATALOG, STRIKE_CATALOG, FRACTAL_CATALOG } from '../data/catalog';
import { useCurrentUser } from '../hooks/useCurrentUser';

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

  const afterTabs = [...AFTER_TABS, ...(user?.isAdmin ? [{ label: 'Admin', to: '/admin' }] : [])];
  // Flat list used only for the mobile panel (menus collapse to plain links there).
  const mobileTabs = [DASH_TAB, { label: 'Raids', to: '/raids' }, { label: 'Raid Encounters', to: '/strikes' }, { label: 'FOTM', to: '/fractals' }, ...afterTabs];

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

          <div style={{ flex: 1, maxWidth: 420 }}>
            <SearchBar width="100%" defaultValue="" />
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            to="/account"
            data-tour="connect"
            className="nav-connect"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 999, font: '700 12.5px var(--font-sans)', color: 'var(--gold-fg)', background: 'var(--gold)', whiteSpace: 'nowrap' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            Connect logs
          </Link>
          {user && <NotificationBell />}
          {user && (
            <div className="nav-user-text" style={{ textAlign: 'right', lineHeight: 1.2 }}>
              <div style={{ font: '600 12.5px var(--font-sans)' }}>{user.discordUsername}</div>
              <div style={{ font: '600 10.5px var(--font-sans)', color: 'var(--gold)' }}>{user.gw2AccountName ?? 'Not linked'}</div>
            </div>
          )}
          <Avatar to={user ? '/account' : '/login'} name={user?.discordUsername} imgSrc={user?.discordAvatar} />
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
