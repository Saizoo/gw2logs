import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type PlayerProfile } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { professionColor, professionColorAlpha, professionForSpec, professionIconPath } from '../data/gw2-data';
import { Card, ParseBadge, ProfDot } from '../components/atoms';
import { LoadingState, ErrorState } from '../components/QueryStates';
import { GuildBadge } from './MyGroupsPage';

// The 3-role classification (see server ingest.ts). SquadRoleBadge only
// labels the two boon roles; the profile wants all three named with a
// colour, so it keeps its own small map.
const ROLE_META: Record<string, { label: string; color: string }> = {
  dps: { label: 'DPS', color: 'oklch(0.65 0.19 25)' },
  boon_dps: { label: 'Boon DPS', color: 'var(--gold)' },
  boon_heal: { label: 'Healer', color: 'var(--good)' },
};

export default function PlayerProfilePage() {
  const { name = '' } = useParams();
  const { data: player, loading, error } = useApiQuery(() => api.player(name), [name]);

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
    const values = [...recentKills].reverse().map((r) => r.dps);
    const w = 720;
    const h = 150;
    const pad = 14;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = (w - pad * 2) / (values.length - 1);
    const pts = values.map((v, i) => ({ x: pad + i * step, y: pad + (1 - (v - min) / range) * (h - pad * 2) }));
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)} ${h - pad} L${pts[0].x.toFixed(1)} ${h - pad} Z`;
    return { line, area, pts };
  }, [recentKills]);

  if (loading) return <LoadingState label="Loading profile…" />;
  if (error) return <ErrorState message={error === 'Player not found' ? `No logs found for ${name} yet.` : error} />;
  if (!player) return null;

  const mainProfession = player.professionBreakdown[0]?.profession ?? null;

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
          padding: 32,
          marginBottom: 22,
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          background:
            'radial-gradient(600px 260px at 85% 0%, oklch(0.32 0.06 155 / 25%), transparent), linear-gradient(135deg, oklch(0.2 0.018 250), oklch(0.13 0.014 250))',
        }}
      >
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 18,
            background: mainProfession
              ? `linear-gradient(135deg, ${professionColorAlpha(mainProfession, 50)}, oklch(0.16 0.02 155 / 60%))`
              : 'oklch(0.22 0.014 250)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
            border: '1px solid var(--border)',
          }}
        >
          {mainProfession && <img src={professionIconPath(mainProfession)} alt={mainProfession} style={{ width: 56, height: 56, objectFit: 'contain' }} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ font: '800 26px var(--font-sans)', letterSpacing: '-.4px' }}>{player.account}</div>
          {mainProfession && (
            <div style={{ font: '500 12.5px var(--font-sans)', color: 'var(--text-62)', marginTop: 4 }}>{mainProfession}</div>
          )}
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
        </div>
      </Card>

      {player.affiliations && (player.affiliations.guild || player.affiliations.groups.length > 0) && (
        <AffiliationsPanel affiliations={player.affiliations} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 20, alignItems: 'start' }}>
        <IdentityPanel specBreakdown={player.specBreakdown} roleBreakdown={player.roleBreakdown} />
        <RecordPanel record={player.record} />
      </div>

      {chart && (
        <Card style={{ padding: '20px 20px 8px', marginBottom: 20 }}>
          <div style={{ font: '700 13.5px var(--font-sans)', marginBottom: 6 }}>DPS Trend — Last {recentKills.length} Kills</div>
          <svg viewBox="0 0 720 150" style={{ width: '100%', height: 'auto', aspectRatio: '720 / 150', overflow: 'visible' }} preserveAspectRatio="none">
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
            {chart.pts.map((pt, i) => (
              <circle key={i} cx={pt.x} cy={pt.y} r={3.5} fill="var(--bg)" stroke="oklch(0.65 0.1 155)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
        </Card>
      )}

      {player.specPerformance.length > 0 && <SpecPerformanceTable rows={player.specPerformance} />}

      {player.coverage.length > 0 && <CoveragePanel coverage={player.coverage} />}

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

      <Card style={{ marginTop: 20, overflow: 'hidden' }}>
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
    </div>
  );
}

// --- Guild & group affiliations -------------------------------------------

function AffiliationsPanel({ affiliations }: { affiliations: NonNullable<PlayerProfile['affiliations']> }) {
  const roleLabel = (role: string) => (role === 'leader' ? 'Leader' : role === 'subleader' ? 'Subleader' : 'Member');
  return (
    <Card style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ font: '700 11px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-50)', flex: 'none' }}>
        Affiliations
      </div>
      {affiliations.guild && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GuildBadge tag={affiliations.guild.tag} />
          <span style={{ font: '600 12.5px var(--font-sans)', color: 'var(--text-80)' }}>{affiliations.guild.name}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {affiliations.groups.map((g) => (
          <Link
            key={g.id}
            to={`/groups/${g.id}`}
            className="u-chip"
            title={`${roleLabel(g.role)}${g.guildRank ? ` · ${g.guildRank}` : ''}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '6px 12px',
              borderRadius: 20,
              font: '600 12px var(--font-sans)',
              background: g.isGuildGroup ? 'oklch(0.78 0.14 85 / 12%)' : 'oklch(1 0 0 / 5%)',
              color: 'var(--text-80)',
              border: `1px solid ${g.isGuildGroup ? 'oklch(0.78 0.14 85 / 30%)' : 'var(--border)'}`,
            }}
          >
            {g.isGuildGroup && <span aria-hidden style={{ color: 'var(--gold)' }}>⚜</span>}
            {g.name}
            {g.role !== 'member' && (
              <span style={{ font: '700 9px var(--font-sans)', letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--gold)' }}>
                {roleLabel(g.role)}
              </span>
            )}
          </Link>
        ))}
        {affiliations.groups.length === 0 && !affiliations.guild && (
          <span style={{ font: '400 12px var(--font-sans)', color: 'var(--text-50)' }}>No groups or guild yet.</span>
        )}
      </div>
    </Card>
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

// --- Kill / wipe record ---------------------------------------------------

function RecordPanel({ record }: { record: PlayerProfile['record'] }) {
  const killPct = record.total ? (record.kills / record.total) * 100 : 0;
  return (
    <Card style={{ padding: '18px 20px' }}>
      <div style={{ font: '700 13.5px var(--font-sans)', marginBottom: 14 }}>Kill Record</div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ font: '800 30px var(--font-sans)', color: 'var(--good)' }}>{record.successRate}%</span>
        <span style={{ font: '500 12px var(--font-sans)', color: 'var(--text-55)' }}>success rate</span>
      </div>
      <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-58)', marginBottom: 14 }}>
        across {record.total.toLocaleString()} logged encounter{record.total === 1 ? '' : 's'}
      </div>

      {/* Kills-vs-wipes ratio bar. */}
      <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: 'var(--bad-dim)' }}>
        <div style={{ width: `${killPct}%`, background: 'var(--good)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
        <div>
          <div style={{ font: '800 20px var(--font-sans)', color: 'var(--good)' }}>{record.kills.toLocaleString()}</div>
          <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Kills</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ font: '800 20px var(--font-sans)', color: 'var(--bad)' }}>{record.wipes.toLocaleString()}</div>
          <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Wipes</div>
        </div>
      </div>
    </Card>
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

// --- Encounter coverage ("collection") ------------------------------------

function CoveragePanel({ coverage }: { coverage: PlayerProfile['coverage'] }) {
  const totalKilled = coverage.reduce((n, w) => n + w.killed, 0);
  const totalBosses = coverage.reduce((n, w) => n + w.total, 0);
  return (
    <Card style={{ marginBottom: 20, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', flexWrap: 'wrap' }}>
        <div style={{ font: '700 13.5px var(--font-sans)' }}>Encounter Coverage</div>
        <div style={{ font: '600 11.5px var(--font-mono)', color: 'var(--gold)' }}>{totalKilled}/{totalBosses} killed</div>
      </div>
      <div style={{ padding: '6px 20px 16px' }}>
        {coverage.map((wing) => (
          <div key={wing.wing} style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
              <div style={{ font: '700 12px var(--font-sans)' }}>{wing.wing}</div>
              <div style={{ font: '500 10.5px var(--font-mono)', color: 'var(--text-50)' }}>{wing.killed}/{wing.total}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {wing.encounters.map((enc) => {
                const state = enc.killed ? 'killed' : enc.attempted ? 'attempted' : 'none';
                const bg = state === 'killed' ? 'var(--good-dim)' : state === 'attempted' ? 'oklch(0.7 0.15 70 / 12%)' : 'oklch(1 0 0 / 3%)';
                const border = state === 'killed' ? 'oklch(0.72 0.17 150 / 40%)' : state === 'attempted' ? 'oklch(0.7 0.15 70 / 30%)' : 'var(--border-faint)';
                const color = state === 'killed' ? 'var(--good)' : state === 'attempted' ? 'oklch(0.8 0.13 70)' : 'var(--text-45)';
                return (
                  <div
                    key={enc.boss}
                    title={`${enc.boss} — ${state === 'killed' ? `killed${enc.bestPct != null ? `, best ${enc.bestPct}th percentile` : ''}` : state === 'attempted' ? 'attempted, no kill' : 'not logged'}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 11px', borderRadius: 8, background: bg, border: `1px solid ${border}` }}
                  >
                    <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', flex: 'none', background: color, opacity: state === 'none' ? 0.5 : 1 }} />
                    <span style={{ font: '600 11.5px var(--font-sans)', color: state === 'none' ? 'var(--text-55)' : 'var(--text-80)', whiteSpace: 'nowrap' }}>{enc.boss}</span>
                    {enc.bestPct != null && <ParseBadge pct={enc.bestPct} style={{ height: 16, minWidth: 24, font: '700 9.5px var(--font-mono)' }} />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
