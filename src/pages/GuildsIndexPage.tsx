import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';

export default function GuildsIndexPage() {
  const { data: guilds, loading, error } = useApiQuery(() => api.guilds(), []);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px' }}>
      <h1 style={{ font: '800 22px var(--font-sans)', color: 'var(--text)', marginBottom: 20 }}>Guilds</h1>

      {loading && <LoadingState label="Loading guilds…" />}
      {error && <ErrorState message={error} />}
      {!loading && !error && guilds?.length === 0 && (
        <EmptyState>
          No guilds yet. Guilds appear here once a member links their GW2 account with the "guilds" API key
          permission from the account page.
        </EmptyState>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {guilds?.map((g) => (
          <Link
            key={g.tag}
            to={`/guilds/${encodeURIComponent(g.tag)}`}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 18 }}
          >
            <div style={{ font: '700 15px var(--font-sans)', color: 'var(--text)' }}>
              {g.name} <span style={{ color: 'var(--gold)' }}>[{g.tag}]</span>
            </div>
            <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-40)', marginTop: 4 }}>
              {g.memberCount} member{g.memberCount === 1 ? '' : 's'} linked
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
