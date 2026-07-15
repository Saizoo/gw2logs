import { useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { heat, mechColor, eventDotColor } from '../data/derived';
import { professionColor, professionIconPath } from '../data/gw2-data';
import { Card, ParseBadge, ParseLegend, ProfDot, ResultPill } from '../components/atoms';
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
                  <div style={{ font: '600 13px var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
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
  return (
    <Card style={{ padding: '18px 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `28px 1fr 90px repeat(${BOON_COLUMNS.length}, 70px)`, gap: 8, padding: '0 4px 10px', font: '700 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'center' }}>
        <div style={{ textAlign: 'left' }}>Sub</div>
        <div style={{ textAlign: 'left' }}>Player</div>
        <div style={{ textAlign: 'left' }}>Prof</div>
        {BOON_COLUMNS.map((c) => (
          <div key={c.key}>{c.label}</div>
        ))}
      </div>
      {players.map((p) => (
        <div key={p.name} style={{ display: 'grid', gridTemplateColumns: `28px 1fr 90px repeat(${BOON_COLUMNS.length}, 70px)`, gap: 8, alignItems: 'center', padding: '9px 4px', borderBottom: '1px solid var(--border-faint)' }}>
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
      <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-50)', marginTop: 12 }}>
        Uptime % (Might shown as avg stacks). Darker gold = higher uptime.
      </div>
    </Card>
  );
}

function MechanicsTab({ log }: { log: LogDetail }) {
  const mechanicNames = [...new Set(log.players.flatMap((p) => Object.keys(p.mechanics)))];

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      <Card style={{ flex: '1 1 480px', minWidth: 0, padding: '18px 20px' }}>
        <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
          Per-player mechanic counts
        </div>
        {mechanicNames.length === 0 && (
          <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>No mechanics recorded for this encounter.</div>
        )}
        {mechanicNames.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: `28px 1fr 90px repeat(${mechanicNames.length}, 100px)`, gap: 8, padding: '0 4px 10px', font: '700 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'center' }}>
              <div style={{ textAlign: 'left' }}>Sub</div>
              <div style={{ textAlign: 'left' }}>Player</div>
              <div style={{ textAlign: 'left' }}>Prof</div>
              {mechanicNames.map((n) => (
                <div key={n}>{n}</div>
              ))}
            </div>
            {log.players.map((p) => (
              <div key={p.name} style={{ display: 'grid', gridTemplateColumns: `28px 1fr 90px repeat(${mechanicNames.length}, 100px)`, gap: 8, alignItems: 'center', padding: '9px 4px', borderBottom: '1px solid var(--border-faint)' }}>
                <div style={{ font: '700 12px var(--font-mono)', color: 'var(--text-50)' }}>{p.subgroup}</div>
                <div style={{ font: '600 13px var(--font-sans)' }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <ProfDot color={professionColor(p.profession)} />
                  <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-65)' }}>{p.spec}</div>
                </div>
                {mechanicNames.map((n) => (
                  <div key={n} style={{ textAlign: 'center', font: '700 13px var(--font-mono)', color: mechColor(p.mechanics[n] ?? 0) }}>
                    {p.mechanics[n] ?? 0}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </Card>

      <FightTimeline log={log} />
    </div>
  );
}

function FightTimeline({ log }: { log: LogDetail }) {
  return (
    <Card style={{ width: 280, flex: 'none', padding: '18px 20px' }}>
      <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
        Fight timeline
      </div>
      {log.mechanicEvents.length === 0 && (
        <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-55)' }}>No events recorded.</div>
      )}
      {log.mechanicEvents.slice(0, 20).map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border-faint)' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: eventDotColor('info'), marginTop: 5, flex: 'none' }} />
          <div>
            <div style={{ font: '600 11px var(--font-mono)', color: 'var(--text-55)' }}>{formatDuration(e.timeMs)}</div>
            <div style={{ font: '500 12px var(--font-sans)' }}>
              {e.name}
              {e.actor ? ` — ${e.actor}` : ''}
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
}

function TimelineTab({ log }: { log: LogDetail }) {
  return (
    <Card style={{ padding: '18px 20px', maxWidth: 480 }}>
      {log.mechanicEvents.length === 0 && (
        <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>No events recorded for this log.</div>
      )}
      {log.mechanicEvents.map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-faint)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: eventDotColor('info'), marginTop: 5, flex: 'none' }} />
          <div>
            <div style={{ font: '600 12px var(--font-mono)', color: 'var(--text-55)' }}>{formatDuration(e.timeMs)}</div>
            <div style={{ font: '500 13px var(--font-sans)' }}>
              {e.name}
              {e.actor ? ` — ${e.actor}` : ''}
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
}
