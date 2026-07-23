import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, type OverviewEncounter, type OverviewWing, type SignupStatus } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { toast } from '../lib/toast';
import { bossBgPath, professionColor, professionIconPath } from '../data/gw2-data';
import { ArtImg, Card, GoldButton, ParseBadge, ParseLegend, ProfDot, ResultPill, StatCard } from '../components/atoms';
import { LoadingState, ErrorState } from '../components/QueryStates';
import { SIGNUP_META, signupDateLabel } from './group/shared';

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function signed(n: number): string {
  return n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString();
}

// Compact "2m ago" / "3h ago" / "5d ago" for the upload/activity feeds — the
// same relative phrasing the mockup's sidebar uses.
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

export default function DashboardPage() {
  const { user, loading: userLoading } = useCurrentUser();

  if (userLoading) return <LoadingState label="Loading…" />;
  if (!user) return <LoggedOutDashboard />;
  return <SignedInDashboard />;
}

/* -------------------------------------------------------------------------- */
/* Shared building blocks                                                     */
/* -------------------------------------------------------------------------- */

// Section title with an optional right-aligned "view all" link — the header
// treatment repeated above every band in the mockup.
function SectionHeader({ title, action }: { title: ReactNode; action?: { label: string; to: string } }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
      <div style={{ font: '700 12px var(--font-sans)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-70)' }}>
        {title}
      </div>
      {action && (
        <Link to={action.to} className="u-link" style={{ font: '700 11px var(--font-sans)', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gold)' }}>
          {action.label} →
        </Link>
      )}
    </div>
  );
}

// One big number + caption in the hero's counter strip.
function HeroStat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div>
      <div style={{ font: '800 26px var(--font-mono)', color: 'var(--gold)', letterSpacing: '-.5px', lineHeight: 1 }}>{value}</div>
      <div style={{ font: '600 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: 6 }}>
        {label}
      </div>
    </div>
  );
}

// Cinematic banner shared by both dashboard states. Raid art sits behind a
// legibility gradient; ArtImg hides itself if the asset isn't shipped, so the
// gradient alone still reads.
function Hero({
  eyebrow,
  title,
  tagline,
  blurb,
  actions,
  stats,
  bg,
}: {
  eyebrow: string;
  title: ReactNode;
  tagline: ReactNode;
  blurb: ReactNode;
  actions: ReactNode;
  stats?: ReactNode;
  bg?: string | null;
}) {
  return (
    <Card style={{ position: 'relative', overflow: 'hidden', padding: 0 }}>
      {bg && <ArtImg src={bg} style={{ opacity: 0.32, objectPosition: 'center 30%' }} />}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(100deg, oklch(0.14 0.02 260 / 94%) 0%, oklch(0.15 0.02 260 / 78%) 46%, oklch(0.17 0.04 30 / 34%) 100%)',
        }}
      />
      <div style={{ position: 'relative', padding: 'clamp(30px, 5vw, 56px) clamp(24px, 4.5vw, 52px)' }}>
        <div style={{ font: '700 12px var(--font-sans)', letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--gold)' }}>
          {eyebrow}
        </div>
        <h1 style={{ font: '800 clamp(30px, 5.5vw, 54px) var(--font-sans)', letterSpacing: '-1px', lineHeight: 1.02, marginTop: 10 }}>
          {title}
        </h1>
        <div style={{ font: '700 clamp(14px, 2vw, 18px) var(--font-sans)', letterSpacing: '.02em', marginTop: 14 }}>{tagline}</div>
        <div style={{ font: '500 13.5px var(--font-sans)', color: 'var(--text-65)', marginTop: 12, maxWidth: 520, lineHeight: 1.55 }}>
          {blurb}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 26, flexWrap: 'wrap' }}>{actions}</div>
        {stats && (
          <div style={{ display: 'flex', gap: 'clamp(24px, 5vw, 52px)', marginTop: 34, flexWrap: 'wrap' }}>{stats}</div>
        )}
      </div>
    </Card>
  );
}

// A ghost/outline call-to-action to sit beside the gold primary button.
function GhostLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="u-btn-ghost"
      style={{
        padding: '9px 18px',
        borderRadius: 10,
        font: '600 12.5px var(--font-sans)',
        color: 'var(--text-85)',
        border: '1px solid var(--border)',
        background: 'oklch(1 0 0 / 3%)',
      }}
    >
      {children}
    </Link>
  );
}

// A discovery card for one encounter: boss art, name, log count, and the two
// headline records (best parse + fastest kill) exactly like the mockup's
// "Popular Encounters" tiles. Falls back to squad DPS when no ranked parse
// exists yet.
function EncounterCard({ enc }: { enc: OverviewEncounter }) {
  const bg = bossBgPath(enc.fightName);
  return (
    <Link
      to="/encounters"
      className="u-card-link"
      style={{
        display: 'block',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
      }}
    >
      <div style={{ position: 'relative', height: 92, background: 'linear-gradient(135deg, oklch(0.24 0.03 260), oklch(0.15 0.01 250))' }}>
        {bg && <ArtImg src={bg} style={{ opacity: 0.85 }} />}
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 30%, oklch(0.15 0.014 250 / 92%))' }} />
        {enc.hasCmClear && (
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              font: '800 9.5px var(--font-sans)',
              letterSpacing: '.06em',
              padding: '3px 7px',
              borderRadius: 6,
              color: 'var(--gold-fg)',
              background: 'var(--gold-grad)',
            }}
          >
            CM
          </span>
        )}
      </div>
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ font: '700 13px var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {enc.fightName}
        </div>
        <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-55)', marginTop: 2 }}>
          {enc.logCount.toLocaleString()} log{enc.logCount === 1 ? '' : 's'}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginTop: 12 }}>
          <div>
            {enc.bestParse ? (
              <ParseBadge pct={enc.bestParse.pct} />
            ) : (
              <div style={{ font: '700 13px var(--font-mono)', color: 'var(--gold)' }}>{enc.bestSquadDps.toLocaleString()}</div>
            )}
            <div style={{ font: '600 9px var(--font-sans)', color: 'var(--text-50)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>
              {enc.bestParse ? 'Best parse' : 'Squad DPS'}
            </div>
          </div>
          {enc.fastestKillMs != null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ font: '700 13px var(--font-mono)', color: 'var(--text-85)' }}>{formatDuration(enc.fastestKillMs)}</div>
              <div style={{ font: '600 9px var(--font-sans)', color: 'var(--text-50)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>
                Fastest kill
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// Self-contained "Popular Encounters" band — fetches the encounter overview,
// flattens every wing, and surfaces the most-logged fights as cards. Dropped
// into both the logged-out and signed-in dashboards.
function PopularEncounters({ limit = 6 }: { limit?: number }) {
  const { data, loading } = useApiQuery(() => api.encountersOverview(), []);
  if (loading || !data) return null;

  const flat = flattenEncounters(data)
    .filter((e) => e.logCount > 0)
    .sort((a, b) => b.logCount - a.logCount)
    .slice(0, limit);
  if (flat.length === 0) return null;

  return (
    <div style={{ marginTop: 32 }}>
      <SectionHeader title="Popular Encounters" action={{ label: 'View all encounters', to: '/encounters' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
        {flat.map((e) => (
          <EncounterCard key={`${e.fightName}-${e.wing}`} enc={e} />
        ))}
      </div>
    </div>
  );
}

function flattenEncounters(wings: OverviewWing[]): (OverviewEncounter & { wing: string })[] {
  return wings.flatMap((w) => w.encounters.map((e) => ({ ...e, wing: w.wing })));
}

// Card wrapper for the right-hand sidebar feeds (title bar + body).
function FeedCard({ title, action, children }: { title: string; action?: { label: string; to: string }; children: ReactNode }) {
  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '14px 18px', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ font: '700 11.5px var(--font-sans)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-70)' }}>{title}</div>
        {action && (
          <Link to={action.to} style={{ font: '700 10px var(--font-sans)', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--gold)' }}>
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </Card>
  );
}

// SVG area/line sparkline for the "Performance Trend" band. Non-scaling stroke
// keeps the line an even weight even though the chart stretches to fit.
function TrendChart({ points }: { points: { label: string; count: number }[] }) {
  const w = 320;
  const h = 96;
  const pad = 8;
  const max = Math.max(...points.map((p) => p.count), 1);
  const n = points.length;
  const x = (i: number) => pad + (i * (w - 2 * pad)) / Math.max(n - 1, 1);
  const y = (v: number) => h - pad - (v / max) * (h - 2 * pad - 6);
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join(' ');
  const area = `${x(0).toFixed(1)},${h - pad} ${line} ${x(n - 1).toFixed(1)},${h - pad}`;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: 'block' }} role="img" aria-label="Uploads over the last week">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.14 85 / 34%)" />
            <stop offset="100%" stopColor="oklch(0.78 0.14 85 / 0%)" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#trendFill)" />
        <polyline points={line} fill="none" stroke="var(--gold)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={p.label} cx={x(i)} cy={y(p.count)} r={2.4} fill="var(--gold)" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        {points.map((p) => (
          <div key={p.label} style={{ flex: 1, textAlign: 'center', font: '500 9.5px var(--font-sans)', color: 'var(--text-55)' }}>
            {p.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// Donut of the professions the viewer has logged recently (the honest,
// data-backed stand-in for the mockup's "Favorite Roles" ring — arcdps logs
// carry the class you played, not a curated role label).
function ClassDonut({ segments, total }: { segments: { label: string; value: number; color: string }[]; total: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
      <svg width={108} height={108} viewBox="0 0 108 108" style={{ flex: 'none' }}>
        <circle cx={54} cy={54} r={r} fill="none" stroke="oklch(1 0 0 / 6%)" strokeWidth={14} />
        {segments.map((s) => {
          const len = (s.value / total) * c;
          const el = (
            <circle
              key={s.label}
              cx={54}
              cy={54}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={14}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 54 54)"
            />
          );
          offset += len;
          return el;
        })}
        <text x={54} y={50} textAnchor="middle" style={{ font: '800 20px var(--font-mono)', fill: 'var(--text)' }}>
          {total}
        </text>
        <text x={54} y={66} textAnchor="middle" style={{ font: '600 8px var(--font-sans)', fill: 'var(--text-55)', letterSpacing: '.08em' }}>
          LOGS
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
        {segments.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ProfDot color={s.color} size={9} />
            <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-80)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {s.label}
            </div>
            <div style={{ font: '700 12px var(--font-mono)', color: 'var(--text-62)' }}>{Math.round((s.value / total) * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
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
        eyebrow="Guild Wars 2"
        title={
          <>
            Combat <span style={{ color: 'var(--gold)' }}>Analytics</span>
          </>
        }
        tagline={
          <>
            Analyze. Improve. <span style={{ color: 'var(--gold)' }}>Be legendary.</span>
          </>
        }
        blurb="Upload arcdps combat logs, get an instant breakdown, and see how you stack up against the whole community — patch over patch."
        bg={bossBgPath('Harvest Temple')}
        actions={
          <>
            <GoldButton to="/upload" style={{ padding: '11px 22px', font: '700 13px var(--font-sans)' }}>
              Upload a log
            </GoldButton>
            <GhostLink to="/leaderboards">View rankings</GhostLink>
            <GhostLink to="/login">Sign in</GhostLink>
          </>
        }
        stats={
          <>
            <HeroStat value={stats ? stats.totalLogs.toLocaleString() : '—'} label="Logs uploaded" />
            <HeroStat value={stats ? stats.totalPlayers.toLocaleString() : '—'} label="Players tracked" />
            <HeroStat value={encounterCount ?? '—'} label="Encounters" />
          </>
        }
      />

      <div style={{ marginTop: 28 }}>
        {loading && <LoadingState label="Loading highlights…" />}
        {error && <ErrorState message={error} />}
        {home && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
            <FeedCard title="Top DPS by profession" action={{ label: 'Rankings', to: '/benchmarks' }}>
              {home.topByProfession.length === 0 ? (
                <div style={{ padding: 20, font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>
                  No logs uploaded yet — this fills in as parses come in.
                </div>
              ) : (
                home.topByProfession.map((row, i) => (
                  <Link
                    key={row.profession}
                    to={`/logs/${row.logId}`}
                    className="u-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 18px',
                      borderBottom: i === home.topByProfession.length - 1 ? 'none' : '1px solid var(--border-faint)',
                    }}
                  >
                    <div style={{ font: '800 12px var(--font-mono)', color: 'var(--text-45)', width: 18, textAlign: 'right', flex: 'none' }}>{i + 1}</div>
                    <ProfDot color={professionColor(row.profession)} size={9} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: '600 13px var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.account ?? row.name}
                      </div>
                      <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>
                        {row.spec} · {row.boss}
                      </div>
                    </div>
                    <div style={{ font: '700 14px var(--font-mono)', color: 'var(--gold)', flex: 'none' }}>{row.dps.toLocaleString()}</div>
                  </Link>
                ))
              )}
            </FeedCard>

            <FeedCard title="Recent uploads" action={{ label: 'All logs', to: '/logs' }}>
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
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '11px 18px',
                        borderBottom: i === home.recentLogs.length - 1 ? 'none' : '1px solid var(--border-faint)',
                      }}
                    >
                      <div style={{ position: 'relative', width: 38, height: 38, borderRadius: 9, overflow: 'hidden', flex: 'none', background: 'linear-gradient(135deg, oklch(0.24 0.03 260), oklch(0.16 0.01 250))' }}>
                        {bg && <ArtImg src={bg} style={{ opacity: 0.75 }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ font: '600 12.5px var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.boss}
                          {log.isCm ? ' CM' : ''}
                        </div>
                        <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--text-55)' }}>
                          {log.playerCount} players · {timeAgo(log.uploadedAt)}
                        </div>
                      </div>
                      <ResultPill success={log.success} />
                    </Link>
                  );
                })
              )}
            </FeedCard>
          </div>
        )}
      </div>

      <PopularEncounters />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Signed-in personal dashboard                                               */
/* -------------------------------------------------------------------------- */

function SignedInDashboard() {
  const { data: dash, loading, error } = useApiQuery(() => api.dashboard(), []);

  if (loading) return <LoadingState label="Loading dashboard…" />;
  if (error) return <ErrorState message={error} />;
  if (!dash) return null;

  // Profession mix from the viewer's recent logs — the honest data we have for
  // the "Favorite Roles" ring (arcdps carries class, not a role label).
  const classCounts = new Map<string, number>();
  for (const log of dash.recentLogs) classCounts.set(log.profession, (classCounts.get(log.profession) ?? 0) + 1);
  const classSegments = [...classCounts.entries()]
    .map(([profession, value]) => ({ label: profession, value, color: professionColor(profession) }))
    .sort((a, b) => b.value - a.value);
  const classTotal = classSegments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div>
      <Hero
        eyebrow={`${dash.stats.logsThisWeek} log${dash.stats.logsThisWeek === 1 ? '' : 's'} this week`}
        title={
          <>
            Welcome back, <span style={{ color: 'var(--gold)' }}>{dash.displayName}</span>
          </>
        }
        tagline={<span style={{ color: 'var(--text-80)' }}>Your week at a glance.</span>}
        blurb="Everything you've logged, ranked, and cleared — plus what's coming up on your raid nights."
        bg={bossBgPath('Harvest Temple')}
        actions={
          <>
            <GoldButton to="/upload" style={{ padding: '11px 22px', font: '700 13px var(--font-sans)' }}>
              Upload new log
            </GoldButton>
            <GhostLink to="/leaderboards">View rankings</GhostLink>
          </>
        }
      />

      {!dash.gw2AccountName && (
        <Card style={{ padding: '16px 20px', marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-80)' }}>Link your Guild Wars 2 account to see personalized stats.</div>
          <Link to="/account" style={{ font: '700 12px var(--font-sans)', color: 'var(--gold)', flex: 'none' }}>
            Link account →
          </Link>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 24 }}>
        <StatCard label="Logs This Week" value={dash.stats.logsThisWeek} delta={dash.stats.logsThisWeekDelta !== 0 ? signed(dash.stats.logsThisWeekDelta) : undefined} />
        <StatCard
          label="Avg Squad DPS"
          value={dash.stats.avgSquadDps.toLocaleString()}
          delta={dash.stats.avgSquadDpsDelta !== 0 ? signed(dash.stats.avgSquadDpsDelta) : undefined}
        />
        <StatCard label="Clears" value={`${dash.stats.clearsThisWeek}/${dash.stats.totalThisWeek}`} />
      </div>

      <div style={{ margin: '20px 0 4px' }}>
        <ParseLegend />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 20, alignItems: 'start', marginTop: 16 }}>
        <FeedCard title="Recent Logs" action={{ label: 'All logs', to: '/logs' }}>
          {dash.recentLogs.length === 0 && (
            <div style={{ padding: 20, font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>No logs yet — upload one to see it here.</div>
          )}
          {dash.recentLogs.map((log, i) => (
            <Link
              key={log.logId}
              to={`/logs/${log.logId}`}
              className="u-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '13px 18px',
                borderBottom: i === dash.recentLogs.length - 1 ? 'none' : '1px solid var(--border-faint)',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  flex: 'none',
                  overflow: 'hidden',
                  background: `linear-gradient(135deg, ${professionColor(log.profession)}, oklch(0.16 0.01 250))`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {bossBgPath(log.boss) && <ArtImg src={bossBgPath(log.boss)!} style={{ opacity: 0.6 }} />}
                <img src={professionIconPath(log.profession)} alt={log.profession} style={{ position: 'relative', width: 28, height: 28, objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ font: '600 13.5px var(--font-sans)' }}>
                    {log.boss}
                    {log.isCm ? ' CM' : ''}
                  </div>
                  <ResultPill success={log.success} />
                </div>
                <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-58)', marginTop: 2 }}>
                  {log.wing ?? 'Other'} · {formatDuration(log.durationMs)} · {timeAgo(log.uploadedAt)}
                </div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div style={{ font: '700 13px var(--font-mono)', color: 'var(--gold)' }}>{log.dps.toLocaleString()}</div>
                <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--text-55)' }}>your dps</div>
              </div>
            </Link>
          ))}
        </FeedCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card style={{ padding: '18px 20px' }}>
            <div style={{ font: '700 11.5px var(--font-sans)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-70)', marginBottom: 14 }}>
              Performance Trend
            </div>
            <TrendChart points={dash.weeklyActivity} />
          </Card>

          {classTotal > 0 && (
            <Card style={{ padding: '18px 20px' }}>
              <div style={{ font: '700 11.5px var(--font-sans)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-70)', marginBottom: 16 }}>
                Your Classes
              </div>
              <ClassDonut segments={classSegments} total={classTotal} />
            </Card>
          )}

          <RaidStatusCard />
        </div>
      </div>

      <PopularEncounters />
    </div>
  );
}

// Compact per-group raid outlook: the next raid night on each group's
// calendar, whether the viewer has RSVP'd (with one-tap RSVP if not),
// and the fights the leader has planned for that night.
function RaidStatusCard() {
  const [nonce, setNonce] = useState(0);
  const { data: statuses } = useApiQuery(() => api.groupRaidStatus(), [nonce]);

  if (!statuses || statuses.length === 0) return null;

  async function rsvp(groupId: string, date: string, status: SignupStatus) {
    try {
      await api.setSignup(groupId, date, status);
      toast.success('RSVP saved');
      setNonce((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save RSVP');
    }
  }

  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-soft)', font: '700 11.5px var(--font-sans)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-70)' }}>
        Raid Nights
      </div>
      {statuses.map((s) => {
        const meta = s.myStatus ? SIGNUP_META[s.myStatus] : null;
        return (
          <div key={s.groupId} style={{ padding: '13px 18px', borderBottom: '1px solid var(--border-faint)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Link to={`/groups/${s.groupId}/week`} className="u-link" style={{ font: '700 12.5px var(--font-sans)', color: 'var(--text)' }}>
                {s.name}
              </Link>
              {meta && (
                <span style={{ font: '700 10px var(--font-sans)', letterSpacing: '.4px', textTransform: 'uppercase', color: meta.color, background: meta.bg, padding: '2px 8px', borderRadius: 10 }}>
                  {meta.label}
                </span>
              )}
            </div>
            <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-58)', marginTop: 3 }}>
              {s.nextRaidDate
                ? `${signupDateLabel(s.nextRaidDate, s.resolvedTimezone)}${s.raidStartTime ? ` · ${s.raidStartTime}${s.raidTimezone ? ` ${s.raidTimezone}` : ''}` : ''}`
                : 'No raid schedule set'}
            </div>
            {s.nextRaidDate && !s.myStatus && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{ font: '500 11px var(--font-sans)', color: 'var(--gold)' }}>You haven't RSVP'd —</span>
                {(['in', 'late', 'out'] as SignupStatus[]).map((status) => (
                  <button
                    key={status}
                    className="u-chip"
                    onClick={() => rsvp(s.groupId, s.nextRaidDate!, status)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 10,
                      font: '600 10.5px var(--font-sans)',
                      background: 'oklch(1 0 0 / 4%)',
                      color: SIGNUP_META[status].color,
                      border: '1px solid var(--border)',
                    }}
                  >
                    {SIGNUP_META[status].label}
                  </button>
                ))}
              </div>
            )}
            {s.fights.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {s.fights.slice(0, 5).map((f, i) => (
                  <span key={`${f}-${i}`} style={{ font: '500 10.5px var(--font-sans)', color: 'var(--text-70)', background: 'oklch(1 0 0 / 4%)', border: '1px solid var(--border-faint)', padding: '3px 9px', borderRadius: 10 }}>
                    {f}
                  </span>
                ))}
                {s.fights.length > 5 && <span style={{ font: '500 10.5px var(--font-sans)', color: 'var(--text-50)' }}>+{s.fights.length - 5} more</span>}
              </div>
            ) : (
              s.totalPlannedThisWeek > 0 && (
                <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-50)', marginTop: 6 }}>
                  {s.totalPlannedThisWeek} fight{s.totalPlannedThisWeek === 1 ? '' : 's'} planned later this week
                </div>
              )
            )}
          </div>
        );
      })}
    </Card>
  );
}
