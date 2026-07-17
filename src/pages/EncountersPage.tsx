import { Link } from 'react-router-dom';
import { api, type OverviewEncounter } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { bossBgPath, professionIconPath } from '../data/gw2-data';
import { ArtImg, PageHeader, ParseBadge, SubNav } from '../components/atoms';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';

export const LOGS_SUBNAV = [
  { label: 'Encounters', to: '/encounters' },
  { label: 'All Logs', to: '/logs' },
];

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function EncountersPage() {
  const { data: wings, loading, error } = useApiQuery(() => api.encountersOverview(), []);

  return (
    <div>
      <PageHeader title="Encounters" subtitle="Recent logs grouped by raid wing and strike map" />
      <SubNav tabs={LOGS_SUBNAV} />

      {loading && <LoadingState label="Loading encounters…" />}
      {error && <ErrorState message={error} />}
      {wings && wings.length === 0 && (
        <EmptyState>No logs have been uploaded yet — encounters will appear once the first log comes in.</EmptyState>
      )}

      {wings?.map(({ wing, encounters }) => {
        const wingLogs = encounters.reduce((n, e) => n + e.logCount, 0);
        const wingKills = encounters.reduce((n, e) => n + e.kills, 0);
        return (
          <section key={wing} style={{ marginBottom: 34 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
              <h2 style={{ font: '800 17px var(--font-sans)', letterSpacing: '-.2px' }}>{wing}</h2>
              <div style={{ font: '600 11.5px var(--font-sans)', color: 'var(--text-55)' }}>
                {wingKills}/{wingLogs} kills
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 14 }}>
              {encounters.map((enc) => (
                <EncounterCard key={enc.fightName} enc={enc} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function EncounterCard({ enc }: { enc: OverviewEncounter }) {
  const bg = bossBgPath(enc.fightName);
  return (
    <div
      className="u-card-link"
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 16,
        border: '1px solid oklch(1 0 0 / 8%)',
        background: 'linear-gradient(150deg, oklch(0.2 0.02 250) 0%, oklch(0.14 0.014 250) 60%)',
        boxShadow: '0 1px 2px rgba(0,0,0,.25), 0 12px 32px -18px rgba(0,0,0,.55)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Boss art backdrop — hides itself until the asset ships */}
      {bg && <ArtImg src={bg} style={{ opacity: 0.5 }} />}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, oklch(0.13 0.014 250 / 30%) 0%, oklch(0.13 0.014 250 / 88%) 62%, oklch(0.12 0.014 250 / 97%) 100%)',
        }}
      />

      <div style={{ position: 'relative', padding: '16px 18px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* The boss name is the card's main action: every log of this fight. */}
          <Link
            to={`/logs?boss=${encodeURIComponent(enc.fightName)}`}
            title={`All ${enc.fightName} logs`}
            style={{ font: '800 16.5px var(--font-sans)', letterSpacing: '-.2px' }}
          >
            {enc.fightName}
          </Link>
          {enc.hasCm && (
            <span
              style={{
                font: '800 9.5px var(--font-sans)',
                letterSpacing: '.5px',
                padding: '2px 6px',
                borderRadius: 5,
                color: 'var(--gold)',
                background: 'oklch(0.78 0.14 85 / 15%)',
                border: '1px solid oklch(0.78 0.14 85 / 35%)',
              }}
            >
              CM
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 18, margin: '12px 0 14px' }}>
          <CardStat label="Kills" value={`${enc.kills}/${enc.logCount}`} />
          {enc.bestParse ? (
            <div>
              <div style={{ font: '700 9.5px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-50)' }}>
                Best Parse
              </div>
              <Link
                to={`/logs/${enc.bestParse.logId}`}
                title={`${enc.bestParse.account} · ${enc.bestParse.spec}${enc.bestParse.isCm ? ' · CM' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}
              >
                <img
                  src={professionIconPath(enc.bestParse.profession, enc.bestParse.spec)}
                  alt=""
                  width={16}
                  height={16}
                  style={{ objectFit: 'contain', flex: 'none' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <span style={{ font: '700 13.5px var(--font-mono)', color: 'var(--gold)' }}>{enc.bestParse.dps.toLocaleString()}</span>
              </Link>
            </div>
          ) : (
            <CardStat label="Best Parse" value="—" gold />
          )}
          <CardStat label="Fastest" value={enc.fastestKillMs != null ? formatDuration(enc.fastestKillMs) : '—'} />
        </div>

        {/* Three most recent parses: each row is the log's top performer with
            their percentile against every parse of this boss+CM. */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {enc.recent.map((log) => (
            <Link
              key={log.id}
              to={`/logs/${log.id}`}
              className="u-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 8,
                background: 'oklch(1 0 0 / 4%)',
                border: '1px solid oklch(1 0 0 / 6%)',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  flex: 'none',
                  background: log.success ? 'var(--good)' : 'var(--bad)',
                }}
              />
              <span style={{ font: '700 11px var(--font-sans)', color: log.success ? 'var(--good)' : 'var(--bad)', width: 34 }}>
                {log.success ? 'KILL' : 'WIPE'}
              </span>
              {log.isCm && <span style={{ font: '700 10px var(--font-sans)', color: 'var(--gold)' }}>CM</span>}
              {log.topParse ? (
                <>
                  <ParseBadge pct={log.topParse.pct} />
                  <img
                    src={professionIconPath(log.topParse.profession, log.topParse.spec)}
                    alt=""
                    title={`${log.topParse.account} · ${log.topParse.spec}`}
                    width={15}
                    height={15}
                    style={{ objectFit: 'contain', flex: 'none' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <span style={{ font: '700 11.5px var(--font-mono)', color: 'var(--gold)', marginLeft: 'auto' }}>
                    {log.topParse.dps.toLocaleString()}
                  </span>
                </>
              ) : (
                <span style={{ font: '600 11.5px var(--font-mono)', color: 'var(--text-70)', marginLeft: 'auto' }}>
                  {formatDuration(log.durationMs)}
                </span>
              )}
              <span style={{ font: '400 10.5px var(--font-sans)', color: 'var(--text-50)' }}>{relativeDate(log.date)}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function CardStat({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div>
      <div style={{ font: '700 9.5px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-50)' }}>
        {label}
      </div>
      <div style={{ font: `700 13.5px var(--font-mono)`, color: gold ? 'var(--gold)' : 'var(--text-88)', marginTop: 2 }}>{value}</div>
    </div>
  );
}
