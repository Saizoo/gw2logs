import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { heat, mechColor, eventDotColor } from '../data/derived';
import { professionColor } from '../data/gw2-data';
import { ProfDot } from '../components/atoms';
import { api, type LogDetail, type LogDetailPlayer } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { LoadingState, ErrorState } from '../components/QueryStates';

type Tab = 'DPS breakdown' | 'Boons' | 'Mechanics' | 'Timeline';
const TABS: Tab[] = ['DPS breakdown', 'Boons', 'Mechanics', 'Timeline'];

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
  const [tab, setTab] = useState<Tab>('DPS breakdown');
  const { data: log, loading, error } = useApiQuery(() => api.log(id), [id]);

  if (loading) return <LoadingState label="Loading log…" />;
  if (error) return <ErrorState message={error} />;
  if (!log) return null;

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 0 40px' }}>
      <div style={{ padding: '22px 28px', background: 'var(--bg-header)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          {log.wing && <span style={{ font: '400 12px var(--font-mono)', color: 'var(--text-40)' }}>{log.wing}</span>}
          <span style={{ font: '600 10px var(--font-sans)', padding: '2px 8px', background: log.success ? 'var(--good-dim)' : 'rgba(245,93,78,.15)', color: log.success ? 'var(--good)' : 'var(--bad)', borderRadius: 4 }}>
            {log.success ? 'SUCCESS' : 'FAILURE'}
          </span>
          {log.isCm && (
            <span style={{ font: '600 10px var(--font-sans)', padding: '2px 8px', background: 'var(--gold-dim)', color: 'var(--gold)', borderRadius: 4 }}>
              CM
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ font: '800 26px var(--font-sans)', color: 'var(--text)' }}>{log.boss}</h1>
          <div style={{ display: 'flex', gap: 22, textAlign: 'right' }}>
            <div>
              <div style={{ font: '700 15px var(--font-mono)', color: 'var(--gold)' }}>{formatDuration(log.durationMs)}</div>
              <div style={{ font: '400 10px var(--font-sans)', color: 'var(--text-40)' }}>duration</div>
            </div>
            <div>
              <div style={{ font: '700 15px var(--font-mono)', color: 'var(--gold)' }}>{log.squadDps.toLocaleString()}</div>
              <div style={{ font: '400 10px var(--font-sans)', color: 'var(--text-40)' }}>squad dps</div>
            </div>
            <div>
              <div style={{ font: '500 12px var(--font-mono)', color: 'var(--text-60)' }}>{new Date(log.date).toLocaleString()}</div>
              <div style={{ font: '400 10px var(--font-sans)', color: 'var(--text-40)' }}>logged</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, padding: '16px 28px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 14px',
              background: tab === t ? 'var(--gold)' : 'var(--bg-chip)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              font: tab === t ? '600 12px var(--font-sans)' : '500 12px var(--font-sans)',
              color: tab === t ? '#14120f' : 'var(--text-60)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'DPS breakdown' && <DpsTab log={log} />}
      {tab === 'Boons' && <BoonsTab players={log.players} />}
      {tab === 'Mechanics' && <MechanicsTab log={log} />}
      {tab === 'Timeline' && <TimelineTab log={log} />}
    </div>
  );
}

function DpsTab({ log }: { log: LogDetail }) {
  const maxDps = Math.max(...log.players.map((p) => p.total), 1);
  return (
    <div style={{ padding: '20px 28px 28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 120px 90px 1fr 90px 90px', gap: 12, padding: '0 14px 10px', font: '600 11px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
        <div>Sub</div>
        <div>Player</div>
        <div>Profession</div>
        <div>Total DPS</div>
        <div>Power / Condition split</div>
        <div>Dmg taken</div>
        <div>Downs</div>
      </div>
      {log.players.map((p) => {
        const barWidth = Math.round((p.total / maxDps) * 100);
        const downsColor = p.downs > 0 ? 'var(--bad)' : 'var(--text-35)';
        return (
          <div key={p.name} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 120px 90px 1fr 90px 90px', gap: 12, alignItems: 'center', padding: '10px 14px', background: 'var(--bg-row)', borderRadius: 6, marginBottom: 3 }}>
            <div style={{ font: '700 12px var(--font-mono)', color: 'var(--text-35)' }}>{p.subgroup}</div>
            <div style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>{p.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <ProfDot color={professionColor(p.profession)} />
              <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-70)' }}>{p.spec}</div>
            </div>
            <div style={{ font: '700 13px var(--font-mono)', color: 'var(--text)' }}>{p.total.toLocaleString()}</div>
            <div style={{ display: 'flex', height: 16, borderRadius: 4, overflow: 'hidden', width: `${barWidth}%`, background: 'rgba(255,255,255,.06)' }}>
              <div style={{ width: `${p.powerPct}%`, background: 'var(--gold)' }} />
              <div style={{ width: `${p.condiPct}%`, background: 'var(--blue)' }} />
            </div>
            <div style={{ font: '500 12px var(--font-mono)', color: 'var(--text-55)' }}>{p.damageTaken.toLocaleString()}</div>
            <div style={{ font: '600 12px var(--font-mono)', color: downsColor }}>{p.downs}</div>
          </div>
        );
      })}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14, padding: '0 14px' }}>
        <Legend color="var(--gold)" label="Power damage" />
        <Legend color="var(--blue)" label="Condition damage" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 9, height: 9, borderRadius: 2, background: color }} />
      <span style={{ font: '500 11px var(--font-sans)', color: 'var(--text-50)' }}>{label}</span>
    </div>
  );
}

function BoonsTab({ players }: { players: LogDetailPlayer[] }) {
  return (
    <div style={{ padding: '20px 28px 28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `28px 1fr 90px repeat(${BOON_COLUMNS.length}, 70px)`, gap: 8, padding: '0 14px 10px', font: '600 11px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'center' }}>
        <div style={{ textAlign: 'left' }}>Sub</div>
        <div style={{ textAlign: 'left' }}>Player</div>
        <div style={{ textAlign: 'left' }}>Prof</div>
        {BOON_COLUMNS.map((c) => (
          <div key={c.key}>{c.label}</div>
        ))}
      </div>
      {players.map((p) => (
        <div key={p.name} style={{ display: 'grid', gridTemplateColumns: `28px 1fr 90px repeat(${BOON_COLUMNS.length}, 70px)`, gap: 8, alignItems: 'center', padding: '9px 14px', background: 'var(--bg-row)', borderRadius: 6, marginBottom: 3 }}>
          <div style={{ font: '700 12px var(--font-mono)', color: 'var(--text-35)' }}>{p.subgroup}</div>
          <div style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>{p.name}</div>
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
      <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-35)', marginTop: 12, padding: '0 14px' }}>
        Uptime % (Might shown as avg stacks). Darker gold = higher uptime.
      </div>
    </div>
  );
}

function MechanicsTab({ log }: { log: LogDetail }) {
  const mechanicNames = [...new Set(log.players.flatMap((p) => Object.keys(p.mechanics)))];

  return (
    <div style={{ display: 'flex', gap: 24, padding: '20px 28px 28px', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 480px', minWidth: 0 }}>
        <div style={{ font: '600 11px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
          Per-player mechanic counts
        </div>
        {mechanicNames.length === 0 && (
          <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-40)' }}>No mechanics recorded for this encounter.</div>
        )}
        {mechanicNames.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: `28px 1fr 90px repeat(${mechanicNames.length}, 100px)`, gap: 8, padding: '0 14px 10px', font: '600 11px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'center' }}>
              <div style={{ textAlign: 'left' }}>Sub</div>
              <div style={{ textAlign: 'left' }}>Player</div>
              <div style={{ textAlign: 'left' }}>Prof</div>
              {mechanicNames.map((n) => (
                <div key={n}>{n}</div>
              ))}
            </div>
            {log.players.map((p) => (
              <div key={p.name} style={{ display: 'grid', gridTemplateColumns: `28px 1fr 90px repeat(${mechanicNames.length}, 100px)`, gap: 8, alignItems: 'center', padding: '9px 14px', background: 'var(--bg-row)', borderRadius: 6, marginBottom: 3 }}>
                <div style={{ font: '700 12px var(--font-mono)', color: 'var(--text-35)' }}>{p.subgroup}</div>
                <div style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>{p.name}</div>
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
      </div>

      <FightTimeline log={log} />
    </div>
  );
}

function FightTimeline({ log }: { log: LogDetail }) {
  return (
    <div style={{ width: 280, flex: 'none' }}>
      <div style={{ font: '600 11px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
        Fight timeline
      </div>
      <div style={{ background: 'var(--bg-row)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
        {log.mechanicEvents.length === 0 && (
          <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-40)' }}>No events recorded.</div>
        )}
        {log.mechanicEvents.slice(0, 20).map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border-soft)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: eventDotColor('info'), marginTop: 5, flex: 'none' }} />
            <div>
              <div style={{ font: '600 11px var(--font-mono)', color: 'var(--text-40)' }}>{formatDuration(e.timeMs)}</div>
              <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text)' }}>
                {e.name}{e.actor ? ` — ${e.actor}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineTab({ log }: { log: LogDetail }) {
  return (
    <div style={{ padding: '20px 28px 28px', maxWidth: 480 }}>
      <div style={{ background: 'var(--bg-row)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
        {log.mechanicEvents.length === 0 && (
          <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-40)' }}>No events recorded for this log.</div>
        )}
        {log.mechanicEvents.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: eventDotColor('info'), marginTop: 5, flex: 'none' }} />
            <div>
              <div style={{ font: '600 12px var(--font-mono)', color: 'var(--text-40)' }}>{formatDuration(e.timeMs)}</div>
              <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text)' }}>
                {e.name}{e.actor ? ` — ${e.actor}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
