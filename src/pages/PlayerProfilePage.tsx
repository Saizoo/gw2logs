import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, type PlayerProfile } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { PROFESSIONS, parseTier, professionColor, professionColorAlpha, professionForSpec, professionIconPath, specBgPath } from '../data/gw2-data';
import { bossImage } from '../data/catalog';
import { ArtImg, Card, ParseBadge, ProfDot } from '../components/atoms';
import { ProfileCharacters } from '../components/ProfileCharacters';
import { ParseTrendCard } from '../components/ParseTrendCard';

// Compact "2h" / "3d ago" for the recent-parses table.
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
import { LoadingState, ErrorState } from '../components/QueryStates';
import { toast } from '../lib/toast';

// Split a stored profile-icon name (a spec or a core profession) into the
// profession + optional elite spec the icon/background helpers expect.
function iconParts(iconName: string | null): { profession: string | null; spec: string | null } {
  if (!iconName) return { profession: null, spec: null };
  const profession = professionForSpec(iconName);
  return { profession, spec: iconName !== profession ? iconName : null };
}

// The profile's body is split into sub-tabs so the page stays short — the
// header (identity + kill record) is always visible, and the deeper detail
// lives one tab-click away.
// Internal rank titles, awarded purely on total boss kills logged. Highest
// threshold met wins; the tiers ascend so the first match from the top is it.
const KILL_TITLES: { min: number; title: string }[] = [
  { min: 5000, title: 'Mistwalker Supreme' },
  { min: 1000, title: 'Dragonbane' },
  { min: 500, title: 'Legendary Raider' },
  { min: 250, title: 'Elite Commander' },
  { min: 100, title: 'Rift Hunter' },
  { min: 50, title: 'Wingbreaker' },
  { min: 25, title: 'Mist Explorer' },
  { min: 10, title: 'Pact Raider' },
  { min: 1, title: 'Fresh Recruit' },
];
function killTitle(kills: number): string {
  return KILL_TITLES.find((t) => kills >= t.min)?.title ?? 'Fresh Recruit';
}

// Compact DPS sparkline sized to sit in a stat tile in place of the big number,
// so that tile keeps the same footprint as its neighbours.
function StatSparkline({ data }: { data: number[] }) {
  if (data.length < 2) {
    return <div style={{ font: '800 24px var(--font-sans)', letterSpacing: '-.4px', marginTop: 5, color: 'var(--text-45)' }}>—</div>;
  }
  const w = 120, h = 30, pad = 2;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const step = (w - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => [pad + i * step, pad + (1 - (v - min) / range) * (h - pad * 2)] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={30} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }} aria-hidden>
      <defs>
        <linearGradient id="statSpk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--good)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--good)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w - pad} ${h} L${pad} ${h} Z`} fill="url(#statSpk)" />
      <path d={line} fill="none" stroke="var(--good)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r={2.6} fill="var(--good)" />
    </svg>
  );
}

type ProfileTab = 'overview' | 'encounters' | 'professions' | 'characters' | 'achievements' | 'progression';
const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'encounters', label: 'Encounters' },
  { id: 'professions', label: 'Professions' },
  { id: 'characters', label: 'Characters' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'progression', label: 'Progression' },
];

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

const TAB_IDS: ProfileTab[] = ['overview', 'encounters', 'professions', 'characters', 'achievements', 'progression'];

export default function PlayerProfilePage() {
  const { name = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { data, loading, error } = useApiQuery(() => api.player(name), [name]);
  const { user: currentUser } = useCurrentUser();

  // The chosen icon can change without a re-fetch (owner picks a new one), so
  // it's held locally, seeded from the server value once the profile loads.
  const [iconOverride, setIconOverride] = useState<string | null | undefined>(undefined);
  const [picking, setPicking] = useState(false);
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState<ProfileTab>(TAB_IDS.includes(initialTab as ProfileTab) ? (initialTab as ProfileTab) : 'overview');

  // Private profiles resolve to a stub for non-owners; narrow to the full
  // profile for everything below.
  const isPrivate = !!data && data.private === true;
  const player = data && !isPrivate ? (data as PlayerProfile) : null;

  // Kills only for the DPS sparkline — a wipe's "final" DPS just means the
  // fight ended early, not a bad parse.
  const recentKills = useMemo(() => player?.recent.filter((r) => r.success) ?? [], [player]);

  if (loading) return <LoadingState label="Loading profile…" />;
  if (error) return <ErrorState message={error === 'Player not found' ? `No logs found for ${name} yet.` : error} />;
  if (isPrivate) {
    return (
      <Card style={{ padding: '48px 40px', textAlign: 'center' }}>
        <div style={{ font: '800 22px var(--font-sans)', marginBottom: 8 }}>{data?.account}</div>
        <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-60)' }}>
          🔒 This player has made their profile private.
        </div>
      </Card>
    );
  }
  if (!player) return null;

  const mainProfession = player.professionBreakdown[0]?.profession ?? null;

  // Owner can pick their own icon. Ownership is "the signed-in user's linked
  // GW2 account matches this profile" — the only account whose profile this is.
  const isOwner = !!currentUser?.gw2AccountName && currentUser.gw2AccountName === player.account;

  // Effective icon: local override (owner just picked) → server value →
  // most-played profession fallback.
  const effectiveIcon = iconOverride !== undefined ? iconOverride : player.profileIcon;
  const iconName = effectiveIcon ?? mainProfession;
  const { profession: iconProfession, spec: iconSpec } = iconParts(iconName);
  const headerBg = iconName ? specBgPath(iconProfession!, iconSpec) : null;

  async function chooseIcon(value: string | null) {
    setPicking(false);
    const prev = iconOverride;
    setIconOverride(value); // optimistic
    try {
      await api.updateProfileIcon(value);
      toast.success(value ? `Profile icon set to ${value}` : 'Profile icon reset');
    } catch {
      setIconOverride(prev);
      toast.error('Could not update your profile icon');
    }
  }

  // Derived hero bits: the class-coloured portrait ring, a spec label, the
  // player's headline guild, and a "raider" title tag graded off their score.
  const ringColor = iconProfession ? professionColor(iconProfession) : 'var(--gold)';
  const specLabel = iconSpec ?? mainProfession ?? null;
  const firstGuild = player.affiliations?.groups?.[0] ?? null;
  const tierTitle = killTitle(player.record.kills);

  const bestParse = player.bestParses.length ? Math.max(...player.bestParses.map((b) => b.pct)) : player.overallScore;
  const medianParse = median(player.recent.filter((r) => r.success && r.parsePct != null).map((r) => r.parsePct as number));
  // Last-7-kills DPS, oldest→newest, for the trend sparkline in the 4th tile.
  const trendSpark = recentKills.slice(0, 7).reverse().map((r) => r.dps);
  const profileStats: { label: string; value?: string; spark?: number[] }[] = [
    { label: 'Best parse', value: bestParse != null ? `${bestParse}` : '—' },
    { label: 'Boss kills', value: player.record.kills.toLocaleString() },
    { label: 'Median parse', value: medianParse != null ? `${medianParse}` : '—' },
    { label: 'DPS trend', spark: trendSpark },
  ];

  return (
    <div>
      {/* Profile hero — full-bleed band (matches the design): a breadcrumb and
          the portrait + identity + Follow/Share over a teal-tinted gradient
          that spans the viewport; the stat tiles overlap its bottom edge.
          The portrait doubles as the owner's icon-picker button. */}
      <div style={{ position: 'relative', width: '100vw', marginLeft: 'calc(50% - 50vw)', marginTop: -32, marginBottom: 22, overflow: 'hidden', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 7%, transparent) 0%, transparent 92%)' }}>
        {headerBg && (
          <ArtImg src={headerBg} style={{ opacity: 0.14, maskImage: 'linear-gradient(180deg, #000, transparent 88%)', WebkitMaskImage: 'linear-gradient(180deg, #000, transparent 88%)' }} />
        )}
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(1000px 420px at 82% -30%, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 60%), radial-gradient(760px 460px at 2% 130%, color-mix(in srgb, var(--color-accent-700) 26%, transparent), transparent 60%)' }} />
        <div style={{ position: 'relative', maxWidth: 1440, margin: '0 auto', padding: '26px 32px 0' }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => isOwner && setPicking(true)}
            title={isOwner ? 'Change your profile icon' : undefined}
            style={{
              width: 104,
              height: 104,
              borderRadius: '50%',
              padding: 3,
              flex: 'none',
              background: `conic-gradient(from 140deg, ${ringColor}, color-mix(in srgb, ${ringColor} 35%, var(--color-surface)), ${ringColor})`,
              border: 'none',
              cursor: isOwner ? 'pointer' : 'default',
              position: 'relative',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle at 36% 30%, var(--color-neutral-800), var(--color-surface))', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {iconName ? (
                <img src={professionIconPath(iconProfession!, iconSpec)} alt={iconName} style={{ width: 58, height: 58, objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
              ) : (
                <span style={{ font: '800 34px var(--font-sans)', color: 'var(--gold)' }}>{player.account.charAt(0)}</span>
              )}
            </div>
            {isOwner && (
              <span aria-hidden style={{ position: 'absolute', right: 2, top: 2, width: 24, height: 24, borderRadius: '50%', background: 'var(--gold)', color: 'var(--gold-fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 12px var(--font-sans)', border: '2px solid var(--bg-card)' }}>
                ✎
              </span>
            )}
            <span style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--color-surface)', border: '1.5px solid var(--gold)', color: 'var(--gold)', font: '800 12px var(--font-sans)', padding: '2px 8px', borderRadius: 999, boxShadow: 'var(--shadow-md)' }}>80</span>
          </button>

          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 9, font: '700 11.5px var(--font-sans)', color: 'var(--gold)', padding: '3px 10px', border: '1px solid color-mix(in srgb, var(--color-accent) 45%, transparent)', borderRadius: 999, background: 'var(--gold-dim)' }}>
              <span aria-hidden>★</span> {tierTitle}
            </span>
            <div style={{ font: '800 30px var(--font-sans)', letterSpacing: '-.6px', lineHeight: 1.05 }}>{player.account}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 11, font: '500 13px var(--font-sans)', color: 'var(--text-60)' }}>
              {specLabel && <span style={{ color: ringColor, fontWeight: 700 }}>{specLabel}</span>}
              <span><b style={{ color: 'var(--text-80)' }}>{player.totalLogs.toLocaleString()}</b> logs</span>
              {firstGuild && <span>Guild <b style={{ color: 'var(--text-80)' }}>{firstGuild.name}</b></span>}
            </div>
            {player.affiliations && player.affiliations.groups.length > 0 && (
              <GroupChips groups={player.affiliations.groups} />
            )}
          </div>
          <ShareButton />
          </div>
          {/* Stat tiles bleed past the band's bottom edge; the band's
              overflow:hidden clips them at the separator so the cards are cut
              off there (the design), rather than floating whole below it. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 13, marginTop: 24, marginBottom: -24 }}>
            {profileStats.map((s, i) => (
              <Card key={s.label} style={{ padding: '15px 17px 26px' }}>
                <div style={{ font: '700 11px var(--font-sans)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-55)' }}>{s.label}</div>
                {s.spark ? (
                  <div style={{ marginTop: 6 }}><StatSparkline data={s.spark} /></div>
                ) : (
                  <div style={{ font: '800 24px var(--font-sans)', letterSpacing: '-.4px', marginTop: 5, color: i === 0 ? 'var(--gold)' : 'var(--text)' }}>{s.value}</div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>

      {picking && (
        <IconPickerModal current={effectiveIcon ?? null} onPick={chooseIcon} onClose={() => setPicking(false)} />
      )}

      {/* Sub-tab bar — the design's full profile tab set. */}
      <div className="u-scroll-x" style={{ display: 'flex', alignItems: 'center', gap: 22, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {PROFILE_TABS.map((t) => {
          const active = tab === t.id;
          const count =
            t.id === 'encounters' ? player.coverage.reduce((s, w) => s + w.total, 0)
            : t.id === 'professions' ? player.specBreakdown.length
            : t.id === 'characters' ? player.characters.length
            : null;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '12px 2px',
                marginBottom: -1,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                font: '700 13.5px var(--font-sans)',
                borderBottom: `2px solid ${active ? 'var(--gold)' : 'transparent'}`,
                color: active ? 'var(--gold)' : 'var(--text-55)',
                transition: 'color .15s ease, border-color .15s ease',
              }}
            >
              {t.label}
              {count != null && count > 0 && (
                <span style={{ font: '700 11px var(--font-sans)', padding: '1px 7px', borderRadius: 999, background: 'var(--gold-dim)', color: 'var(--gold)' }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            <ProfileRecentParses recent={player.recent} />
            {player.specPerformance.length > 0 && <ProfessionBreakdownChart rows={player.specPerformance} onViewAll={() => setTab('professions')} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            <ClearProgressRings coverage={player.coverage} />
            <ParseTrendCard history={player.parseHistory} />
          </div>
        </div>
      )}

      {tab === 'professions' && (
        <>
          <div style={{ marginBottom: 18 }}>
            <div style={{ font: '800 20px var(--font-sans)', letterSpacing: '-.4px' }}>Professions</div>
            <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-55)', marginTop: 4 }}>
              Every profession {player.account} has parsed on, ranked by average percentile.
            </div>
          </div>
          {player.specPerformance.length === 0 ? (
            <PlaceholderPanel title="No parses yet" body="Upload a kill log to start ranking the professions this character has played." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 16 }}>
              {player.specPerformance.map((s) => (
                <SpecCard key={s.spec} s={s} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'encounters' && <CoverageTab coverage={player.coverage} />}

      {tab === 'achievements' && (
        <PlaceholderPanel
          title="Achievements aren't tracked yet"
          body="Guild Wars 2 combat logs don't carry achievement data. This section lights up once account achievements are wired in through the game API."
        />
      )}

      {tab === 'characters' && (
        <ProfileCharacters account={player.account} isOwner={isOwner} publicCharacters={player.characters} />
      )}

      {tab === 'progression' && <ProgressionTab coverage={player.coverage} />}
    </div>
  );
}

// --- Share action (profile hero, right side) ------------------------------

function ShareButton() {
  return (
    <div style={{ display: 'flex', gap: 9, marginLeft: 'auto', alignSelf: 'flex-start' }}>
      <button
        type="button"
        className="u-btn-ghost"
        onClick={() => { navigator.clipboard?.writeText(window.location.href).then(() => toast.success('Profile link copied'), () => toast.error('Could not copy link')); }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 15px', borderRadius: 'var(--radius-md)', font: '650 13.5px var(--font-sans)', border: '1px solid var(--border-soft)', color: 'var(--text-80)', background: 'none' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4m4-4v13" /></svg>
        Share
      </button>
    </div>
  );
}

// --- Recent parses table (Overview headline, matches the design) ----------

const RECENT_PARSES_COLLAPSED = 6;

function ProfileRecentParses({ recent }: { recent: PlayerProfile['recent'] }) {
  const [filter, setFilter] = useState<'all' | 'normal' | 'cm'>('all');
  const [expanded, setExpanded] = useState(false);
  const filtered = recent.filter((r) => (filter === 'all' ? true : filter === 'cm' ? r.isCm : !r.isCm));
  const rows = expanded ? filtered : filtered.slice(0, RECENT_PARSES_COLLAPSED);
  const canExpand = filtered.length > RECENT_PARSES_COLLAPSED;
  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '15px 17px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ font: '750 15px var(--font-sans)', display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ color: 'var(--gold)', display: 'grid', placeItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 14l3-3 3 2 4-5" /></svg>
          </span>
          Recent parses
        </div>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg-chip)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
          {(['all', 'normal', 'cm'] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} style={{ padding: '5px 12px', borderRadius: 6, font: '650 12px var(--font-sans)', textTransform: f === 'cm' ? 'uppercase' : 'capitalize', background: filter === f ? 'var(--gold-dim)' : 'transparent', color: filter === f ? 'var(--gold)' : 'var(--text-60)' }}>{f}</button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <div style={{ padding: 20, font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>No parses in this filter.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 500, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Encounter', 'Profession', 'DPS', 'Parse', 'When'].map((h, i) => (
                  <th key={h} style={{ textAlign: i >= 2 ? 'right' : 'left', font: '700 10.5px var(--font-sans)', letterSpacing: '.11em', textTransform: 'uppercase', color: 'var(--text-50)', padding: '11px 17px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const prof = professionForSpec(r.spec);
                const img = bossImage(r.boss);
                return (
                  <tr key={r.logId} className="u-row" style={{ borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--border-faint)' }}>
                    <td style={{ padding: '10px 17px' }}>
                      <Link to={`/logs/${r.logId}`} style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                        <span style={{ position: 'relative', width: 32, height: 32, borderRadius: 7, overflow: 'hidden', flex: 'none', background: 'var(--color-neutral-800)', border: '1px solid var(--border)' }}>{img && <ArtImg src={img} />}</span>
                        <span style={{ font: '650 13px var(--font-sans)', whiteSpace: 'nowrap' }}>{r.boss}{r.isCm ? ' CM' : ''}</span>
                      </Link>
                    </td>
                    <td style={{ padding: '10px 17px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, font: '500 12.5px var(--font-sans)', color: 'var(--text-70)' }}>
                        <ProfDot color={professionColor(prof)} size={9} />{r.spec}
                      </span>
                    </td>
                    <td style={{ padding: '10px 17px', textAlign: 'right', font: '700 13px var(--font-mono)' }}>{r.dps.toLocaleString()}</td>
                    <td style={{ padding: '10px 17px', textAlign: 'right' }}>
                      {r.success && r.parsePct != null ? <ParseBadge pct={r.parsePct} /> : <span style={{ font: '700 10px var(--font-sans)', color: 'var(--bad)' }}>WIPE</span>}
                    </td>
                    <td style={{ padding: '10px 17px', textAlign: 'right', font: '500 12.5px var(--font-sans)', color: 'var(--text-55)', whiteSpace: 'nowrap' }}>{timeAgo(r.uploadedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="u-row"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '12px 17px', borderTop: '1px solid var(--border)', background: 'none', cursor: 'pointer', font: '650 12.5px var(--font-sans)', color: 'var(--gold)' }}
        >
          {expanded ? 'View less' : `View more (${filtered.length - RECENT_PARSES_COLLAPSED})`}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }}><path d="M6 9l6 6 6-6" /></svg>
        </button>
      )}
    </Card>
  );
}

// Profession breakdown (Overview) — one horizontal bar per spec, ranked by how
// many fights it was played, with the spec's average parse called out in its
// parse-tier colour. Bar length is share of the most-played spec.
function ProfessionBreakdownChart({ rows, onViewAll }: { rows: PlayerProfile['specPerformance']; onViewAll: () => void }) {
  const top = [...rows].sort((a, b) => b.plays - a.plays).slice(0, 6);
  if (top.length === 0) return null;
  const maxPlays = Math.max(...top.map((r) => r.plays), 1);
  return (
    <Card style={{ padding: '15px 17px 6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ font: '750 15px var(--font-sans)', display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ color: 'var(--gold)', display: 'grid', placeItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
          </span>
          Profession breakdown
        </div>
        <button
          type="button"
          onClick={onViewAll}
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: '650 12.5px var(--font-sans)', color: 'var(--gold)' }}
        >
          All professions →
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {top.map((r) => {
          const color = professionColor(r.profession);
          const avgColor = parseTier(r.avgPct).color;
          return (
            <div key={r.spec}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <ProfDot color={color} size={8} />
                  <span style={{ font: '600 13px var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.spec}</span>
                </span>
                <span style={{ font: '500 12px var(--font-sans)', color: 'var(--text-55)', flex: 'none' }}>
                  {r.plays.toLocaleString()} fights · <b style={{ font: '700 12px var(--font-mono)', color: avgColor }}>{r.avgPct}</b> avg
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'var(--bg-chip)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.max((r.plays / maxPlays) * 100, 4)}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${professionColorAlpha(r.profession, 78)}, ${color})` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// Buckets coverage wings into Raids / Strikes / Fractals for the clear-progress
// rings (best-effort by wing name; strays land in Strikes, never lost).
const FRACTAL_WINGS = new Set(['Nightmare', 'Shattered Observatory', 'Sunqua Peak', 'Silent Surf', 'Lonely Tower']);
function coverageBuckets(coverage: PlayerProfile['coverage']) {
  const b = { Raids: { k: 0, t: 0 }, Strikes: { k: 0, t: 0 }, Fractals: { k: 0, t: 0 } };
  for (const w of coverage) {
    const cat = /wing|glade/i.test(w.wing) ? 'Raids' : FRACTAL_WINGS.has(w.wing) ? 'Fractals' : 'Strikes';
    b[cat].k += w.killed;
    b[cat].t += w.total;
  }
  return b;
}

function Ring({ pct, color, label, sub }: { pct: number; color: string; label: string; sub: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ width: 96, height: 96, margin: '0 auto 10px', borderRadius: '50%', background: `conic-gradient(${color} ${pct}%, var(--color-neutral-300) 0)`, display: 'grid', placeItems: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: 'var(--color-surface)', border: '1px solid var(--border)' }} />
        <b style={{ position: 'relative', font: '800 20px var(--font-sans)' }}>{pct}<small style={{ font: '600 11px var(--font-sans)', color: 'var(--text-55)' }}>%</small></b>
      </div>
      <div style={{ font: '650 12.5px var(--font-sans)' }}>{label}</div>
      <div style={{ font: '500 11.5px var(--font-sans)', color: 'var(--text-55)' }}>{sub}</div>
    </div>
  );
}

function ClearProgressRings({ coverage }: { coverage: PlayerProfile['coverage'] }) {
  const b = coverageBuckets(coverage);
  const pct = (k: number, t: number) => (t ? Math.round((k / t) * 100) : 0);
  const cards: { label: string; color: string; k: number; t: number }[] = [
    { label: 'Raids', color: 'var(--parse-99)', k: b.Raids.k, t: b.Raids.t },
    { label: 'Strikes', color: 'var(--gold)', k: b.Strikes.k, t: b.Strikes.t },
    { label: 'Fractals', color: 'var(--blue)', k: b.Fractals.k, t: b.Fractals.t },
  ].filter((c) => c.t > 0);
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '15px 17px', borderBottom: '1px solid var(--border)', font: '750 15px var(--font-sans)' }}>
        <span style={{ color: 'var(--gold)', display: 'grid', placeItems: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        </span>
        Clear progress
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: 18 }}>
        {cards.map((c) => (
          <Ring key={c.label} pct={pct(c.k, c.t)} color={c.color} label={c.label} sub={`${c.k} / ${c.t} cleared`} />
        ))}
      </div>
    </Card>
  );
}

// Encounters tab: coverage grid, wing sections with per-boss killed/parse tiles.
function CoverageTab({ coverage }: { coverage: PlayerProfile['coverage'] }) {
  if (coverage.length === 0) return <PlaceholderPanel title="No encounters yet" body="Connect dps.report to import your logs and start tracking encounter coverage." />;
  return (
    <div>
      {coverage.map((w) => (
        <section key={w.wing} style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <h2 style={{ font: '700 12px var(--font-sans)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-60)', whiteSpace: 'nowrap' }}>{w.wing}</h2>
            <div style={{ flex: 1, height: 1, background: 'var(--border-faint)' }} />
            <span style={{ font: '650 12px var(--font-sans)', color: w.killed === w.total ? 'var(--good)' : 'var(--text-55)' }}>{w.killed} / {w.total} cleared</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
            {w.encounters.map((e) => {
              const img = bossImage(e.boss);
              return (
                <div key={e.boss} style={{ position: 'relative', height: 84, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--color-neutral-800)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 11, opacity: e.attempted ? 1 : 0.5 }}>
                  {img && <ArtImg src={img} style={{ opacity: e.killed ? 1 : 0.5, filter: e.killed ? 'none' : 'grayscale(0.6)' }} />}
                  <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,.86) 8%, rgba(0,0,0,.3) 50%, transparent 80%)' }} />
                  <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                    {e.killed ? (
                      e.bestPct != null && <ParseBadge pct={e.bestPct} />
                    ) : (
                      <span style={{ font: '700 9px var(--font-sans)', letterSpacing: '.4px', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 999, background: 'rgba(0,0,0,.5)', color: e.attempted ? 'var(--bad)' : 'var(--text-45)', border: '1px solid rgba(255,255,255,.2)' }}>{e.attempted ? 'Wiped' : 'Locked'}</span>
                    )}
                  </div>
                  <div style={{ position: 'relative', font: '700 13px var(--font-sans)', color: 'var(--on-art)', textShadow: '0 1px 3px rgba(0,0,0,.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.boss}</div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

// Honest empty-state panel for data GW2 combat logs don't carry (gear,
// achievements) — matches the design's card, says why it's blank.
function PlaceholderPanel({ title, body }: { title: string; body: string }) {
  return (
    <Card style={{ padding: '44px 32px', textAlign: 'center' }}>
      <div style={{ width: 46, height: 46, margin: '0 auto 14px', borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--gold-dim)', color: 'var(--gold)' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" /></svg>
      </div>
      <div style={{ font: '800 17px var(--font-sans)', marginBottom: 6 }}>{title}</div>
      <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-60)', maxWidth: 420, margin: '0 auto', lineHeight: 1.5 }}>{body}</div>
    </Card>
  );
}

// Progression tab: the clear-progress rings large, plus a per-wing bar list.
function ProgressionTab({ coverage }: { coverage: PlayerProfile['coverage'] }) {
  if (coverage.length === 0) return <PlaceholderPanel title="No progression yet" body="Clear some encounters to build a progression record." />;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 20, alignItems: 'start' }}>
      <ClearProgressRings coverage={coverage} />
      <Card>
        <div style={{ padding: '15px 17px', borderBottom: '1px solid var(--border)', font: '750 15px var(--font-sans)' }}>Wing progress</div>
        <div style={{ padding: '16px 17px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {coverage.map((w) => {
            const pct = w.total ? Math.round((w.killed / w.total) * 100) : 0;
            return (
              <div key={w.wing}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, font: '600 12.5px var(--font-sans)' }}>
                  <span>{w.wing}</span>
                  <span style={{ color: 'var(--text-55)' }}>{w.killed}/{w.total}</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--color-neutral-300)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: pct === 100 ? 'var(--good)' : 'var(--gold-grad)' }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// --- Group affiliations (embedded, bottom-left of the summary card) -------

// --- Group affiliations (embedded, bottom-left of the summary card) -------

function GroupChips({ groups }: { groups: NonNullable<PlayerProfile['affiliations']>['groups'] }) {
  const roleLabel = (role: string) => (role === 'leader' ? 'Leader' : role === 'subleader' ? 'Subleader' : 'Member');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginTop: 16 }}>
      {groups.map((g) => (
        <Link
          key={g.id}
          to={`/groups/${g.id}`}
          className="u-chip"
          title={`${roleLabel(g.role)}${g.guildRank ? ` · ${g.guildRank}` : ''}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 11px',
            borderRadius: 'var(--radius-md)',
            font: '600 11.5px var(--font-sans)',
            background: g.isGuildGroup ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'color-mix(in srgb, var(--color-text) 7%, transparent)',
            color: 'var(--text-80)',
            border: `1px solid ${g.isGuildGroup ? 'color-mix(in srgb, var(--color-accent) 30%, transparent)' : 'var(--border)'}`,
          }}
        >
          {g.isGuildGroup && <span aria-hidden style={{ color: 'var(--gold)' }}>⚜</span>}
          {g.name}
          {g.role !== 'member' && (
            <span style={{ font: '700 8.5px var(--font-sans)', letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--gold)' }}>
              {roleLabel(g.role)}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}


// --- Profile icon picker (owner-only) -------------------------------------

function IconPickerModal({
  current,
  onPick,
  onClose,
}: {
  current: string | null;
  onPick: (value: string | null) => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose profile icon"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2500,
        background: 'color-mix(in srgb, var(--color-surface) 62%, transparent)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '6vh 16px',
        overflowY: 'auto',
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(720px, 100%)' }}>
      <Card style={{ padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ font: '800 16px var(--font-sans)' }}>Choose your profile icon</div>
          <button
            type="button"
            onClick={() => onPick(null)}
            className="u-btn-ghost"
            style={{ marginLeft: 'auto', font: '600 11.5px var(--font-sans)', color: 'var(--text-60)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '6px 11px', cursor: 'pointer' }}
          >
            Reset to default
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ font: '700 16px var(--font-sans)', color: 'var(--text-55)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(PROFESSIONS).map(([profession, info]) => (
            <div key={profession}>
              <div style={{ font: '700 10px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', color: professionColor(profession), marginBottom: 8 }}>
                {profession}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[profession, ...info.specs].map((iconName) => {
                  const spec = iconName === profession ? null : iconName;
                  const isSel = current === iconName;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => onPick(iconName)}
                      title={spec ? `${spec} · ${profession}` : `${profession} (core)`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 5,
                        width: 78,
                        padding: '9px 6px',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        background: isSel ? professionColorAlpha(profession, 18) : 'color-mix(in srgb, var(--color-text) 4%, transparent)',
                        border: `1px solid ${isSel ? professionColor(profession) : 'var(--border-faint)'}`,
                      }}
                    >
                      <img
                        src={professionIconPath(profession, spec)}
                        alt=""
                        width={30}
                        height={30}
                        style={{ objectFit: 'contain' }}
                        onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                      />
                      <span style={{ font: '600 10px var(--font-sans)', color: isSel ? 'var(--text)' : 'var(--text-62)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                        {iconName === profession ? 'Core' : spec}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
      </div>
    </div>
  );
}

// --- Per-spec performance table -------------------------------------------

// Professions tab card — one per spec: a tinted icon badge + identity, then a
// 2×2 stat grid (Fights / Avg parse / Best / Best DPS) with rule dividers,
// matching the design comp. Parse values carry their tier colour.
function fmtDpsShort(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(Math.round(n));
}

function SpecStatCell({ label, value, color, borderTop, borderLeft }: { label: string; value: React.ReactNode; color?: string; borderTop?: boolean; borderLeft?: boolean }) {
  return (
    <div style={{ padding: '13px 17px', borderTop: borderTop ? '1px solid var(--border)' : undefined, borderLeft: borderLeft ? '1px solid var(--border)' : undefined }}>
      <div style={{ font: '700 10px var(--font-sans)', letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--text-50)', marginBottom: 5 }}>{label}</div>
      <div style={{ font: '800 20px var(--font-sans)', letterSpacing: '-.3px', color: color ?? 'var(--text)' }}>{value}</div>
    </div>
  );
}

function SpecCard({ s }: { s: PlayerProfile['specPerformance'][number] }) {
  const color = professionColor(s.profession);
  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 17px' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, flex: 'none', display: 'grid', placeItems: 'center', background: professionColorAlpha(s.profession, 16), border: `1px solid ${professionColorAlpha(s.profession, 45)}` }}>
          <img
            src={professionIconPath(s.profession, s.spec !== s.profession ? s.spec : null)}
            alt=""
            width={26}
            height={26}
            style={{ objectFit: 'contain' }}
            onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
          />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ font: '750 15px var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.spec}</div>
          <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-55)' }}>
            <span style={{ color }}>{s.profession}</span> · {s.role}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--border)' }}>
        <SpecStatCell label="Fights" value={s.plays.toLocaleString()} />
        <SpecStatCell label="Avg parse" value={s.avgPct} color={parseTier(s.avgPct).color} borderLeft />
        <SpecStatCell label="Best" value={s.bestPct} color={parseTier(s.bestPct).color} borderTop />
        <SpecStatCell label="Best DPS" value={fmtDpsShort(s.bestDps)} borderTop borderLeft />
      </div>
    </Card>
  );
}

