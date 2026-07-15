import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { Card } from '../components/atoms';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';

export default function GuildsIndexPage() {
  const { data: guilds, loading, error } = useApiQuery(() => api.guilds(), []);

  return (
    <div>
      <div style={{ font: '800 22px var(--font-sans)', marginBottom: 4 }}>Guilds</div>
      <div style={{ font: '400 13px var(--font-sans)', color: 'var(--text-60)', marginBottom: 20 }}>
        Every guild with at least one member linked to their GW2 account
      </div>

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
          <Link key={g.tag} to={`/guilds/${encodeURIComponent(g.tag)}`}>
            <Card style={{ padding: 18 }}>
              <div style={{ font: '700 15px var(--font-sans)', color: 'var(--text)' }}>
                {g.name} <span style={{ color: 'var(--gold)' }}>[{g.tag}]</span>
              </div>
              <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-55)', marginTop: 4 }}>
                {g.memberCount} member{g.memberCount === 1 ? '' : 's'} linked
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
