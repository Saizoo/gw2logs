import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type LogListItem } from '../lib/api';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { Card, LoadMoreButton, PageHeader, ParseBadge, ParseLegend, ResultPill, ScopeSubNav } from '../components/atoms';
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
  // Boss deep-link from the Encounters page cards (?boss=Vale%20Guardian):
  // narrows the list to one fight, cleared with the × on its chip.
  const [searchParams, setSearchParams] = useSearchParams();
  // Scope deep-link from the Raids / Fractals catalog: one boss (?boss=) or a
  // whole wing (?wing=). Cleared with the × on its chip.
  const boss = searchParams.get('boss') ?? undefined;
  const wing = boss ? undefined : searchParams.get('wing') ?? undefined;
  const scopeLabel = boss ?? wing;
  const filters = user ? [...FILTERS, { key: 'mine' as const, label: 'Uploaded by me' }] : FILTERS;

  const { items: logs, loading, loadingMore, error, hasMore, loadMore } = usePaginatedList<LogListItem>(
    (offset) =>
      api
        .logs({
          category: filter === 'raid' ? 'raid' : filter === 'fractal' ? 'fractal' : undefined,
          killsOnly: filter === 'kills',
          mine: filter === 'mine',
          boss,
          wing,
          limit: PAGE_SIZE,
          offset,
        })
        // No total count comes back from this endpoint — a full page is the
        // only signal there might be more behind it.
        .then((items) => ({ items, hasMore: items.length === PAGE_SIZE })),
    [filter, boss, wing],
  );

  return (
    <div>
      <PageHeader
        title={scopeLabel ? `${scopeLabel} — All Reports` : 'All Reports'}
        subtitle={scopeLabel ? `Every uploaded ${scopeLabel} report, kills and wipes` : 'Every uploaded report across raids and fractal challenge modes'}
      />
      {scopeLabel && <ScopeSubNav boss={boss} wing={wing} />}

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {scopeLabel && (
          <button
            onClick={() => setSearchParams({}, { replace: true })}
            title="Clear scope filter"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 14px',
              borderRadius: 'var(--radius-md)',
              font: '700 12px var(--font-sans)',
              background: 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
              color: 'var(--gold)',
              border: '1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)',
            }}
          >
            {scopeLabel} <span aria-hidden style={{ opacity: 0.75 }}>✕</span>
          </button>
        )}
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={active ? undefined : 'u-chip'}
              style={{
                padding: '7px 14px',
                borderRadius: 'var(--radius-md)',
                font: '600 12px var(--font-sans)',
                background: active ? 'color-mix(in srgb, var(--color-accent) 18%, transparent)' : 'color-mix(in srgb, var(--color-text) 7%, transparent)',
                color: active ? 'var(--gold)' : 'var(--text-65)',
                border: `1px solid ${active ? 'color-mix(in srgb, var(--color-accent) 35%, transparent)' : 'var(--border)'}`,
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
          {/* Wide row grid scrolls inside the card on phones instead of
              crushing every column to a letter. */}
          <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 640 }}>
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
          </div>
          </div>
        </Card>
      )}
      {hasMore && <LoadMoreButton onClick={loadMore} loading={loadingMore} />}
    </div>
  );
}
