import { Link } from 'react-router-dom';
import { api, type LogListItem } from '../../lib/api';
import { usePaginatedList } from '../../hooks/usePaginatedList';
import { Card, LoadMoreButton, ParseBadge, ResultPill } from '../../components/atoms';
import { LoadingState, EmptyState } from '../../components/QueryStates';
import { formatLogDuration } from './shared';

const LOGS_PAGE_SIZE = 20;

// Logs tab: every log attached to this group, newest first.
export default function LogsTab({ groupId }: { groupId: string }) {
  const {
    items: groupLogs,
    loading: logsLoading,
    loadingMore: logsLoadingMore,
    hasMore: logsHasMore,
    loadMore: loadMoreLogs,
  } = usePaginatedList<LogListItem>(
    (offset) =>
      api
        .logs({ groupId, limit: LOGS_PAGE_SIZE, offset })
        .then((items) => ({ items, hasMore: items.length === LOGS_PAGE_SIZE })),
    [groupId],
  );

  return (
    <div>
      {logsLoading && <LoadingState label="Loading logs…" />}
      {!logsLoading && groupLogs?.length === 0 && (
        <EmptyState>
          No logs attached to this group yet.
        </EmptyState>
      )}
        {groupLogs && groupLogs.length > 0 && (
          <Card style={{ overflow: 'hidden' }}>
            {/* Wide row grid scrolls inside the card on phones. */}
            <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 600 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2.2fr 0.7fr 0.8fr 0.9fr 0.7fr 0.9fr',
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
              <div>Duration</div>
              <div>Result</div>
              <div>Squad DPS</div>
              <div>Parse</div>
              <div>Date</div>
            </div>
            {groupLogs.map((log, i) => (
              <Link
                key={log.id}
                to={`/logs/${log.id}`}
                className="u-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.2fr 0.7fr 0.8fr 0.9fr 0.7fr 0.9fr',
                  gap: 8,
                  alignItems: 'center',
                  padding: '12px 20px',
                  borderBottom: i === groupLogs.length - 1 ? 'none' : '1px solid var(--border-faint)',
                }}
              >
                <div style={{ font: '600 13px var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.boss}
                  {log.isCm ? ' CM' : ''}
                </div>
                <div style={{ font: '400 12px var(--font-mono)', color: 'var(--text-70)' }}>{formatLogDuration(log.durationMs)}</div>
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
        {logsHasMore && <LoadMoreButton onClick={loadMoreLogs} loading={logsLoadingMore} />}
    </div>
  );
}
