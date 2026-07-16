import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type LogListItem } from '../lib/api';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Card, LoadMoreButton, PageHeader, ParseBadge, ParseLegend, ResultPill } from '../components/atoms';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';

type Filter = 'all' | 'raid' | 'fractal' | 'kills' | 'mine';

const PAGE_SIZE = 50;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'raid', label: 'Raids' },
  { key: 'fractal', label: 'Fractal CMs' },
  { key: 'kills', label: 'Kills only' },
];

const CATEGORY_LABELS: Record<LogListItem['category'], string> = {
  raid: 'Raid',
  fractal: 'Fractal CM',
  other: 'Other',
};

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function LogsPage() {
  const { user } = useCurrentUser();
  const [filter, setFilter] = useState<Filter>('all');
  const filters = user ? [...FILTERS, { key: 'mine' as const, label: 'Uploaded by me' }] : FILTERS;

  const { items: logs, loading, loadingMore, error, hasMore, loadMore } = usePaginatedList<LogListItem>(
    (offset) =>
      api
        .logs({
          category: filter === 'raid' ? 'raid' : filter === 'fractal' ? 'fractal' : undefined,
          killsOnly: filter === 'kills',
          mine: filter === 'mine',
          limit: PAGE_SIZE,
          offset,
        })
        // No total count comes back from this endpoint — a full page is the
        // only signal there might be more behind it.
        .then((items) => ({ items, hasMore: items.length === PAGE_SIZE })),
    [filter],
  );

  return (
    <div>
      <PageHeader title="Logs" subtitle="All uploaded reports across raids and fractal challenge modes" />

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={active ? undefined : 'u-chip'}
              style={{
                padding: '7px 14px',
                borderRadius: 20,
                font: '600 12px var(--font-sans)',
                background: active ? 'oklch(0.78 0.14 85 / 18%)' : 'oklch(1 0 0 / 5%)',
                color: active ? 'var(--gold)' : 'var(--text-65)',
                border: `1px solid ${active ? 'oklch(0.78 0.14 85 / 35%)' : 'var(--border)'}`,
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
        <EmptyState>
          {filter === 'mine'
            ? "No logs attributed to you yet — upload one while signed in, or claim one you're a player in from its Fight Report page."
            : 'No logs match this filter yet. Upload a log to see it here.'}
        </EmptyState>
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
              className="u-row"
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
              <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-62)' }}>{CATEGORY_LABELS[log.category]}</div>
              <div style={{ font: '400 12px var(--font-mono)', color: 'var(--text-70)' }}>{formatDuration(log.durationMs)}</div>
              <div>
                <ResultPill success={log.success} />
              </div>
              <div style={{ font: '700 12.5px var(--font-mono)', color: 'var(--gold)' }}>{log.squadDps.toLocaleString()}</div>
              <div>{log.parsePct != null ? <ParseBadge pct={log.parsePct} /> : <span style={{ color: 'var(--text-50)' }}>—</span>}</div>
              <div style={{ font: '400 12px var(--font-mono)', color: 'var(--text-55)' }}>{new Date(log.date).toLocaleDateString()}</div>
            </Link>
          ))}
        </Card>
      )}
      {hasMore && <LoadMoreButton onClick={loadMore} loading={loadingMore} />}
    </div>
  );
}
