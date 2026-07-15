import { useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { heat, eventDotColor, severityColor, severityRank } from '../data/derived';
import { professionColor, professionIconPath } from '../data/gw2-data';
import { Card, ParseBadge, ParseLegend, ProfDot, ResultPill, SquadRoleBadge } from '../components/atoms';
import { api, type DpsChartPoint, type LogDetail, type LogDetailPlayer } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { LoadingState, ErrorState } from '../components/QueryStates';

type Tab = 'Squad' | 'Boons' | 'Mechanics' | 'Timeline';
const TABS: Tab[] = ['Squad', 'Boons', 'Mechanics', 'Timeline'];

const BOON_COLUMNS: { key: string; label: string; weight?: number }[] = [
  { key: 'quickness', label: 'Quick' },
  { key: 'alacrity', label: 'Alac' },
  { key: 'might', label: 'Might', weight: 4 },
  { key: 'fury', label: 'Fury' },
  { key: 'protection', label: 'Prot' },
  { key: 'aegis', label: 'Aegis', weight: 3 },
  { key: 'stability', label: 'Stab' },
];

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export default function LogDetailPage() {
  const { id = '' } = useParams();
  const [tab, setTab] = useState<Tab>('Squad');
  const { data: log, loading, error } = useApiQuery(() => api.log(id), [id]);

  if (loading) return <LoadingState label="Loading log…" />;
  if (error) return <ErrorState message={error} />;
  if (!log) return null;

  return (
    <div>
      <Card
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '36px 32px',
          marginBottom: 22,
          background:
            'radial-gradient(700px 300px at 15% 0%, oklch(0.4 0.1 55 / 25%), transparent), linear-gradient(135deg, oklch(0.2 0.02 260), oklch(0.13 0.015 250))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              {log.wing && (
                <div style={{ font: '700 11px var(--font-sans)', letterSpacing: '.5px', color: 'var(--gold)', textTransform: 'uppercase' }}>
                  {log.wing}
                </div>
              )}
              <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-50)' }} />
              <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-60)' }}>{new Date(log.date).toLocaleString()}</div>
            </div>
            <div style={{ font: '800 30px var(--font-sans)', letterSpacing: '-.5px' }}>
              {log.boss}
              {log.isCm ? ' CM' : ''}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <ResultPill success={log.success} />
              <Pill>{formatDuration(log.durationMs)}</Pill>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ font: '800 32px var(--font-sans)', color: 'var(--gold)', letterSpacing: '-.5px' }}>
              {log.squadDps.toLocaleString()}
            </div>
            <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-60)' }}>squad dps</div>
          </div>
        </div>
      </Card>

      {log.dpsChart && <DpsOverTimeChart points={log.dpsChart} durationLabel={formatDuration(log.durationMs)} />}

      <div style={{ marginBottom: 14 }}>
        <ParseLegend />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '7px 14px',
              borderRadius: 9,
              font: '600 12px var(--font-sans)',
              background: tab === t ? 'var(--gold-grad)' : 'var(--bg-chip)',
              color: tab === t ? 'var(--gold-fg)' : 'var(--text-65)',
              border: `1px solid ${tab === t ? 'transparent' : 'var(--border)'}`,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Squad' && <SquadTab log={log} />}
      {tab === 'Boons' && <BoonsTab players={log.players} />}
      {tab === 'Mechanics' && <MechanicsTab log={log} />}
      {tab === 'Timeline' && <TimelineTab log={log} />}
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span style={{ font: '600 11px var(--font-sans)', padding: '5px 12px', borderRadius: 8, background: 'var(--bg-chip)', color: 'var(--text-80)', border: '1px solid var(--border)' }}>
      {children}
    </span>
  );
}

function DpsOverTimeChart({ points, durationLabel }: { points: DpsChartPoint[]; durationLabel: string }) {
  const { linePath, areaPath } = useMemo(() => {
    const w = 720;
    const h = 160;
    const pad = 14;
    const values = points.map((p) => p.dps);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = (w - pad * 2) / (points.length - 1 || 1);
    const pts = points.map((p, i) => ({
      x: pad + i * step,
      y: pad + (1 - (p.dps - min) / range) * (h - pad * 2),
    }));
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)} ${h - pad} L${pts[0].x.toFixed(1)} ${h - pad} Z`;
    return { linePath: line, areaPath: area };
  }, [points]);

  return (
    <Card style={{ padding: '20px 20px 8px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ font: '700 13.5px var(--font-sans)' }}>Squad DPS Over Time</div>
        <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>0:00 – {durationLabel}</div>
      </div>
      <svg viewBox="0 0 720 160" style={{ width: '100%', height: 160, overflow: 'visible' }}>
        <defs>
          <linearGradient id="dpsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g stroke="var(--border-soft)" strokeWidth={1}>
          <line x1="0" y1="20" x2="720" y2="20" />
          <line x1="0" y1="66" x2="720" y2="66" />
          <line x1="0" y1="112" x2="720" y2="112" />
          <line x1="0" y1="158" x2="720" y2="158" />
        </g>
        <path d={areaPath} fill="url(#dpsFill)" />
        <path d={linePath} fill="none" stroke="var(--gold)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Card>
  );
}

function SquadTab({ log }: { log: LogDetail }) {
  const subgroups = useMemo(() => {
    const bySubgroup = new Map<number, LogDetailPlayer[]>();
    for (const p of log.players) {
      if (!bySubgroup.has(p.subgroup)) bySubgroup.set(p.subgroup, []);
      bySubgroup.get(p.subgroup)!.push(p);
    }
    return [...bySubgroup.entries()].sort((a, b) => a[0] - b[0]);
  }, [log.players]);

  const maxDps = Math.max(...log.players.map((p) => p.total), 1);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(subgroups.length, 2) || 1}, 1fr)`, gap: 20 }}>
      {subgroups.map(([sub, players]) => (
        <Card key={sub} style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', font: '700 11.5px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-60)', borderBottom: '1px solid var(--border-soft)' }}>
            Subgroup {sub}
          </div>
          {players.map((p) => {
            const barWidth = Math.round((p.total / maxDps) * 100);
            return (
              <div key={p.name} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: '1px solid var(--border-faint)', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${professionColor(p.profession)} 0%, transparent ${barWidth}%)`, opacity: 0.16 }} />
                <img
                  src={professionIconPath(p.profession, p.spec)}
                  style={{ position: 'relative', width: 32, height: 32, objectFit: 'contain', borderRadius: 8, background: 'oklch(0.14 0.01 250 / 60%)', padding: 3, flex: 'none' }}
                />
                <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, font: '700 9.5px var(--font-sans)', letterSpacing: '.4px', textTransform: 'uppercase', color: professionColor(p.profession) }}>
                    <ProfDot color={professionColor(p.profession)} size={6} />
                    {p.role === 'power' ? 'Power DPS' : 'Condition DPS'} · {p.spec}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ font: '600 13px var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <SquadRoleBadge squadRole={p.squadRole} />
                  </div>
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
        </Card>
      ))}
    </div>
  );
}

function BoonsTab({ players }: { players: LogDetailPlayer[] }) {
  // Fixed column count, but still wrapped in its own scroll container for
  // consistency with MechanicsTab and safety on narrow viewports — a data
  // table like this should never be allowed to blow out the page's width.
  const gridColumns = `28px 1fr 90px repeat(${BOON_COLUMNS.length}, 70px)`;
  return (
    <Card style={{ padding: '18px 20px' }}>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 'fit-content' }}>
          <div style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 8, padding: '0 4px 10px', font: '700 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'center' }}>
            <div style={{ textAlign: 'left' }}>Sub</div>
            <div style={{ textAlign: 'left' }}>Player</div>
            <div style={{ textAlign: 'left' }}>Prof</div>
            {BOON_COLUMNS.map((c) => (
              <div key={c.key}>{c.label}</div>
            ))}
          </div>
          {players.map((p) => (
            <div key={p.name} style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 8, alignItems: 'center', padding: '9px 4px', borderBottom: '1px solid var(--border-faint)' }}>
              <div style={{ font: '700 12px var(--font-mono)', color: 'var(--text-50)' }}>{p.subgroup}</div>
              <div style={{ font: '600 13px var(--font-sans)' }}>{p.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <ProfDot color={professionColor(p.profession)} />
                <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-65)' }}>{p.spec}</div>
              </div>
              {BOON_COLUMNS.map((c) => {
                const raw = p.boons[c.key] ?? 0;
                const heatValue = c.weight ? Math.min(raw * c.weight, 100) : raw;
                return (
                  <div key={c.key} style={{ textAlign: 'center', padding: '4px 0', borderRadius: 4, background: heat(heatValue), font: '700 12px var(--font-mono)', color: '#14120f' }}>
                    {raw}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-50)', marginTop: 12 }}>
        Uptime % (Might shown as avg stacks). Darker gold = higher uptime.
      </div>
    </Card>
  );
}

interface MechanicSummary {
  name: string;
  severity: string | null;
  total: number;
}

function summarizeMechanics(log: LogDetail): MechanicSummary[] {
  const byName = new Map<string, MechanicSummary>();
  for (const e of log.mechanicEvents) {
    const cur = byName.get(e.name) ?? { name: e.name, severity: e.severity, total: 0 };
    cur.total++;
    if (!cur.severity) cur.severity = e.severity;
    byName.set(e.name, cur);
  }
  // Worst mechanics first — the whole point of surfacing severity is so the
  // dangerous ones don't get lost in a dozen-plus alphabetically-sorted
  // columns.
  return [...byName.values()].sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.total - a.total);
}

function MechanicsTab({ log }: { log: LogDetail }) {
  const mechanics = useMemo(() => summarizeMechanics(log), [log]);
  const mechanicNames = mechanics.map((m) => m.name);
  const severityByName = new Map(mechanics.map((m) => [m.name, m.severity]));
  // A real raid boss log can log a dozen-plus distinct mechanic names —
  // this grid's width scales with that count, so it must scroll within its
  // own card rather than being left to blow out the whole page's layout.
  const gridColumns = `28px 1fr 90px repeat(${mechanicNames.length}, 100px)`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {mechanics.length > 0 && (
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
            Mechanic legend — worst first
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {mechanics.map((m) => (
              <div
                key={m.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: 'var(--bg-chip)',
                  border: `1px solid ${severityColor(m.severity)}`,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: severityColor(m.severity), flex: 'none' }} />
                <div style={{ font: '600 12px var(--font-sans)' }}>{m.name}</div>
                <div style={{ font: '700 10px var(--font-mono)', color: severityColor(m.severity) }}>{m.severity ?? '—'}</div>
                <div style={{ font: '600 11px var(--font-mono)', color: 'var(--text-55)' }}>×{m.total}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card style={{ padding: '18px 20px' }}>
        <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
          Per-player mechanic counts
        </div>
        {mechanicNames.length === 0 && (
          <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>No mechanics recorded for this encounter.</div>
        )}
        {mechanicNames.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 'fit-content' }}>
              <div style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 8, padding: '0 4px 10px', font: '700 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'center' }}>
                <div style={{ textAlign: 'left' }}>Sub</div>
                <div style={{ textAlign: 'left' }}>Player</div>
                <div style={{ textAlign: 'left' }}>Prof</div>
                {mechanicNames.map((n) => (
                  <div key={n} title={severityByName.get(n) ?? undefined} style={{ color: severityColor(severityByName.get(n) ?? null) }}>
                    {n}
                  </div>
                ))}
              </div>
              {log.players.map((p) => (
                <div key={p.name} style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 8, alignItems: 'center', padding: '9px 4px', borderBottom: '1px solid var(--border-faint)' }}>
                  <div style={{ font: '700 12px var(--font-mono)', color: 'var(--text-50)' }}>{p.subgroup}</div>
                  <div style={{ font: '600 13px var(--font-sans)' }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <ProfDot color={professionColor(p.profession)} />
                    <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-65)' }}>{p.spec}</div>
                  </div>
                  {mechanicNames.map((n) => {
                    const count = p.mechanics[n] ?? 0;
                    return (
                      <div key={n} style={{ textAlign: 'center', font: '700 13px var(--font-mono)', color: count > 0 ? severityColor(severityByName.get(n) ?? null) : 'rgba(242,237,226,.25)' }}>
                        {count}
                      </div>
                    );
                  })}
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 8, alignItems: 'center', padding: '10px 4px 2px', borderTop: '1px solid var(--border-soft)', marginTop: 4 }}>
                <div />
                <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Squad total</div>
                <div />
                {mechanics.map((m) => (
                  <div key={m.name} style={{ textAlign: 'center', font: '800 13px var(--font-mono)', color: severityColor(m.severity) }}>
                    {m.total}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

type TimelineRow =
  | { kind: 'mechanic'; timeMs: number; name: string; actor: string | null; severity: string | null }
  | { kind: 'death'; timeMs: number; actor: string; killedBy: string | null };

function TimelineTab({ log }: { log: LogDetail }) {
  const rows = useMemo<TimelineRow[]>(() => {
    const mechanicRows: TimelineRow[] = log.mechanicEvents.map((e) => ({ kind: 'mechanic', ...e }));
    const deathRows: TimelineRow[] = log.deathEvents.map((e) => ({ kind: 'death', ...e }));
    return [...mechanicRows, ...deathRows].sort((a, b) => a.timeMs - b.timeMs);
  }, [log.mechanicEvents, log.deathEvents]);

  if (rows.length === 0) {
    return (
      <Card style={{ padding: '18px 20px' }}>
        <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>No events recorded for this log.</div>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <TimelineScrubber log={log} />
      <Card style={{ padding: '18px 20px' }}>
        <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
          Full event history — {rows.length} events
        </div>
        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
          {rows.map((r, i) =>
            r.kind === 'death' ? (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 8px', borderBottom: '1px solid var(--border-faint)', background: 'oklch(0.28 0.08 25 / 20%)', borderRadius: 6 }}
              >
                <div style={{ width: 8, height: 8, borderRadius: 2, transform: 'rotate(45deg)', background: eventDotColor('bad'), marginTop: 6, flex: 'none' }} />
                <div>
                  <div style={{ font: '600 12px var(--font-mono)', color: 'var(--text-55)' }}>{formatDuration(r.timeMs)}</div>
                  <div style={{ font: '700 13px var(--font-sans)', color: 'var(--bad)' }}>
                    {r.actor} died{r.killedBy ? ` — killed by ${r.killedBy}` : ''}
                  </div>
                </div>
              </div>
            ) : (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 8px', borderBottom: '1px solid var(--border-faint)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: severityColor(r.severity), marginTop: 5, flex: 'none' }} />
                <div>
                  <div style={{ font: '600 12px var(--font-mono)', color: 'var(--text-55)' }}>{formatDuration(r.timeMs)}</div>
                  <div style={{ font: '500 13px var(--font-sans)' }}>
                    {r.name}
                    {r.actor ? ` — ${r.actor}` : ''}
                    {r.severity && (
                      <span style={{ font: '700 10px var(--font-mono)', color: severityColor(r.severity), marginLeft: 8 }}>{r.severity}</span>
                    )}
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      </Card>
    </div>
  );
}

function TimelineScrubber({ log }: { log: LogDetail }) {
  const w = 720;
  const h = 90;
  const pad = 14;
  const duration = Math.max(log.durationMs, 1);
  const xFor = (t: number) => pad + (Math.min(t, duration) / duration) * (w - pad * 2);

  const minuteMarks = useMemo(() => {
    const marks: number[] = [];
    for (let ms = 0; ms <= duration; ms += 60000) marks.push(ms);
    return marks;
  }, [duration]);

  return (
    <Card style={{ padding: '20px 20px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ font: '700 13.5px var(--font-sans)' }}>Fight Timeline</div>
        <div style={{ display: 'flex', gap: 14, font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: severityColor('Sev4'), display: 'inline-block' }} /> mechanic (severity)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, transform: 'rotate(45deg)', background: eventDotColor('bad'), display: 'inline-block' }} /> death
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, overflow: 'visible' }}>
        <line x1={pad} y1={60} x2={w - pad} y2={60} stroke="var(--border-soft)" strokeWidth={1} />
        {minuteMarks.map((ms) => (
          <g key={ms}>
            <line x1={xFor(ms)} y1={20} x2={xFor(ms)} y2={70} stroke="var(--border-faint)" strokeWidth={1} />
            <text x={xFor(ms)} y={84} textAnchor="middle" fontSize={9} fill="var(--text-50)">
              {formatDuration(ms)}
            </text>
          </g>
        ))}
        {log.mechanicEvents.map((e, i) => (
          <circle key={`m${i}`} cx={xFor(e.timeMs)} cy={60} r={3 + severityRank(e.severity) * 0.6} fill={severityColor(e.severity)} opacity={0.85}>
            <title>
              {formatDuration(e.timeMs)} — {e.name}
              {e.actor ? ` (${e.actor})` : ''}
            </title>
          </circle>
        ))}
        {log.deathEvents.map((e, i) => (
          <rect key={`d${i}`} x={xFor(e.timeMs) - 4} y={16} width={8} height={8} transform={`rotate(45 ${xFor(e.timeMs)} 20)`} fill={eventDotColor('bad')} stroke="var(--bg)" strokeWidth={1}>
            <title>
              {formatDuration(e.timeMs)} — {e.actor} died{e.killedBy ? ` (killed by ${e.killedBy})` : ''}
            </title>
          </rect>
        ))}
      </svg>
    </Card>
  );
}
