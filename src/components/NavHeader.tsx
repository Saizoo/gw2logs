import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo, Avatar, CountBadge } from './atoms';
import { SearchBar } from './SearchBar';
import { useCurrentUser } from '../hooks/useCurrentUser';

// Raid Planner is deliberately not here — it's only meaningful in the
// context of a specific group's roster/compositions, so it's reached via
// the "Open Raid Planner" button on that group's page instead of a global
// tab. The /planner route itself still works standalone (falls back to a
// group picker) for anyone with an old bookmark.
const TABS = [
  { label: 'Dashboard', to: '/' },
  { label: 'Logs', to: '/logs' },
  { label: 'Leaderboards', to: '/leaderboards' },
  { label: 'Groups', to: '/groups' },
  { label: 'Characters', to: '/characters' },
  { label: 'Compare', to: '/compare' },
];

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
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          padding: '0 32px',
          height: 64,
          background: 'var(--bg-nav)',
          backdropFilter: 'blur(16px) saturate(140%)',
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
            borderRadius: 8,
            background: 'var(--bg-chip)',
            border: '1px solid var(--border)',
            flex: 'none',
          }}
        >
          {mobileOpen ? (
            <span style={{ font: '700 15px var(--font-sans)', color: 'var(--text-80)', lineHeight: '1' }}>×</span>
          ) : (
            <>
              <span style={{ display: 'block', width: 16, height: 2, margin: '0 auto', background: 'var(--text-70)', borderRadius: 1 }} />
              <span style={{ display: 'block', width: 16, height: 2, margin: '0 auto', background: 'var(--text-70)', borderRadius: 1 }} />
              <span style={{ display: 'block', width: 16, height: 2, margin: '0 auto', background: 'var(--text-70)', borderRadius: 1 }} />
            </>
          )}
        </button>

        <div className="nav-collapsible" style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-soft)',
              borderRadius: 12,
              padding: 4,
              overflowX: 'auto',
            }}
          >
            {tabs.map((tab) => {
              const active = tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to);
              const badgeCount = tab.to === '/groups' ? user?.pendingGroupRequests ?? 0 : 0;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={`nav-tab${active ? ' is-active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 9,
                    font: '600 12.5px var(--font-sans)',
                    whiteSpace: 'nowrap',
                    background: active ? 'var(--gold-grad)' : 'transparent',
                    color: active ? 'var(--gold-fg)' : 'var(--text-65)',
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

          <div style={{ flex: 1, maxWidth: 420 }}>
            <SearchBar width="100%" defaultValue="" />
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            to="/upload"
            className="u-btn-gold"
            style={{
              flex: 'none',
              padding: '9px 16px',
              borderRadius: 10,
              font: '700 12.5px var(--font-sans)',
              whiteSpace: 'nowrap',
              background: 'var(--gold-grad)',
              color: 'var(--gold-fg)',
            }}
          >
            Upload
          </Link>
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
            top: 64,
            left: 0,
            right: 0,
            padding: 16,
            background: 'var(--bg-nav)',
            backdropFilter: 'blur(16px) saturate(140%)',
            borderBottom: '1px solid var(--border)',
            boxShadow: '0 16px 32px rgba(0,0,0,.4)',
            animation: 'fadeIn 0.18s ease both',
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <SearchBar width="100%" defaultValue="" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {tabs.map((tab) => {
              const active = tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to);
              const badgeCount = tab.to === '/groups' ? user?.pendingGroupRequests ?? 0 : 0;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={`nav-tab${active ? ' is-active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '11px 14px',
                    borderRadius: 9,
                    font: '600 13px var(--font-sans)',
                    background: active ? 'var(--gold-grad)' : 'var(--bg-chip)',
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
