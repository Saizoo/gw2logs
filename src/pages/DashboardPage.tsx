import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  api,
  type DashboardSummary,
  type LogDetailPlayer,
  type OverviewEncounter,
  type OverviewWing,
  type PlayerPrivateProfile,
  type PlayerProfile,
} from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { bossBgPath, playerRoleLabel, professionColor, professionIconPath, specBgPath } from '../data/gw2-data';
import { bossImage } from '../data/catalog';
import { ArtImg, GoldButton, ParseBadge, ProfDot, ResultPill } from '../components/atoms';
import { LoadingState, ErrorState } from '../components/QueryStates';

/* -------------------------------------------------------------------------- */
/* Design tokens lifted from the GW2 Stats Platform handoff                    */
/* -------------------------------------------------------------------------- */

const PANEL: CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid color-mix(in srgb, var(--color-text) 11%, transparent)',
  borderRadius: 0,
  boxShadow: '0 1px 0 color-mix(in srgb, var(--color-text) 8%, transparent) inset, 0 14px 34px -18px rgba(0,0,0,.55)',
};
const CARD_LABEL: CSSProperties = {
  font: '700 11px var(--font-sans)',
  color: 'var(--text-55)',
  textTransform: 'uppercase',
  letterSpacing: '.5px',
};
const SECTION_LABEL: CSSProperties = { font: '700 13px var(--font-sans)', color: 'var(--text-70)' };

// Role labels/colors for the "Logs by Role" donut — the server's role keys
// mapped to readable names; colours cycle through the palette in order.
const ROLE_LABELS: Record<string, string> = {
  dps: 'DPS',
  power: 'Power DPS',
  condi: 'Condi DPS',
  boon_dps: 'Boon DPS',
  boon_heal: 'Healer',
  heal: 'Healer',
  support: 'Support',
  tank: 'Tank',
};
const ROLE_PALETTE = ['var(--gold)', 'var(--blue)', 'var(--good)', 'var(--parse-75)', 'var(--parse-95)', 'var(--parse-25)'];

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Compact "2m ago" / "3h ago" / "5d ago" for the feed timestamps.
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function isPublicProfile(p: PlayerProfile | PlayerPrivateProfile | null): p is PlayerProfile {
  return !!p && !('private' in p && p.private === true);
}

function flattenEncounters(wings: OverviewWing[]): (OverviewEncounter & { wing: string })[] {
  return wings.flatMap((w) => w.encounters.map((e) => ({ ...e, wing: w.wing })));
}

export default function DashboardPage() {
  const { user, loading: userLoading } = useCurrentUser();

  if (userLoading) return <LoadingState label="Loading…" />;
  if (!user) return <LoggedOutDashboard />;
  return <SignedInDashboard />;
}

/* -------------------------------------------------------------------------- */
/* Shared building blocks                                                     */
/* -------------------------------------------------------------------------- */

function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...PANEL, ...style }}>{children}</div>;
}

function HeroStat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div>
      <div style={{ font: '800 22px var(--font-sans)', letterSpacing: '-.3px', color: 'var(--on-art)' }}>{value}</div>
      <div style={{ font: '500 11px var(--font-sans)', color: 'color-mix(in srgb, var(--on-art) 62%, transparent)', textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

// Bottom-aligned cinematic banner over raid art (design's hero treatment).
// ArtImg hides itself when the asset is missing, so the gradient still reads.
function Hero({ stats, bg }: { stats: ReactNode; bg?: string | null }) {
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 0,
        overflow: 'hidden',
        padding: 'clamp(32px, 5vw, 48px) clamp(22px, 4vw, 40px)',
        marginBottom: 20,
        minHeight: 300,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid color-mix(in srgb, var(--color-text) 11%, transparent)',
      }}
    >
      {bg && <ArtImg src={bg} style={{ objectPosition: 'center 28%' }} />}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(0deg, color-mix(in srgb, var(--color-neutral-900) 92%, transparent) 0%, color-mix(in srgb, var(--color-neutral-900) 55%, transparent) 55%, color-mix(in srgb, var(--color-neutral-900) 22%, transparent) 100%)',
        }}
      />
      <div style={{ position: 'relative', color: 'var(--on-art)' }}>
        <div style={{ font: '700 12px var(--font-sans)', letterSpacing: '2px', color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 6 }}>
          Guild Wars 2
        </div>
        <div style={{ font: '800 clamp(30px, 5vw, 42px) var(--font-sans)', letterSpacing: '-1px', lineHeight: 1.05, marginBottom: 10 }}>
          Combat Analytics
        </div>
        <div style={{ font: '500 14px var(--font-sans)', color: 'color-mix(in srgb, var(--on-art) 78%, transparent)', maxWidth: 460, lineHeight: 1.5, marginBottom: 22 }}>
          Analyze your logs, track your parses, and climb the leaderboards with your guild.
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 26, flexWrap: 'wrap' }}>
          <GoldButton to="/upload" style={{ padding: '11px 20px', font: '700 13px var(--font-sans)', boxShadow: '0 4px 16px color-mix(in srgb, var(--color-accent) 32%, transparent)' }}>
            Upload Log
          </GoldButton>
          <Link
            to="/raids"
            className="u-btn-ghost"
            style={{
              display: 'flex',
              alignItems: 'center',
              font: '600 13px var(--font-sans)',
              padding: '11px 20px',
              borderRadius: 0,
              background: 'color-mix(in srgb, var(--on-art) 14%, transparent)',
              backdropFilter: 'blur(6px)',
              color: 'var(--on-art)',
              border: '1px solid color-mix(in srgb, var(--on-art) 40%, transparent)',
            }}
          >
            Browse Raids
          </Link>
        </div>
        <div style={{ display: 'flex', gap: 'clamp(24px, 4vw, 36px)', flexWrap: 'wrap' }}>{stats}</div>
      </div>
    </div>
  );
}

// A discovery tile: grayscale raid art as a dark poster, headline records in
// light type over a bottom scrim so the boss name reads over any artwork.
function EncounterTile({ enc }: { enc: OverviewEncounter }) {
  const bg = bossImage(enc.fightName);
  return (
    <Link
      // Open this encounter's own page — the boss rankings ladder — defaulting
      // to CM when the encounter has a challenge-mode clear on record.
      to={`/rankings?boss=${encodeURIComponent(enc.fightName)}&cm=${enc.hasCmClear}`}
      className="u-card-link"
      style={{
        position: 'relative',
        borderRadius: 0,
        overflow: 'hidden',
        height: 132,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 12,
        border: '1px solid color-mix(in srgb, var(--color-text) 11%, transparent)',
        boxShadow: 'var(--shadow-md)',
        background: 'var(--color-neutral-800)',
      }}
    >
      {bg && <ArtImg src={bg} />}
      {/* Dark bottom scrim → light text stays legible over any grayscale art */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, color-mix(in srgb, var(--color-neutral-900) 92%, transparent) 0%, color-mix(in srgb, var(--color-neutral-900) 55%, transparent) 42%, transparent 80%)' }} />
      {enc.hasCmClear && (
        <span style={{ position: 'absolute', top: 10, right: 10, font: '800 9px var(--font-sans)', letterSpacing: '.06em', padding: '3px 7px', borderRadius: 0, color: 'var(--gold-fg)', background: 'var(--gold-grad)' }}>
          CM
        </span>
      )}
      <div style={{ position: 'relative', font: '800 14.5px var(--font-sans)', letterSpacing: '-.1px', color: 'var(--on-art)', textShadow: '0 1px 3px rgba(0,0,0,.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {enc.fightName}
      </div>
      <div style={{ position: 'relative', font: '600 10.5px var(--font-sans)', color: 'color-mix(in srgb, var(--on-art) 72%, transparent)', marginTop: 2 }}>
        {enc.logCount.toLocaleString()} log{enc.logCount === 1 ? '' : 's'}
      </div>
      <div style={{ position: 'relative', display: 'flex', gap: 10, marginTop: 4, font: '700 11px var(--font-sans)' }}>
        {enc.bestSquadDps > 0 && <span style={{ color: 'var(--gold)' }}>{enc.bestSquadDps.toLocaleString()} dps</span>}
        {enc.fastestKillMs != null && <span style={{ color: 'color-mix(in srgb, var(--on-art) 78%, transparent)', fontWeight: 600 }}>{formatDuration(enc.fastestKillMs)}</span>}
      </div>
    </Link>
  );
}

// Self-contained "Popular Encounters" band shared by both dashboard states.
function PopularEncounters() {
  const { data } = useApiQuery(() => api.encountersOverview(), []);
  if (!data) return null;
  const flat = flattenEncounters(data)
    .filter((e) => e.logCount > 0)
    .sort((a, b) => b.logCount - a.logCount)
    .slice(0, 9);
  if (flat.length === 0) return null;
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={SECTION_LABEL}>Popular Encounters</div>
        <Link to="/raids" style={{ font: '600 11.5px var(--font-sans)', color: 'var(--gold)' }}>
          View all →
        </Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
        {flat.map((e) => (
          <EncounterTile key={`${e.fightName}-${e.wing}`} enc={e} />
        ))}
      </div>
    </div>
  );
}

// Sidebar feed card (title bar + rows).
function FeedCard({ title, action, children }: { title: string; action?: { label: string; to: string }; children: ReactNode }) {
  return (
    <Panel style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '14px 18px', borderBottom: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)' }}>
        <div style={{ font: '700 12px var(--font-sans)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{title}</div>
        {action && (
          <Link to={action.to} style={{ font: '600 11px var(--font-sans)', color: 'var(--gold)' }}>
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Logged-out landing                                                         */
/* -------------------------------------------------------------------------- */

function LoggedOutDashboard() {
  const { data: stats } = useApiQuery(() => api.stats(), []);
  const { data: home, loading, error } = useApiQuery(() => api.home(), []);
  const { data: overview } = useApiQuery(() => api.encountersOverview(), []);
  const encounterCount = overview ? flattenEncounters(overview).filter((e) => e.logCount > 0).length : null;

  return (
    <div>
      <Hero
        bg={bossBgPath('Harvest Temple')}
        stats={
          <>
            <HeroStat value={stats ? stats.totalLogs.toLocaleString() : '—'} label="Logs uploaded" />
            <HeroStat value={stats ? stats.totalPlayers.toLocaleString() : '—'} label="Players tracked" />
            <HeroStat value={encounterCount ?? '—'} label="Encounters" />
          </>
        }
      />

      {loading && <LoadingState label="Loading highlights…" />}
      {error && <ErrorState message={error} />}
      {home && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 20, alignItems: 'start', marginBottom: 28 }}>
            <FeedCard title="Top DPS by profession" action={{ label: 'Rankings', to: '/statistics' }}>
              {home.topByProfession.length === 0 ? (
                <div style={{ padding: 20, font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>No logs uploaded yet — this fills in as parses come in.</div>
              ) : (
                home.topByProfession.map((row, i) => (
                  <Link
                    key={row.profession}
                    to={`/logs/${row.logId}`}
                    className="u-row"
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i === home.topByProfession.length - 1 ? 'none' : '1px solid var(--border-faint)' }}
                  >
                    <div style={{ font: '800 12px var(--font-mono)', color: 'var(--text-45)', width: 18, textAlign: 'right', flex: 'none' }}>{i + 1}</div>
                    <ProfDot color={professionColor(row.profession)} size={9} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: '600 13px var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.account ?? row.name}</div>
                      <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>{row.spec} · {row.boss}</div>
                    </div>
                    <div style={{ font: '700 14px var(--font-mono)', color: 'var(--gold)', flex: 'none' }}>{row.dps.toLocaleString()}</div>
                  </Link>
                ))
              )}
            </FeedCard>

            <FeedCard title="Recent Uploads" action={{ label: 'All logs', to: '/reports' }}>
              {home.recentLogs.length === 0 ? (
                <div style={{ padding: 20, font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>Nothing uploaded yet.</div>
              ) : (
                home.recentLogs.map((log, i) => {
                  const bg = bossBgPath(log.boss);
                  return (
                    <Link
                      key={log.id}
                      to={`/logs/${log.id}`}
                      className="u-row"
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: i === home.recentLogs.length - 1 ? 'none' : '1px solid var(--border-faint)' }}
                    >
                      <div style={{ position: 'relative', width: 38, height: 38, borderRadius: 0, overflow: 'hidden', flex: 'none', background: 'linear-gradient(135deg, var(--color-neutral-300), var(--color-neutral-200))' }}>
                        {bg && <ArtImg src={bg} style={{ opacity: 0.75 }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ font: '600 12.5px var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.boss}{log.isCm ? ' CM' : ''}</div>
                        <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--text-55)' }}>{log.playerCount} players · {timeAgo(log.uploadedAt)}</div>
                      </div>
                      <ResultPill success={log.success} />
                    </Link>
                  );
                })
              )}
            </FeedCard>
          </div>
          <PopularEncounters />
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Signed-in dashboard (the GW2 Stats Platform design)                        */
/* -------------------------------------------------------------------------- */

function SignedInDashboard() {
  const { data: dash, loading, error } = useApiQuery(() => api.dashboard(), []);

  if (loading) return <LoadingState label="Loading dashboard…" />;
  if (error) return <ErrorState message={error} />;
  if (!dash) return null;

  const firstLogId = dash.recentLogs[0]?.logId ?? null;

  return (
    <div>
      <Hero
        bg={bossBgPath('Harvest Temple')}
        stats={
          <>
            <HeroStat value={dash.stats.logsThisWeek.toLocaleString()} label="Logs This Week" />
            <HeroStat value={dash.stats.avgSquadDps.toLocaleString()} label="Avg Squad DPS" />
            <HeroStat value={`${dash.stats.clearsThisWeek}/${dash.stats.totalThisWeek}`} label="Clears" />
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
        <div>
          <div style={{ ...SECTION_LABEL, marginBottom: 12 }}>My Dashboard</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 24 }}>
            <MyDashboardCards dash={dash} />
          </div>

          <PopularEncounters />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <RecentUploadsCard logs={dash.recentLogs} />
          <ActivityAndLeaderboard ownAccount={dash.gw2AccountName} />
        </div>
      </div>

      {firstLogId && <MySquad logId={firstLogId} />}
    </div>
  );
}

// The four "My Dashboard" cards. My Character / Best Encounter / Logs by Role
// need the viewer's public profile, so this fetches it once (only when a GW2
// account is linked) and shares it across the three cards.
function MyDashboardCards({ dash }: { dash: DashboardSummary }) {
  const account = dash.gw2AccountName;
  const { data: profileRaw } = useApiQuery<PlayerProfile | PlayerPrivateProfile | null>(
    () => (account ? api.player(account) : Promise.resolve(null)),
    [account],
  );
  const profile = isPublicProfile(profileRaw) ? profileRaw : null;

  return (
    <>
      <MyCharacterCard profile={profile} displayName={dash.displayName} linked={!!account} />
      <BestEncounterCard profile={profile} />
      <PerformanceTrendCard weeklyActivity={dash.weeklyActivity} logsThisWeek={dash.stats.logsThisWeek} avgDps={dash.stats.avgSquadDps} />
      <LogsByRoleCard profile={profile} recentLogs={dash.recentLogs} />
    </>
  );
}

function MyCharacterCard({ profile, displayName, linked }: { profile: PlayerProfile | null; displayName: string; linked: boolean }) {
  const main = profile?.professionBreakdown?.slice().sort((a, b) => b.pct - a.pct)[0]?.profession ?? profile?.profileIcon ?? null;
  const color = main ? professionColor(main) : 'var(--gold)';
  const bestParse = profile?.overallScore ?? (profile?.bestParses?.length ? Math.max(...profile.bestParses.map((b) => b.pct)) : null);

  return (
    <Panel style={{ padding: 18 }}>
      <div style={{ ...CARD_LABEL, marginBottom: 12 }}>My Character</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 0, padding: 2, background: `linear-gradient(135deg, ${color}, var(--color-surface))`, flex: 'none' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: 0, background: 'color-mix(in srgb, var(--color-surface) 90%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {main ? (
              <img src={professionIconPath(main)} alt="" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            ) : (
              <span style={{ font: '800 16px var(--font-sans)', color: 'var(--gold)' }}>{displayName.charAt(0)}</span>
            )}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ font: '700 14px var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
          <div style={{ font: '600 11.5px var(--font-sans)', color }}>{main ?? (linked ? 'No logs yet' : 'Account not linked')}</div>
        </div>
      </div>
      {bestParse != null ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{ font: '800 24px var(--font-sans)', color: 'var(--gold)' }}>{bestParse.toFixed(1)}</div>
            <div style={{ font: '600 11.5px var(--font-sans)', color: 'var(--text-60)' }}>best parse</div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, font: '400 11px var(--font-sans)', color: 'var(--text-58)' }}>
            <div>Logs <span style={{ color: 'var(--text-85)', fontWeight: 700 }}>{profile?.totalLogs ?? 0}</span></div>
            {profile?.record && <div>Kills <span style={{ color: 'var(--text-85)', fontWeight: 700 }}>{profile.record.kills}</span></div>}
          </div>
        </>
      ) : (
        <Link to="/account" style={{ font: '700 12px var(--font-sans)', color: 'var(--gold)' }}>
          {linked ? 'Upload a log →' : 'Link your GW2 account →'}
        </Link>
      )}
    </Panel>
  );
}

function BestEncounterCard({ profile }: { profile: PlayerProfile | null }) {
  const best = profile?.bestParses?.slice().sort((a, b) => b.pct - a.pct)[0] ?? null;
  const bg = best ? bossBgPath(best.boss) : null;
  return (
    <Panel style={{ overflow: 'hidden' }}>
      <div style={{ ...CARD_LABEL, padding: '18px 18px 0' }}>Best Encounter</div>
      <div style={{ position: 'relative', height: 64, margin: '10px 0', background: 'linear-gradient(135deg, var(--color-neutral-300), var(--color-surface))' }}>
        {bg && <ArtImg src={bg} />}
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, color-mix(in srgb, var(--color-surface) 95%, transparent), color-mix(in srgb, var(--color-surface) 20%, transparent))' }} />
      </div>
      <div style={{ padding: '0 18px 18px' }}>
        {best ? (
          <Link to={`/logs/${best.logId}`}>
            <div style={{ font: '700 14px var(--font-sans)', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {best.boss}{best.isCm ? ' CM' : ''}
            </div>
            <div style={{ font: '800 22px var(--font-sans)', color: 'var(--gold)' }}>{best.pct.toFixed(1)}</div>
            <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-58)', marginTop: 4 }}>{best.spec} · {best.dps.toLocaleString()} dps</div>
          </Link>
        ) : (
          <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-55)' }}>No ranked parses yet.</div>
        )}
      </div>
    </Panel>
  );
}

function PerformanceTrendCard({ weeklyActivity, logsThisWeek, avgDps }: { weeklyActivity: { label: string; count: number }[]; logsThisWeek: number; avgDps: number }) {
  const w = 260;
  const h = 70;
  const pad = 4;
  const counts = weeklyActivity.map((p) => p.count);
  const max = Math.max(...counts, 1);
  const n = counts.length;
  const step = w / Math.max(n - 1, 1);
  const pts = counts.map((c, i) => [i * step, h - pad - (c / max) * (h - 2 * pad)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = `${line} L${w} ${h} L0 ${h} Z`;

  return (
    <Panel style={{ padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={CARD_LABEL}>Performance Trend</div>
        <div style={{ font: '500 10.5px var(--font-sans)', color: 'var(--text-55)' }}>7 days</div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ overflow: 'visible' }} role="img" aria-label="Uploads over the last week">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#trendFill)" />
        <path d={line} fill="none" stroke="var(--color-accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ display: 'flex', gap: 16, marginTop: 8, font: '400 11px var(--font-sans)', color: 'var(--text-58)' }}>
        <div>This week <span style={{ color: 'var(--text-85)', fontWeight: 700 }}>{logsThisWeek}</span></div>
        <div>Avg DPS <span style={{ color: 'var(--text-85)', fontWeight: 700 }}>{avgDps.toLocaleString()}</span></div>
      </div>
    </Panel>
  );
}

function LogsByRoleCard({ profile, recentLogs }: { profile: PlayerProfile | null; recentLogs: { profession: string }[] }) {
  // Prefer the real per-role breakdown; fall back to a profession mix from the
  // viewer's recent logs when the profile/roles aren't available.
  let segments: { label: string; value: number; color: string }[];
  let heading: string;
  if (profile?.roleBreakdown?.length) {
    heading = 'Logs by Role';
    segments = profile.roleBreakdown.map((r, i) => ({ label: roleLabel(r.role), value: r.count, color: ROLE_PALETTE[i % ROLE_PALETTE.length] }));
  } else {
    heading = 'Your Classes';
    const counts = new Map<string, number>();
    for (const l of recentLogs) counts.set(l.profession, (counts.get(l.profession) ?? 0) + 1);
    segments = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([p, v]) => ({ label: p, value: v, color: professionColor(p) }));
  }

  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <Panel style={{ padding: 18 }}>
      <div style={{ ...CARD_LABEL, marginBottom: 12 }}>{heading}</div>
      {total === 0 ? (
        <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-55)' }}>No logs yet.</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', flex: 'none', background: conicGradient(segments, total), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '800 12px var(--font-mono)' }}>{total}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
            {segments.slice(0, 4).map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, font: '500 11px var(--font-sans)', color: 'var(--text-70)' }}>
                <div style={{ width: 7, height: 7, borderRadius: 0, background: s.color, flex: 'none' }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</span>
                <span style={{ color: 'var(--text-50)' }}>{Math.round((s.value / total) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

function conicGradient(segments: { color: string; value: number }[], total: number): string {
  let acc = 0;
  const stops = segments.map((s) => {
    const from = (acc / total) * 100;
    acc += s.value;
    const to = (acc / total) * 100;
    return `${s.color} ${from.toFixed(2)}% ${to.toFixed(2)}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

function RecentUploadsCard({ logs }: { logs: DashboardSummary['recentLogs'] }) {
  return (
    <FeedCard title="Recent Uploads" action={{ label: 'View all', to: '/reports' }}>
      {logs.length === 0 ? (
        <div style={{ padding: 18, font: '500 12.5px var(--font-sans)', color: 'var(--text-55)' }}>No logs yet — upload one to see it here.</div>
      ) : (
        logs.map((log, i) => (
          <Link
            key={log.logId}
            to={`/logs/${log.logId}`}
            className="u-row"
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: i === logs.length - 1 ? 'none' : '1px solid color-mix(in srgb, var(--color-text) 6%, transparent)' }}
          >
            <img src={professionIconPath(log.profession)} alt="" style={{ width: 26, height: 26, objectFit: 'contain', borderRadius: 0, background: 'var(--color-surface)', padding: 2, flex: 'none' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: '600 12px var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.boss}{log.isCm ? ' CM' : ''}</div>
              <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--text-55)' }}>{log.wing ?? 'Other'} · {timeAgo(log.uploadedAt)}</div>
            </div>
            <ResultPill success={log.success} />
          </Link>
        ))
      )}
    </FeedCard>
  );
}

// Live Activity + Weekly Leaderboard both come from the public /home feed
// (community-wide recent logs and top DPS), fetched once here.
function ActivityAndLeaderboard({ ownAccount }: { ownAccount: string | null }) {
  const { data: home } = useApiQuery(() => api.home(), []);
  if (!home) return null;

  return (
    <>
      <FeedCard title="Live Activity">
        {home.recentLogs.length === 0 ? (
          <div style={{ padding: 18, font: '500 12.5px var(--font-sans)', color: 'var(--text-55)' }}>Nothing happening yet.</div>
        ) : (
          home.recentLogs.slice(0, 5).map((log, i) => {
            const color = log.success ? 'var(--good)' : 'var(--bad)';
            return (
              <div key={log.id} style={{ display: 'flex', gap: 10, padding: '11px 18px', alignItems: 'flex-start', borderBottom: i === Math.min(home.recentLogs.length, 5) - 1 ? 'none' : '1px solid color-mix(in srgb, var(--color-text) 6%, transparent)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 6, flex: 'none', background: color }} />
                <div style={{ font: '400 11.5px var(--font-sans)', lineHeight: 1.45, color: 'var(--text-80)' }}>
                  <Link to={`/logs/${log.id}`} style={{ color, fontWeight: 700 }}>{log.boss}{log.isCm ? ' CM' : ''}</Link>{' '}
                  {log.success ? 'cleared' : 'attempted'} by {log.playerCount} players{' '}
                  <span style={{ color: 'var(--text-50)' }}>· {timeAgo(log.uploadedAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </FeedCard>

      <FeedCard title="Top DPS" action={{ label: 'View all', to: '/statistics' }}>
        {home.topByProfession.length === 0 ? (
          <div style={{ padding: 18, font: '500 12.5px var(--font-sans)', color: 'var(--text-55)' }}>No rankings yet.</div>
        ) : (
          home.topByProfession.slice(0, 5).map((row, i) => {
            const mine = ownAccount && row.account === ownAccount;
            const rankColor = i === 0 ? 'var(--gold)' : i < 3 ? 'var(--text-80)' : 'var(--text-50)';
            return (
              <Link
                key={row.profession}
                to={`/logs/${row.logId}`}
                className="u-row"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', borderBottom: i === Math.min(home.topByProfession.length, 5) - 1 ? 'none' : '1px solid color-mix(in srgb, var(--color-text) 6%, transparent)', background: mine ? 'color-mix(in srgb, var(--color-accent) 8%, transparent)' : undefined }}
              >
                <div style={{ width: 16, font: '800 12px var(--font-mono)', color: rankColor, flex: 'none' }}>{i + 1}</div>
                <ProfDot color={professionColor(row.profession)} size={8} />
                <div style={{ flex: 1, minWidth: 0, font: '600 12.5px var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.account ?? row.name}</div>
                <div style={{ font: '700 12.5px var(--font-mono)', color: 'var(--gold)', flex: 'none' }}>{row.dps.toLocaleString()}</div>
              </Link>
            );
          })
        )}
      </FeedCard>
    </>
  );
}

// "My Squad" — the subgroup roster from the viewer's most recent log, one
// panel per subgroup, with spec art behind each player row (design's Subgroup
// panels). Renders nothing if the log can't be loaded.
function MySquad({ logId }: { logId: string }) {
  const { data: log } = useApiQuery(() => api.log(logId), [logId]);
  if (!log || log.players.length === 0) return null;

  const bySubgroup = new Map<number, LogDetailPlayer[]>();
  for (const p of log.players) {
    const arr = bySubgroup.get(p.subgroup) ?? [];
    arr.push(p);
    bySubgroup.set(p.subgroup, arr);
  }
  const subgroups = [...bySubgroup.entries()].sort((a, b) => a[0] - b[0]);
  const maxDps = Math.max(...log.players.map((p) => p.total), 1);

  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={SECTION_LABEL}>My Squad</div>
        <Link to={`/logs/${log.id}`} style={{ font: '600 11.5px var(--font-sans)', color: 'var(--gold)' }}>
          {log.boss}{log.isCm ? ' CM' : ''} →
        </Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {subgroups.map(([sg, players]) => (
          <Panel key={sg} style={{ borderRadius: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', font: '700 11.5px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-60)', borderBottom: '1px solid color-mix(in srgb, var(--color-text) 8%, transparent)' }}>
              Subgroup {sg}
            </div>
            {players.map((p, i) => {
              const color = professionColor(p.profession);
              const specBg = specBgPath(p.profession, p.spec);
              const barWidth = `${(p.total / maxDps) * 100}%`;
              return (
                <div key={`${p.name}-${i}`} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: i === players.length - 1 ? 'none' : '1px solid color-mix(in srgb, var(--color-text) 6%, transparent)', overflow: 'hidden' }}>
                  <ArtImg src={specBg} style={{ opacity: 0.32 }} />
                  <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, color-mix(in srgb, var(--color-surface) 88%, transparent) 0%, color-mix(in srgb, var(--color-surface) 55%, transparent) 55%, color-mix(in srgb, var(--color-surface) 88%, transparent) 100%)' }} />
                  <div aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${color} 0%, transparent ${barWidth})`, opacity: 0.16 }} />
                  <img src={professionIconPath(p.profession, p.spec)} alt="" style={{ position: 'relative', width: 32, height: 32, objectFit: 'contain', borderRadius: 0, background: 'var(--color-surface)', padding: 3, flex: 'none' }} />
                  <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    <div style={{ font: '700 9.5px var(--font-sans)', letterSpacing: '.4px', textTransform: 'uppercase', color }}>{playerRoleLabel(p.squadRole, p.role)} · {p.spec || p.profession}</div>
                    <div style={{ font: '600 13px var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.account ?? p.name}</div>
                  </div>
                  <div style={{ position: 'relative', textAlign: 'right', flex: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div>
                      <div style={{ font: '700 12.5px var(--font-mono)' }}>{p.total.toLocaleString()}</div>
                      <div style={{ font: '400 9.5px var(--font-sans)', color: 'var(--text-55)' }}>dps</div>
                    </div>
                    {p.parsePct != null && <ParseBadge pct={p.parsePct} />}
                  </div>
                </div>
              );
            })}
          </Panel>
        ))}
      </div>
    </div>
  );
}
