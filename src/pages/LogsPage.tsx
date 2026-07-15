import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { Card, ParseBadge, ParseLegend, ResultPill } from '../components/atoms';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';

type Filter = 'all' | 'raid' | 'other' | 'kills';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'raid', label: 'Raids' },
  { key: 'other', label: 'Strikes & Fractals' },
  { key: 'kills', label: 'Kills only' },
];

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function LogsPage() {
  const [filter, setFilter] = useState<Filter>('all');

  const { data: logs, loading, error } = useApiQuery(
    () =>
      api.logs({
        category: filter === 'raid' ? 'raid' : filter === 'other' ? 'other' : undefined,
        killsOnly: filter === 'kills',
        limit: 100,
      }),
    [filter],
  );

  return (
    <div>
      <div style={{ font: '800 22px var(--font-sans)', marginBottom: 4 }}>Logs</div>
      <div style={{ font: '400 13px var(--font-sans)', color: 'var(--text-60)', marginBottom: 20 }}>
        All uploaded reports across raids, strikes and fractals
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '7px 14px',
                borderRadius: 20,
                font: '600 12px var(--font-sans)',
                background: active ? 'var(--gold-dim)' : 'var(--bg-chip)',
                color: active ? 'var(--gold)' : 'var(--text-65)',
                border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginBottom: 14 }}>
        <ParseLegend />
      </div>

      {loading && <LoadingState label="Loading logs…" />}
      {error && <ErrorState message={error} />}
      {!loading && !error && logs?.length === 0 && (
        <EmptyState>No logs match this filter yet. Upload a log to see it here.</EmptyState>
      )}

      {logs && logs.length > 0 && (
        <Card style={{ overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2.2fr 0.9fr 0.7fr 0.8fr 0.9fr 0.7fr 0.9fr',
              gap: 8,
              padding: '12px 20px',
              font: '700 10.5px var(--font-sans)',
              textTransform: 'uppercase',
              letterSpacing: '.5px',
              color: 'var(--text-55)',
              borderBottom: '1px solid var(--border-soft)',
            }}
          >
            <div>Encounter</div>
            <div>Category</div>
            <div>Duration</div>
            <div>Result</div>
            <div>Squad DPS</div>
            <div>Parse</div>
            <div>Date</div>
          </div>
          {logs.map((log, i) => (
            <Link
              key={log.id}
              to={`/logs/${log.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '2.2fr 0.9fr 0.7fr 0.8fr 0.9fr 0.7fr 0.9fr',
                gap: 8,
                alignItems: 'center',
                padding: '12px 20px',
                borderBottom: i === logs.length - 1 ? 'none' : '1px solid var(--border-faint)',
              }}
            >
              <div style={{ font: '600 13px var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {log.boss}
                {log.isCm ? ' CM' : ''}
              </div>
              <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-62)', textTransform: 'capitalize' }}>{log.category}</div>
              <div style={{ font: '400 12px var(--font-mono)', color: 'var(--text-70)' }}>{formatDuration(log.durationMs)}</div>
              <div>
                <ResultPill success={log.success} />
              </div>
              <div style={{ font: '700 12.5px var(--font-mono)', color: 'var(--gold)' }}>{log.squadDps.toLocaleString()}</div>
              <div>{log.parsePct != null ? <ParseBadge pct={log.parsePct} /> : <span style={{ color: 'var(--text-50)' }}>—</span>}</div>
              <div style={{ font: '400 12px var(--font-mono)', color: 'var(--text-55)' }}>{new Date(log.uploadedAt).toLocaleDateString()}</div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
