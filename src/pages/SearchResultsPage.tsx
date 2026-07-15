import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';

export default function SearchResultsPage() {
  const [params] = useSearchParams();
  const query = params.get('q') ?? '';
  const { data: results, loading, error } = useApiQuery(() => api.search(query), [query]);

  return (
    <div>
      <div style={{ maxWidth: 1040 }}>
        <div style={{ font: '800 22px var(--font-sans)', marginBottom: 6 }}>Search</div>
        <div style={{ font: '400 13px var(--font-sans)', color: 'var(--text-60)', marginBottom: 20 }}>
          Results for "<span style={{ color: 'var(--gold)' }}>{query}</span>" across players and bosses
        </div>

        {loading && <LoadingState label="Searching…" />}
        {error && <ErrorState message={error} />}
        {results && results.players.length === 0 && results.bosses.length === 0 && (
          <EmptyState>No matches for "{query}".</EmptyState>
        )}

        {results && results.players.length > 0 && (
          <>
            <div style={{ font: '600 11px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
              Players
            </div>
            {results.players.map((p) => (
              <Link
                key={p.account}
                to={`/players/${encodeURIComponent(p.account)}`}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', background: 'var(--bg-row)', borderRadius: 6, marginBottom: 3 }}
              >
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold-dim)', flex: 'none' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>{p.displayName}</div>
                  <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-40)' }}>{p.account}</div>
                </div>
              </Link>
            ))}
          </>
        )}

        {results && results.bosses.length > 0 && (
          <>
            <div style={{ font: '600 11px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.05em', margin: '20px 0 10px' }}>
              Bosses
            </div>
            {results.bosses.map((b) => (
              <Link
                key={`${b.fightName}-${b.isCm}`}
                to={`/leaderboards?encounter=${encodeURIComponent(b.fightName)}&cm=${b.isCm}`}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 14px', background: 'var(--bg-row)', borderRadius: 6, marginBottom: 3 }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gold-dim)', flex: 'none' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>{b.fightName}</div>
                  <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-40)' }}>{b.wing ?? `${b.logCount} logs`}</div>
                </div>
                {b.isCm && (
                  <span style={{ font: '600 10px var(--font-sans)', padding: '2px 8px', background: 'var(--gold-dim)', color: 'var(--gold)', borderRadius: 4 }}>
                    CM
                  </span>
                )}
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
