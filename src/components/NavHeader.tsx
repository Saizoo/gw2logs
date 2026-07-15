import { Link, useLocation } from 'react-router-dom';
import { Logo, Avatar } from './atoms';
import { SearchBar } from './SearchBar';
import { useCurrentUser } from '../hooks/useCurrentUser';

const LINKS = [
  { label: 'Encounters', to: '/encounters' },
  { label: 'Leaderboards', to: '/leaderboards' },
  { label: 'Guilds', to: '/guilds' },
  { label: 'Compare', to: '/compare' },
];

const UPLOAD_LINK_STYLE = {
  padding: '6px 14px',
  background: 'var(--gold)',
  borderRadius: 6,
  font: '700 12px var(--font-sans)',
  color: '#14120f',
} as const;

export function NavHeader() {
  const location = useLocation();
  const { user } = useCurrentUser();

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 28px',
        background: 'var(--bg-header)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <Logo />
        <nav style={{ display: 'flex', gap: 20, font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>
          {LINKS.map((link) => {
            const active = location.pathname.startsWith(link.to.split('/').slice(0, 2).join('/'));
            return (
              <Link key={link.label} to={link.to} style={{ color: active ? 'var(--gold)' : 'var(--text-55)' }}>
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <SearchBar />
        <Link to="/upload" style={UPLOAD_LINK_STYLE}>
          Upload
        </Link>
        <Avatar
          to={user ? '/account' : '/login'}
          name={user?.discordUsername}
          imgSrc={user?.discordAvatar}
        />
      </div>
    </header>
  );
}
