import { Link, useLocation } from 'react-router-dom';
import { Logo, Avatar } from './atoms';
import { SearchBar } from './SearchBar';
import { useCurrentUser } from '../hooks/useCurrentUser';

const TABS = [
  { label: 'Dashboard', to: '/' },
  { label: 'Logs', to: '/logs' },
  { label: 'Leaderboards', to: '/leaderboards' },
  { label: 'Raid Planner', to: '/planner' },
  { label: 'Guilds', to: '/guilds' },
  { label: 'Compare', to: '/compare' },
];

export function NavHeader() {
  const location = useLocation();
  const { user } = useCurrentUser();

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
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
        {TABS.map((tab) => {
          const active = tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              style={{
                padding: '7px 14px',
                borderRadius: 9,
                font: '600 12.5px var(--font-sans)',
                whiteSpace: 'nowrap',
                background: active ? 'var(--gold-grad)' : 'transparent',
                color: active ? 'var(--gold-fg)' : 'var(--text-65)',
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div style={{ flex: 1, maxWidth: 420, marginLeft: 8 }}>
        <SearchBar width={9999} defaultValue="" />
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        {user && (
          <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
            <div style={{ font: '600 12.5px var(--font-sans)' }}>{user.discordUsername}</div>
            <div style={{ font: '600 10.5px var(--font-sans)', color: 'var(--gold)' }}>
              {user.gw2AccountName ?? 'Not linked'}
            </div>
          </div>
        )}
        <Avatar to={user ? '/account' : '/login'} name={user?.discordUsername} imgSrc={user?.discordAvatar} />
      </div>
    </div>
  );
}
