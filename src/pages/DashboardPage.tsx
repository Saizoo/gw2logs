import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  api,
  type DashboardSummary,
  type HomeSummary,
  type OverviewEncounter,
  type OverviewWing,
} from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { professionColor } from '../data/gw2-data';
import { bossImage } from '../data/catalog';
import { ArtImg, GoldButton, ParseBadge, ProfDot } from '../components/atoms';
import { SearchBar } from '../components/SearchBar';
import { LoadingState, ErrorState } from '../components/QueryStates';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const PANEL: CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  overflow: 'hidden',
};

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function fmtDps(dps: number): string {
  return dps >= 1000 ? `${(dps / 1000).toFixed(1)}k` : String(dps);
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return 'now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

function flattenEncounters(wings: OverviewWing[]): (OverviewEncounter & { wing: string })[] {
  return wings.flatMap((w) => w.encounters.map((e) => ({ ...e, wing: w.wing })));
}

/* -------------------------------------------------------------------------- */
/* Shared building blocks                                                     */
/* -------------------------------------------------------------------------- */

function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...PANEL, ...style }}>{children}</div>;
}

function CardHead({ title, icon, action }: { title: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '15px 17px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, font: '750 15px var(--font-sans)' }}>
        {icon && <span style={{ color: 'var(--gold)', display: 'grid', placeItems: 'center' }}>{icon}</span>}
        {title}
      </div>
      {action}
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const w = 200, h = 30, max = Math.max(...data, 1);
  const step = w / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => [i * step, h - (v / max) * (h - 4) - 2] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} style={{ marginTop: 8, overflow: 'visible', display: 'block' }} aria-hidden preserveAspectRatio="none">
      <defs>
        <linearGradient id="spkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill="url(#spkFill)" />
      <path d={line} fill="none" stroke="var(--color-accent)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {last && <circle cx={last[0]} cy={last[1]} r={2.4} fill="var(--color-accent)" />}
    </svg>
  );
}

function StatTile({ label, value, sub, spark, accent }: { label: string; value: ReactNode; sub?: ReactNode; spark?: number[]; accent?: boolean }) {
  return (
    <Panel style={{ padding: '15px 17px' }}>
      <div style={{ font: '700 11px var(--font-sans)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-55)' }}>{label}</div>
      <div style={{ font: '800 26px var(--font-sans)', letterSpacing: '-.5px', marginTop: 5, color: accent ? 'var(--gold)' : 'var(--text)' }}>{value}</div>
      {spark ? <Sparkline data={spark} /> : sub ? <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-55)', marginTop: 3 }}>{sub}</div> : null}
    </Panel>
  );
}

function WelcomeBand({ title, subtitle }: { title: ReactNode; subtitle: string }) {
  // Full-bleed band: breaks out of the page's max-width container to span the
  // viewport, with a soft top-down gradient + teal glow that fades smoothly
  // and a hairline bottom separator dividing it from the stat tiles — matching
  // the design. `100vw` + the app's global overflow-x:hidden keeps it safe.
  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        marginLeft: 'calc(50% - 50vw)',
        marginTop: -32,
        marginBottom: 24,
        padding: 'clamp(22px, 3vw, 34px) 0 28px',
        borderBottom: '1px solid var(--border)',
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 5%, transparent) 0%, transparent 70%)',
        overflow: 'hidden',
      }}
    >
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(1100px 460px at 78% -45%, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 62%)' }} />
      <div style={{ position: 'relative', maxWidth: 1440, margin: '0 auto', padding: '0 32px' }}>
        <div style={{ display: 'flex', gap: 26, alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 420px', minWidth: 0 }}>
            <div style={{ font: '700 11px var(--font-sans)', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-55)' }}>
              Guild Wars 2 · combat log platform
            </div>
            <div style={{ font: '800 clamp(26px, 4vw, 34px) var(--font-sans)', letterSpacing: '-.6px', marginTop: 6, textWrap: 'balance' }}>{title}</div>
            <div style={{ font: '500 14px var(--font-sans)', color: 'var(--text-60)', marginTop: 8, maxWidth: '58ch', lineHeight: 1.5 }}>{subtitle}</div>
            <div style={{ marginTop: 18, maxWidth: 460 }}>
              <SearchBar width="100%" defaultValue="" />
            </div>
          </div>
          <div style={{ flex: '0 1 250px', minWidth: 210 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-soft)', borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'center' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                <path d="M12 16V4m0 0-4 4m4-4 4 4M5 20h14" />
              </svg>
              <div style={{ font: '700 13.5px var(--font-sans)', marginTop: 8 }}>Upload arcdps logs</div>
              <div style={{ font: '500 11.5px var(--font-sans)', color: 'var(--text-55)', marginTop: 6, lineHeight: 1.4 }}>
                Drop <b style={{ color: 'var(--text-80)' }}>.zevtc</b> files — parsed locally, never leave your server.
              </div>
              <GoldButton to="/upload" style={{ display: 'block', textAlign: 'center', marginTop: 12, padding: '10px 16px' }}>
                Choose files
              </GoldButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// A small boss-art thumbnail for feed rows.
function BossThumb({ boss, size = 34 }: { boss: string; size?: number }) {
  const img = bossImage(boss);
  return (
    <div style={{ position: 'relative', width: size, height: size, borderRadius: 8, overflow: 'hidden', flex: 'none', background: 'var(--color-neutral-800)', border: '1px solid var(--border)' }}>
      {img && <ArtImg src={img} />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The recent-parses table (the design's headline dashboard element)          */
/* -------------------------------------------------------------------------- */

function RecentParsesCard({ rows }: { rows: HomeSummary['recentParses'] }) {
  return (
    <Panel>
      <CardHead
        title="Recent parses"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 14l3-3 3 2 4-5" /></svg>}
        action={<span style={{ font: '700 10.5px var(--font-sans)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-55)' }}>Global feed · live</span>}
      />
      {rows.length === 0 ? (
        <div style={{ padding: 20, font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>No parses logged yet — this fills in as uploads come in.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Player', 'Encounter', 'Profession', 'DPS', 'Parse', 'When'].map((h, i) => (
                  <th key={h} style={{ textAlign: i >= 3 ? 'right' : 'left', font: '700 10.5px var(--font-sans)', letterSpacing: '.11em', textTransform: 'uppercase', color: 'var(--text-50)', padding: '11px 17px', borderBottom: '1px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.logId}-${i}`} className="u-row" style={{ borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--border-faint)' }}>
                  <td style={{ padding: '11px 17px', font: '650 13px var(--font-sans)', whiteSpace: 'nowrap' }}>
                    {r.account && !r.hidden ? (
                      <Link to={`/players/${encodeURIComponent(r.account)}`} onClick={(e) => e.stopPropagation()} style={{ color: 'var(--text)' }}>{r.name}</Link>
                    ) : (
                      r.name
                    )}
                  </td>
                  <td style={{ padding: '11px 17px' }}>
                    <Link to={`/logs/${r.logId}`} style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                      <BossThumb boss={r.boss} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', font: '650 13px var(--font-sans)', whiteSpace: 'nowrap' }}>{r.boss}{r.isCm ? ' CM' : ''}</span>
                        <span style={{ display: 'block', font: '500 11.5px var(--font-sans)', color: 'var(--text-55)' }}>{r.wing ?? 'Encounter'}</span>
                      </span>
                    </Link>
                  </td>
                  <td style={{ padding: '11px 17px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, font: '500 12.5px var(--font-sans)', color: 'var(--text-70)' }}>
                      <ProfDot color={professionColor(r.profession)} size={9} />
                      {r.spec}
                    </span>
                  </td>
                  <td style={{ padding: '11px 17px', textAlign: 'right', font: '700 13px var(--font-mono)' }}>{fmtDps(r.dps)}</td>
                  <td style={{ padding: '11px 17px', textAlign: 'right' }}>
                    {r.parsePct != null ? <ParseBadge pct={r.parsePct} /> : <span style={{ color: 'var(--text-45)' }}>—</span>}
                  </td>
                  <td style={{ padding: '11px 17px', textAlign: 'right', font: '500 12.5px var(--font-sans)', color: 'var(--text-55)', whiteSpace: 'nowrap' }}>{timeAgo(r.uploadedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 17px', borderTop: '1px solid var(--border)' }}>
        <span style={{ font: '500 12px var(--font-sans)', color: 'var(--text-55)' }}>Top parse from each recent upload</span>
        <Link to="/reports" style={{ font: '650 12.5px var(--font-sans)', color: 'var(--gold)' }}>All reports →</Link>
      </div>
    </Panel>
  );
}

// Weekly leaderboard snapshot — top DPS by profession from the public feed.
function WeeklyLeaderboard({ rows, ownAccount }: { rows: HomeSummary['topByProfession']; ownAccount?: string | null }) {
  return (
    <Panel style={{ marginTop: 20 }}>
      <CardHead
        title="Top DPS this week"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 21h12M9 21V9m6 12V9M4 4h16l-2 5H6z" /></svg>}
        action={<Link to="/statistics" style={{ font: '650 12.5px var(--font-sans)', color: 'var(--gold)' }}>Full leaderboard →</Link>}
      />
      {rows.length === 0 ? (
        <div style={{ padding: 20, font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>No rankings yet.</div>
      ) : (
        rows.slice(0, 5).map((r, i) => {
          const mine = ownAccount && r.account === ownAccount;
          return (
            <Link key={`${r.profession}-${i}`} to={`/logs/${r.logId}`} className="u-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 17px', borderBottom: i === Math.min(rows.length, 5) - 1 ? 'none' : '1px solid var(--border-faint)', background: mine ? 'var(--gold-dim)' : undefined }}>
              <span style={{ width: 20, textAlign: 'center', font: '800 13px var(--font-mono)', color: i === 0 ? 'var(--gold)' : 'var(--text-50)', flex: 'none' }}>{i + 1}</span>
              <ProfDot color={professionColor(r.profession)} size={9} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', font: '650 13px var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.account ?? r.name}</span>
                <span style={{ display: 'block', font: '500 11px var(--font-sans)', color: 'var(--text-55)' }}>{r.spec} · {r.boss}</span>
              </span>
              <span style={{ font: '700 13px var(--font-mono)', color: 'var(--gold)', flex: 'none' }}>{fmtDps(r.dps)}</span>
            </Link>
          );
        })
      )}
    </Panel>
  );
}

// A discovery tile: boss art poster with headline records over a bottom scrim.
function EncounterTile({ enc }: { enc: OverviewEncounter }) {
  return (
    <Link
      to={`/rankings?boss=${encodeURIComponent(enc.fightName)}`}
      className="u-card-link"
      style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', height: 116, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 12, border: '1px solid var(--border)', background: 'var(--color-neutral-800)' }}
    >
      {bossImage(enc.fightName) && <ArtImg src={bossImage(enc.fightName)!} />}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,.88) 4%, rgba(0,0,0,.3) 44%, transparent 78%)' }} />
      <div style={{ position: 'relative', font: '750 14px var(--font-sans)', color: 'var(--on-art)', textShadow: '0 1px 3px rgba(0,0,0,.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{enc.fightName}</div>
      <div style={{ position: 'relative', display: 'flex', gap: 10, marginTop: 3, font: '600 11px var(--font-sans)' }}>
        <span style={{ color: 'var(--on-art)', opacity: 0.75 }}>{enc.logCount.toLocaleString()} log{enc.logCount === 1 ? '' : 's'}</span>
        {enc.bestSquadDps > 0 && <span style={{ color: 'var(--gold)' }}>{fmtDps(enc.bestSquadDps)}</span>}
        {enc.fastestKillMs != null && <span style={{ color: 'var(--on-art)', opacity: 0.75 }}>{formatDuration(enc.fastestKillMs)}</span>}
      </div>
    </Link>
  );
}

function FeaturedEncounters() {
  const { data } = useApiQuery(() => api.encountersOverview(), []);
  const flat = data ? flattenEncounters(data).filter((e) => e.logCount > 0).sort((a, b) => b.logCount - a.logCount).slice(0, 4) : [];
  return (
    <Panel>
      <CardHead
        title="Featured encounters"
        icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 21h12M4 4h16l-2 5H6z" /></svg>}
        action={<Link to="/raids" style={{ font: '650 12.5px var(--font-sans)', color: 'var(--gold)' }}>Browse →</Link>}
      />
      {flat.length === 0 ? (
        <div style={{ padding: 20, font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>No encounters logged yet.</div>
      ) : (
        <div style={{ padding: 14, display: 'grid', gap: 12 }}>
          {flat.map((e) => (
            <EncounterTile key={`${e.fightName}-${e.wing}`} enc={e} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function JumpBackIn({ dash }: { dash: DashboardSummary }) {
  const links = [
    { label: 'My profile', to: dash.gw2AccountName ? `/players/${encodeURIComponent(dash.gw2AccountName)}` : '/account', hint: dash.gw2AccountName ? 'your parses →' : 'link account →' },
    { label: 'Upload a log', to: '/upload', hint: 'drop .zevtc →' },
    { label: 'My groups', to: '/groups', hint: 'rosters →' },
  ];
  return (
    <Panel style={{ marginTop: 20 }}>
      <CardHead title="Jump back in" icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>} />
      {links.map((l, i) => (
        <Link key={l.to} to={l.to} className="u-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 17px', font: '650 13.5px var(--font-sans)', borderBottom: i === links.length - 1 ? 'none' : '1px solid var(--border-faint)' }}>
          <span>{l.label}</span>
          <span style={{ font: '500 12px var(--font-sans)', color: 'var(--text-55)' }}>{l.hint}</span>
        </Link>
      ))}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

const COLS: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' };
const TILES: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 13, marginBottom: 22 };

export default function DashboardPage() {
  const { user, loading: userLoading } = useCurrentUser();
  if (userLoading) return <LoadingState label="Loading…" />;
  if (!user) return <LoggedOutDashboard />;
  return <SignedInDashboard />;
}

function SignedInDashboard() {
  const { data: dash, loading, error } = useApiQuery(() => api.dashboard(), []);
  const { data: home } = useApiQuery(() => api.home(), []);
  const { data: stats } = useApiQuery(() => api.stats(), []);
  const { data: overview } = useApiQuery(() => api.encountersOverview(), []);
  const encounterCount = overview ? flattenEncounters(overview).filter((e) => e.logCount > 0).length : null;

  if (loading) return <LoadingState label="Loading dashboard…" />;
  if (error) return <ErrorState message={error} />;
  if (!dash) return null;

  return (
    <div>
      <WelcomeBand
        title={<>Welcome back, <span style={{ color: 'var(--gold)' }}>{dash.displayName}</span></>}
        subtitle="Pick up where you left off, or dig into this week's leaderboards and your squad's parses."
      />
      <div style={TILES}>
        <StatTile label="Logs parsed" value={stats ? stats.totalLogs.toLocaleString() : '—'} sub="all-time" />
        <StatTile label="Players tracked" value={stats ? stats.totalPlayers.toLocaleString() : '—'} sub="across NA &amp; EU" />
        <StatTile label="Encounters" value={encounterCount ?? '—'} sub="raids · strikes · fractals" />
        <StatTile label="Logs this week" value={dash.stats.logsThisWeek.toLocaleString()} spark={dash.weeklyActivity.map((w) => w.count)} accent />
      </div>

      <div style={COLS}>
        <div>
          {home ? <RecentParsesCard rows={home.recentParses} /> : <Panel style={{ padding: 20 }}><LoadingState label="Loading parses…" /></Panel>}
          {home && <WeeklyLeaderboard rows={home.topByProfession} ownAccount={dash.gw2AccountName} />}
        </div>
        <div>
          <FeaturedEncounters />
          <JumpBackIn dash={dash} />
        </div>
      </div>
    </div>
  );
}

function LoggedOutDashboard() {
  const { data: stats } = useApiQuery(() => api.stats(), []);
  const { data: home, loading, error } = useApiQuery(() => api.home(), []);
  const { data: overview } = useApiQuery(() => api.encountersOverview(), []);
  const encounterCount = overview ? flattenEncounters(overview).filter((e) => e.logCount > 0).length : null;

  return (
    <div>
      <WelcomeBand
        title="Combat Analytics"
        subtitle="Analyze your logs, track your parses, and climb the leaderboards with your guild."
      />
      <div style={TILES}>
        <StatTile label="Logs parsed" value={stats ? stats.totalLogs.toLocaleString() : '—'} sub="all-time" />
        <StatTile label="Players tracked" value={stats ? stats.totalPlayers.toLocaleString() : '—'} sub="across NA &amp; EU" />
        <StatTile label="Encounters" value={encounterCount ?? '—'} sub="raids · strikes · fractals" accent />
      </div>

      {loading && <LoadingState label="Loading highlights…" />}
      {error && <ErrorState message={error} />}
      {home && (
        <div style={COLS}>
          <div>
            <RecentParsesCard rows={home.recentParses} />
            <WeeklyLeaderboard rows={home.topByProfession} />
          </div>
          <div>
            <FeaturedEncounters />
          </div>
        </div>
      )}
    </div>
  );
}
