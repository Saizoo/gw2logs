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
    <div style={{ position: 'sticky', top: 0, zIndex: 50, padding: '14px 20px 0' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          padding: '0 22px',
          height: 60,
          borderRadius: 18,
          background: 'linear-gradient(180deg, oklch(0.2 0.017 250 / 97%), oklch(0.15 0.014 250 / 97%))',
          backdropFilter: 'blur(16px) saturate(140%)',
          border: '1px solid oklch(1 0 0 / 9%)',
          boxShadow: '0 1px 0 oklch(1 0 0 / 8%) inset, 0 20px 44px -20px rgba(0,0,0,.65)',
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

        <div className="nav-collapsible" style={{ display: 'flex', alignItems: 'center', gap: 20, flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              background: 'oklch(0.12 0.014 250 / 65%)',
              border: '1px solid oklch(1 0 0 / 7%)',
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
                    boxShadow: active ? '0 4px 16px oklch(0.7 0.14 85 / 30%)' : undefined,
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
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px 9px 13px',
              borderRadius: 20,
              font: '700 12.5px var(--font-sans)',
              whiteSpace: 'nowrap',
              background: 'var(--gold-grad)',
              color: 'var(--gold-fg)',
              boxShadow: '0 4px 16px oklch(0.7 0.14 85 / 32%)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 4v16M4 12h16" stroke="oklch(0.15 0.02 85)" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
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
            top: 78,
            left: 20,
            right: 20,
            padding: 16,
            borderRadius: 16,
            background: 'oklch(0.16 0.014 250 / 99%)',
            backdropFilter: 'blur(16px) saturate(140%)',
            border: '1px solid oklch(1 0 0 / 9%)',
            boxShadow: '0 20px 44px rgba(0,0,0,.5)',
            animation: 'fadeIn 0.18s ease both',
            zIndex: 60,
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
                    boxShadow: active ? '0 4px 16px oklch(0.7 0.14 85 / 30%)' : undefined,
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
