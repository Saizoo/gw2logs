import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, type PlayerProfile } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { PROFESSIONS, professionColor, professionColorAlpha, professionForSpec, professionIconPath, specBgPath } from '../data/gw2-data';
import { ArtImg, Card, ParseBadge, ProfDot } from '../components/atoms';
import { LoadingState, ErrorState } from '../components/QueryStates';
import { toast } from '../lib/toast';

// Split a stored profile-icon name (a spec or a core profession) into the
// profession + optional elite spec the icon/background helpers expect.
function iconParts(iconName: string | null): { profession: string | null; spec: string | null } {
  if (!iconName) return { profession: null, spec: null };
  const profession = professionForSpec(iconName);
  return { profession, spec: iconName !== profession ? iconName : null };
}

// The 3-role classification (see server ingest.ts). SquadRoleBadge only
// labels the two boon roles; the profile wants all three named with a
// colour, so it keeps its own small map.
const ROLE_META: Record<string, { label: string; color: string }> = {
  dps: { label: 'DPS', color: 'oklch(0.65 0.19 25)' },
  boon_dps: { label: 'Boon DPS', color: 'var(--gold)' },
  boon_heal: { label: 'Healer', color: 'var(--good)' },
};

// The profile's body is split into sub-tabs so the page stays short — the
// header (identity + kill record) is always visible, and the deeper detail
// lives one tab-click away.
type ProfileTab = 'overview' | 'performance' | 'activity';
const PROFILE_TABS: { id: ProfileTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'performance', label: 'Performance' },
  { id: 'activity', label: 'Activity' },
];

type RecentKill = PlayerProfile['recent'][number];
interface TrendPoint {
  x: number;
  y: number;
  kill: RecentKill;
}

// Hover card for a single DPS-trend point: names the fight, spec and parse
// behind the dot, plus how it compares to the player's recent average.
// Positioned in the chart's viewBox coordinate space (720×150) converted to
// container percentages, and nudged to stay inside the card near the edges.
function DpsTrendTooltip({ pt, avg }: { pt: TrendPoint; avg: number | null }) {
  const { kill } = pt;
  const leftPct = Math.min(86, Math.max(14, (pt.x / 720) * 100));
  const below = pt.y < 52; // dot near the top → drop the card below it instead
  const delta = avg && avg > 0 ? Math.round(((kill.dps - avg) / avg) * 100) : null;
  const when = new Date(kill.uploadedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const profColor = professionColor(professionForSpec(kill.spec));

  return (
    <div
      style={{
        position: 'absolute',
        left: `${leftPct}%`,
        top: `${(pt.y / 150) * 100}%`,
        transform: `translate(-50%, ${below ? '14px' : 'calc(-100% - 14px)'})`,
        pointerEvents: 'none',
        zIndex: 20,
        width: 210,
        background: 'oklch(0.17 0.014 250 / 98%)',
        border: '1px solid oklch(1 0 0 / 14%)',
        borderRadius: 12,
        boxShadow: '0 18px 40px -14px rgba(0,0,0,.7)',
        padding: '11px 13px',
        animation: 'fadeIn .12s ease both',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <ProfDot color={profColor} />
        <span style={{ font: '700 12.5px var(--font-sans)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {kill.boss}
          {kill.isCm ? <span style={{ color: 'var(--gold)', fontWeight: 800 }}> CM</span> : ''}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <span style={{ font: '800 20px var(--font-sans)', color: 'oklch(0.72 0.11 155)', fontVariantNumeric: 'tabular-nums' }}>
          {kill.dps.toLocaleString()}
        </span>
        <span style={{ font: '600 10.5px var(--font-sans)', color: 'var(--text-50)' }}>DPS</span>
        {delta !== null && (
          <span style={{ marginLeft: 'auto', font: '700 11px var(--font-sans)', color: delta >= 0 ? 'var(--good)' : 'var(--bad)' }}>
            {delta >= 0 ? '+' : ''}{delta}% vs avg
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', font: '500 10.5px var(--font-sans)', color: 'var(--text-50)' }}>
        <span>{kill.spec} · {when}</span>
        <span style={{ color: 'var(--gold)', fontWeight: 700 }}>View log →</span>
      </div>
    </div>
  );
}

export default function PlayerProfilePage() {
  const { name = '' } = useParams();
  const { data, loading, error } = useApiQuery(() => api.player(name), [name]);
  const { user: currentUser } = useCurrentUser();

  // The chosen icon can change without a re-fetch (owner picks a new one), so
  // it's held locally, seeded from the server value once the profile loads.
  const [iconOverride, setIconOverride] = useState<string | null | undefined>(undefined);
  const [picking, setPicking] = useState(false);
  const [tab, setTab] = useState<ProfileTab>('overview');
  const navigate = useNavigate();

  // Private profiles resolve to a stub for non-owners; narrow to the full
  // profile for everything below.
  const isPrivate = !!data && data.private === true;
  const player = data && !isPrivate ? (data as PlayerProfile) : null;

  // Wipes don't have a meaningful "final" DPS — the fight never finished,
  // so a low number there just means it ended early, not that the parse was
  // bad. Both the trend line and its average are kills-only for that reason.
  const recentKills = useMemo(() => player?.recent.filter((r) => r.success) ?? [], [player]);

  const avgRecentDps = useMemo(() => {
    if (recentKills.length === 0) return null;
    return Math.round(recentKills.reduce((s, r) => s + r.dps, 0) / recentKills.length);
  }, [recentKills]);

  const chart = useMemo(() => {
    if (recentKills.length < 2) return null;
    // Oldest kill on the left, newest on the right.
    const ordered = [...recentKills].reverse();
    const values = ordered.map((r) => r.dps);
    const w = 720;
    const h = 150;
    const pad = 14;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
    // Each point carries its source kill so the hover tooltip can name the
    // fight, spec and parse behind that dot. x/y stay in the 720×150 viewBox;
    // the tooltip converts them to container percentages.
    const pts = values.map((v, i) => ({
      x: pad + i * step,
      y: pad + (1 - (v - min) / range) * (h - pad * 2),
      kill: ordered[i],
    }));
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)} ${h - pad} L${pts[0].x.toFixed(1)} ${h - pad} Z`;
    return { line, area, pts, w, h, step };
  }, [recentKills]);

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

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

  const profileStats = [
    { label: 'Total Logs', value: player.totalLogs },
    { label: 'Overall Score', value: player.overallScore ?? '—' },
    { label: 'Consistency', value: player.consistencyScore ?? '—' },
    { label: 'Avg DPS (recent)', value: avgRecentDps ? avgRecentDps.toLocaleString() : '—' },
  ];

  return (
    <div>
      <Card
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: 32,
          marginBottom: 22,
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          flexWrap: 'wrap',
          background:
            'radial-gradient(600px 260px at 85% 0%, oklch(0.32 0.06 155 / 25%), transparent), linear-gradient(135deg, oklch(0.2 0.018 250), oklch(0.13 0.014 250))',
        }}
      >
        {/* Chosen-spec banner art, faded into the card and masked toward the
            right so the name/stats stay legible. */}
        {headerBg && (
          <>
            <ArtImg src={headerBg} style={{ opacity: 0.22, maskImage: 'linear-gradient(90deg, transparent, #000 55%)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 55%)' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, oklch(0.15 0.014 250 / 70%), transparent 40%)', pointerEvents: 'none' }} />
          </>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 22, flex: '1 1 340px', minWidth: 0 }}>
          <button
            type="button"
            onClick={() => isOwner && setPicking(true)}
            title={isOwner ? 'Change your profile icon' : undefined}
            style={{
              width: 84,
              height: 84,
              borderRadius: 18,
              background: iconProfession
                ? `linear-gradient(135deg, ${professionColorAlpha(iconProfession, 50)}, oklch(0.16 0.02 155 / 60%))`
                : 'oklch(0.22 0.014 250)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 'none',
              border: `1px solid ${iconProfession ? professionColorAlpha(iconProfession, 45) : 'var(--border)'}`,
              padding: 0,
              cursor: isOwner ? 'pointer' : 'default',
              position: 'relative',
            }}
          >
            {iconName && <img src={professionIconPath(iconProfession!, iconSpec)} alt={iconName} style={{ width: 56, height: 56, objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />}
            {isOwner && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  right: -6,
                  bottom: -6,
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'var(--gold)',
                  color: 'oklch(0.2 0.02 260)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  font: '700 13px var(--font-sans)',
                  border: '2px solid var(--bg-card)',
                }}
              >
                ✎
              </span>
            )}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: '800 26px var(--font-sans)', letterSpacing: '-.4px' }}>{player.account}</div>
            {iconSpec ? (
              <div style={{ font: '500 12.5px var(--font-sans)', color: 'var(--text-62)', marginTop: 4 }}>{iconSpec} · {iconProfession}</div>
            ) : mainProfession ? (
              <div style={{ font: '500 12.5px var(--font-sans)', color: 'var(--text-62)', marginTop: 4 }}>{mainProfession}</div>
            ) : null}
            <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
              {profileStats.map((s) => (
                <div key={s.label}>
                  <div style={{ font: '800 18px var(--font-sans)' }}>{s.value}</div>
                  <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
            {player.affiliations && player.affiliations.groups.length > 0 && (
              <GroupChips groups={player.affiliations.groups} />
            )}
          </div>
        </div>

        {/* Kill record lives in the header, on the right of the name/stats. */}
        <div style={{ position: 'relative', flex: '0 1 auto' }}>
          <HeaderRecord record={player.record} />
        </div>
      </Card>

      {picking && (
        <IconPickerModal current={effectiveIcon ?? null} onPick={chooseIcon} onClose={() => setPicking(false)} />
      )}

      {/* Sub-tab bar — keeps the page short by paging the deeper detail. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, borderBottom: '1px solid oklch(1 0 0 / 8%)', marginBottom: 20 }}>
        {PROFILE_TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: '12px 2px',
                marginBottom: -1,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                font: '700 13.5px var(--font-sans)',
                borderBottom: `2px solid ${active ? 'oklch(0.95 0.01 90)' : 'transparent'}`,
                color: active ? 'oklch(0.95 0.01 90)' : 'var(--text-55)',
                transition: 'color .15s ease, border-color .15s ease',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <>
          <div style={{ marginBottom: 20 }}>
            <IdentityPanel specBreakdown={player.specBreakdown} roleBreakdown={player.roleBreakdown} />
          </div>

          {chart && (
            <Card style={{ padding: '20px 20px 8px' }}>
              <div style={{ font: '700 13.5px var(--font-sans)', marginBottom: 6 }}>DPS Trend — Last {recentKills.length} Kills</div>
              <div style={{ position: 'relative' }}>
                <svg viewBox="0 0 720 150" style={{ width: '100%', height: 'auto', aspectRatio: '720 / 150', overflow: 'visible', display: 'block' }} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="dpsFill2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.65 0.1 155)" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="oklch(0.65 0.1 155)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <g stroke="var(--border-soft)" strokeWidth={1} vectorEffect="non-scaling-stroke">
                    <line x1="0" y1="10" x2="720" y2="10" />
                    <line x1="0" y1="56" x2="720" y2="56" />
                    <line x1="0" y1="102" x2="720" y2="102" />
                    <line x1="0" y1="148" x2="720" y2="148" />
                  </g>
                  <path d={chart.area} fill="url(#dpsFill2)" />
                  <path d={chart.line} fill="none" stroke="oklch(0.65 0.1 155)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  {/* Guide line dropped from the hovered point. */}
                  {hoverIdx !== null && chart.pts[hoverIdx] && (
                    <line
                      x1={chart.pts[hoverIdx].x}
                      y1={chart.pts[hoverIdx].y}
                      x2={chart.pts[hoverIdx].x}
                      y2={148}
                      stroke="oklch(0.65 0.1 155 / 45%)"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {chart.pts.map((pt, i) => {
                    const on = hoverIdx === i;
                    return (
                      <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r={on ? 5 : 3.5}
                        fill={on ? 'oklch(0.65 0.1 155)' : 'var(--bg)'}
                        stroke="oklch(0.65 0.1 155)"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                        style={{ transition: 'r .1s ease' }}
                      />
                    );
                  })}
                  {/* Invisible full-height hit columns — hovering anywhere in a
                      point's column selects it, so tiny dots aren't a chore to
                      hit. Click jumps to that fight's log. */}
                  {chart.pts.map((pt, i) => {
                    const colW = chart.step || chart.w;
                    return (
                      <a key={`hit-${i}`} href={`/logs/${pt.kill.logId}`} onClick={(e) => { e.preventDefault(); navigate(`/logs/${pt.kill.logId}`); }}>
                        <rect
                          x={pt.x - colW / 2}
                          y={0}
                          width={colW}
                          height={150}
                          fill="transparent"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoverIdx(i)}
                          onMouseLeave={() => setHoverIdx((cur) => (cur === i ? null : cur))}
                        />
                      </a>
                    );
                  })}
                </svg>

                {hoverIdx !== null && chart.pts[hoverIdx] && (
                  <DpsTrendTooltip pt={chart.pts[hoverIdx]} avg={avgRecentDps} />
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'performance' && (
        <>
          {player.specPerformance.length > 0 && <SpecPerformanceTable rows={player.specPerformance} />}

          <div style={{ marginBottom: 12 }}>
            <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
              Best parses
            </div>
            {player.bestParses.length === 0 && (
              <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>No logs yet.</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {player.bestParses.map((bp) => (
                <Card key={bp.logId} className="u-card-link" style={{ padding: 14 }}>
                  <Link to={`/logs/${bp.logId}`} style={{ display: 'block' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <ProfDot color={professionColor(professionForSpec(bp.spec))} />
                      <div style={{ font: '700 13px var(--font-sans)' }}>
                        {bp.boss}
                        {bp.isCm ? ' CM' : ''}
                      </div>
                    </div>
                    <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-58)', marginBottom: 10 }}>{bp.spec}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <ParseBadge pct={bp.pct} style={{ height: 24, minWidth: 32, font: '800 13px var(--font-mono)' }} />
                      <span style={{ font: '600 13px var(--font-mono)', color: 'var(--text-65)' }}>{bp.dps.toLocaleString()} dps</span>
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'activity' && (
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', font: '700 13.5px var(--font-sans)' }}>
            Recent Activity
          </div>
          {player.recent.length === 0 && (
            <div style={{ padding: 20, font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>Nothing uploaded yet.</div>
          )}
          {player.recent.map((r, i) => (
            <Link
              key={r.logId}
              to={`/logs/${r.logId}`}
              className="u-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '11px 20px',
                borderBottom: i === player.recent.length - 1 ? 'none' : '1px solid var(--border-faint)',
              }}
            >
              <img src={professionIconPath(professionForSpec(r.spec), r.spec)} alt={r.spec} style={{ width: 26, height: 26, objectFit: 'contain', flex: 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '600 13px var(--font-sans)' }}>
                  {r.boss}
                  {r.isCm ? ' CM' : ''}
                </div>
                <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>
                  {r.spec} · {new Date(r.uploadedAt).toLocaleString()}
                </div>
              </div>
              <div style={{ font: '700 13px var(--font-mono)', color: 'var(--gold)' }}>{r.dps.toLocaleString()}</div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}

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
            borderRadius: 20,
            font: '600 11.5px var(--font-sans)',
            background: g.isGuildGroup ? 'oklch(0.78 0.14 85 / 12%)' : 'oklch(1 0 0 / 5%)',
            color: 'var(--text-80)',
            border: `1px solid ${g.isGuildGroup ? 'oklch(0.78 0.14 85 / 30%)' : 'var(--border)'}`,
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

// --- Class & role identity ------------------------------------------------

function IdentityPanel({
  specBreakdown,
  roleBreakdown,
}: {
  specBreakdown: PlayerProfile['specBreakdown'];
  roleBreakdown: PlayerProfile['roleBreakdown'];
}) {
  const topSpecs = specBreakdown.slice(0, 6);
  return (
    <Card style={{ padding: '18px 20px' }}>
      <div style={{ font: '700 13.5px var(--font-sans)', marginBottom: 14 }}>Class &amp; Role</div>

      <div style={{ font: '700 10px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-50)', marginBottom: 8 }}>
        Specializations played
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {topSpecs.map((s) => {
          const color = professionColor(s.profession);
          return (
            <div key={s.spec} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img
                src={professionIconPath(s.profession, s.spec !== s.profession ? s.spec : null)}
                alt=""
                width={20}
                height={20}
                style={{ objectFit: 'contain', flex: 'none' }}
                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                  <span style={{ font: '600 12px var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.spec}</span>
                  <span style={{ font: '600 11px var(--font-mono)', color: 'var(--text-55)', flex: 'none' }}>{s.pct}%</span>
                </div>
                {/* Share-of-play bar, coloured by profession. */}
                <div style={{ height: 6, borderRadius: 3, background: 'oklch(1 0 0 / 6%)', overflow: 'hidden' }}>
                  <div style={{ width: `${s.pct}%`, height: '100%', borderRadius: 3, background: color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ font: '700 10px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-50)', margin: '16px 0 8px' }}>
        Role split
      </div>
      {/* Single stacked bar of the three squad roles + a labelled legend. */}
      <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2, background: 'oklch(1 0 0 / 4%)' }}>
        {roleBreakdown.map((r) => (
          <div key={r.role} title={`${ROLE_META[r.role]?.label ?? r.role} · ${r.pct}%`} style={{ width: `${r.pct}%`, background: ROLE_META[r.role]?.color ?? 'var(--text-40)' }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
        {roleBreakdown.map((r) => (
          <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: ROLE_META[r.role]?.color ?? 'var(--text-40)', flex: 'none' }} />
            <span style={{ font: '600 11.5px var(--font-sans)', color: 'var(--text-75)' }}>{ROLE_META[r.role]?.label ?? r.role}</span>
            <span style={{ font: '600 11px var(--font-mono)', color: 'var(--text-50)' }}>{r.pct}%</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// --- Kill / wipe record (compact, lives in the profile header) ------------

function HeaderRecord({ record }: { record: PlayerProfile['record'] }) {
  const killPct = record.total ? (record.kills / record.total) * 100 : 0;
  return (
    <div
      style={{
        minWidth: 220,
        padding: '16px 18px',
        borderRadius: 14,
        background: 'oklch(0.12 0.012 250 / 55%)',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{ font: '700 10px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-55)', marginBottom: 8 }}>
        Kill Record
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ font: '800 30px var(--font-sans)', color: 'var(--good)' }}>{record.successRate}%</span>
        <span style={{ font: '500 11.5px var(--font-sans)', color: 'var(--text-55)' }}>success rate</span>
      </div>
      <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-58)', marginBottom: 12 }}>
        across {record.total.toLocaleString()} logged encounter{record.total === 1 ? '' : 's'}
      </div>

      {/* Kills-vs-wipes ratio bar. */}
      <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: 'var(--bad-dim)' }}>
        <div style={{ width: `${killPct}%`, background: 'var(--good)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        <div>
          <div style={{ font: '800 18px var(--font-sans)', color: 'var(--good)' }}>{record.kills.toLocaleString()}</div>
          <div style={{ font: '400 10px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Kills</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ font: '800 18px var(--font-sans)', color: 'var(--bad)' }}>{record.wipes.toLocaleString()}</div>
          <div style={{ font: '400 10px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Wipes</div>
        </div>
      </div>
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
        background: 'oklch(0.08 0.01 260 / 62%)',
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
            style={{ marginLeft: 'auto', font: '600 11.5px var(--font-sans)', color: 'var(--text-60)', background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 11px', cursor: 'pointer' }}
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
                        borderRadius: 10,
                        cursor: 'pointer',
                        background: isSel ? professionColorAlpha(profession, 18) : 'oklch(1 0 0 / 3%)',
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

function SpecPerformanceTable({ rows }: { rows: PlayerProfile['specPerformance'] }) {
  return (
    <Card style={{ marginBottom: 20, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', font: '700 13.5px var(--font-sans)' }}>
        Performance by Specialization
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 460 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.7fr 0.9fr 0.9fr', gap: 8, padding: '10px 20px', font: '700 10px var(--font-sans)', textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--text-55)', borderBottom: '1px solid var(--border-faint)' }}>
            <div>Specialization</div>
            <div style={{ textAlign: 'right' }}>Parses</div>
            <div style={{ textAlign: 'right' }}>Avg</div>
            <div style={{ textAlign: 'right' }}>Best</div>
          </div>
          {rows.map((r, i) => (
            <div key={r.spec} style={{ display: 'grid', gridTemplateColumns: '1.6fr 0.7fr 0.9fr 0.9fr', gap: 8, alignItems: 'center', padding: '10px 20px', borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--border-faint)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <img
                  src={professionIconPath(r.profession, r.spec !== r.profession ? r.spec : null)}
                  alt=""
                  width={22}
                  height={22}
                  style={{ objectFit: 'contain', flex: 'none' }}
                  onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                />
                <span style={{ font: '600 12.5px var(--font-sans)', color: professionColor(r.profession), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.spec}</span>
              </div>
              <div style={{ textAlign: 'right', font: '600 12px var(--font-mono)', color: 'var(--text-70)' }}>{r.plays}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <ParseBadge pct={r.avgPct} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Link to={`/logs/${r.bestLogId}`} title="Open best parse">
                  <ParseBadge pct={r.bestPct} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

