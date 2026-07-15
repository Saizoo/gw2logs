import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';

export default function EncountersIndexPage() {
  const { data: encounters, loading, error } = useApiQuery(() => api.encounters(), []);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px' }}>
      <h1 style={{ font: '800 22px var(--font-sans)', color: 'var(--text)', marginBottom: 20 }}>Encounters</h1>

      {loading && <LoadingState label="Loading encounters…" />}
      {error && <ErrorState message={error} />}
      {!loading && !error && encounters?.length === 0 && (
        <EmptyState>No logs uploaded yet. Upload your first log to populate this list.</EmptyState>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {encounters?.map((e) => (
          <Link
            key={`${e.fightName}-${e.isCm}`}
            to={`/encounters/${encodeURIComponent(e.fightName)}${e.isCm ? '' : '?cm=false'}`}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 18 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ font: '700 15px var(--font-sans)', color: 'var(--text)' }}>{e.fightName}</div>
              {e.isCm && (
                <span style={{ font: '600 10px var(--font-sans)', padding: '2px 8px', background: 'var(--gold-dim)', color: 'var(--gold)', borderRadius: 4 }}>
                  CM
                </span>
              )}
            </div>
            <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-40)' }}>{e.wing ?? `${e.logCount} logs`}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
