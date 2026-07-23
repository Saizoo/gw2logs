import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo, Avatar, CountBadge } from './atoms';
import { SearchBar } from './SearchBar';
import { NotificationBell } from './NotificationBell';
import { UploadIndicator } from './UploadIndicator';
import { useCurrentUser } from '../hooks/useCurrentUser';

// Raid Planner is deliberately not here — it's only meaningful in the
// context of a specific group's roster/compositions, so it's reached via
// the "Open Raid Planner" button on that group's page instead of a global
// tab. The /planner route itself still works standalone (falls back to a
// group picker) for anyone with an old bookmark.
// `match` lists extra path prefixes that keep a tab highlighted — the
// Encounters and Benchmarks sections each own a sub-page that lives on a
// different top-level route (/logs, /leaderboards).
const TABS: { label: string; to: string; match?: string[] }[] = [
  { label: 'Dashboard', to: '/' },
  { label: 'Encounters', to: '/encounters', match: ['/encounters', '/logs'] },
  { label: 'Benchmarks', to: '/benchmarks', match: ['/benchmarks', '/leaderboards'] },
  { label: 'Groups', to: '/groups' },
  { label: 'Characters', to: '/characters' },
  { label: 'Compare', to: '/compare' },
];

function isTabActive(tab: { to: string; match?: string[] }, pathname: string): boolean {
  if (tab.to === '/') return pathname === '/';
  return (tab.match ?? [tab.to]).some((prefix) => pathname.startsWith(prefix));
}

export function NavHeader() {
  const location = useLocation();
  const { user } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  // A tab click inside the mobile panel navigates but doesn't unmount
  // NavHeader (it lives above the route's <main>), so the panel has to be
  // closed explicitly on every route change rather than just on click.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const tabs = [...TABS, ...(user?.isAdmin ? [{ label: 'Admin', to: '/admin' }] : [])];

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
          borderRadius: 0,
          background: 'var(--bg-nav)',
          borderBottom: '2px solid var(--border)',
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
            borderRadius: 0,
            background: 'var(--bg-chip)',
            border: '1px solid var(--border)',
            flex: 'none',
          }}
        >
          {mobileOpen ? (
            <span style={{ font: '700 15px var(--font-sans)', color: 'var(--text-80)', lineHeight: '1' }}>×</span>
          ) : (
            <>
              <span style={{ display: 'block', width: 16, height: 2, margin: '0 auto', background: 'var(--text-70)', borderRadius: 0 }} />
              <span style={{ display: 'block', width: 16, height: 2, margin: '0 auto', background: 'var(--text-70)', borderRadius: 0 }} />
              <span style={{ display: 'block', width: 16, height: 2, margin: '0 auto', background: 'var(--text-70)', borderRadius: 0 }} />
            </>
          )}
        </button>

        <div className="nav-collapsible" style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 0,
              overflowX: 'auto',
            }}
          >
            {tabs.map((tab) => {
              const active = isTabActive(tab, location.pathname);
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
                    gap: 6,
                    padding: '7px 12px',
                    borderRadius: 0,
                    font: '700 12.5px var(--font-sans)',
                    letterSpacing: '.04em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    background: 'transparent',
                    color: active ? 'var(--gold)' : 'var(--text-65)',
                  }}
                >
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
          <UploadIndicator />
          {user && <NotificationBell />}
          {user && (
            <div className="nav-user-text" style={{ textAlign: 'right', lineHeight: 1.2 }}>
              <div style={{ font: '600 12.5px var(--font-sans)' }}>{user.discordUsername}</div>
              <div style={{ font: '600 10.5px var(--font-sans)', color: 'var(--gold)' }}>
                {user.gw2AccountName ?? 'Not linked'}
              </div>
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
            borderRadius: 0,
            background: 'var(--color-surface)',
            borderBottom: '2px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            animation: 'fadeIn 0.18s ease both',
            zIndex: 60,
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <SearchBar width="100%" defaultValue="" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {tabs.map((tab) => {
              const active = isTabActive(tab, location.pathname);
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
                    borderRadius: 0,
                    font: '700 13px var(--font-sans)',
                    letterSpacing: '.04em',
                    textTransform: 'uppercase',
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
