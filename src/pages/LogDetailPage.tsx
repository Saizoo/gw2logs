import { useState } from 'react';
import { LOG_DETAIL, BOON_UPTIMES, MECHANICS, FIGHT_EVENTS } from '../data/gw2-data';
import { heat, mechColor, eventDotColor } from '../data/derived';
import { ProfDot } from '../components/atoms';

type Tab = 'DPS breakdown' | 'Boons' | 'Mechanics' | 'Timeline';
const TABS: Tab[] = ['DPS breakdown', 'Boons', 'Mechanics', 'Timeline'];

const maxSquadPlayerDps = Math.max(...LOG_DETAIL.players.map((p) => p.total));

export default function LogDetailPage() {
  const [tab, setTab] = useState<Tab>('DPS breakdown');
  const log = LOG_DETAIL;

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 0 40px' }}>
      <div style={{ padding: '22px 28px', background: 'var(--bg-header)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <span style={{ font: '400 12px var(--font-mono)', color: 'var(--text-40)' }}>{log.wing}</span>
          <span style={{ font: '600 10px var(--font-sans)', padding: '2px 8px', background: 'var(--good-dim)', color: 'var(--good)', borderRadius: 4 }}>
            {log.success ? 'SUCCESS' : 'FAILURE'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ font: '800 26px var(--font-sans)', color: 'var(--text)' }}>{log.boss}</h1>
          <div style={{ display: 'flex', gap: 22, textAlign: 'right' }}>
            <div>
              <div style={{ font: '700 15px var(--font-mono)', color: 'var(--gold)' }}>{log.duration}</div>
              <div style={{ font: '400 10px var(--font-sans)', color: 'var(--text-40)' }}>duration</div>
            </div>
            <div>
              <div style={{ font: '700 15px var(--font-mono)', color: 'var(--gold)' }}>{log.squadDps.toLocaleString()}</div>
              <div style={{ font: '400 10px var(--font-sans)', color: 'var(--text-40)' }}>squad dps</div>
            </div>
            <div>
              <div style={{ font: '500 12px var(--font-mono)', color: 'var(--text-60)' }}>{log.date}</div>
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

      {tab === 'DPS breakdown' && <DpsTab />}
      {tab === 'Boons' && <BoonsTab />}
      {tab === 'Mechanics' && <MechanicsTab />}
      {tab === 'Timeline' && <TimelineTab />}
    </div>
  );
}

function DpsTab() {
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
      {LOG_DETAIL.players.map((p) => {
        const barWidth = Math.round((p.total / maxSquadPlayerDps) * 100);
        const downsColor = p.downs > 0 ? 'var(--bad)' : 'var(--text-35)';
        return (
          <div key={p.name} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 120px 90px 1fr 90px 90px', gap: 12, alignItems: 'center', padding: '10px 14px', background: 'var(--bg-row)', borderRadius: 6, marginBottom: 3 }}>
            <div style={{ font: '700 12px var(--font-mono)', color: 'var(--text-35)' }}>{p.subgroup}</div>
            <div style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>{p.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <ProfDot color={p.color} />
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

const BOON_COLUMNS: { key: keyof (typeof BOON_UPTIMES)[number]; label: string; weight?: number }[] = [
  { key: 'quickness', label: 'Quick' },
  { key: 'alacrity', label: 'Alac' },
  { key: 'might', label: 'Might', weight: 4 },
  { key: 'fury', label: 'Fury' },
  { key: 'protection', label: 'Prot' },
  { key: 'aegis', label: 'Aegis', weight: 3 },
  { key: 'stability', label: 'Stab' },
];

function BoonsTab() {
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
      {BOON_UPTIMES.map((b) => (
        <div key={b.name} style={{ display: `grid`, gridTemplateColumns: `28px 1fr 90px repeat(${BOON_COLUMNS.length}, 70px)`, gap: 8, alignItems: 'center', padding: '9px 14px', background: 'var(--bg-row)', borderRadius: 6, marginBottom: 3 }}>
          <div style={{ font: '700 12px var(--font-mono)', color: 'var(--text-35)' }}>{b.subgroup}</div>
          <div style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>{b.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <ProfDot color={b.color} />
            <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-65)' }}>{b.spec}</div>
          </div>
          {BOON_COLUMNS.map((c) => {
            const raw = b[c.key] as number;
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

function MechanicsTab() {
  return (
    <div style={{ display: 'flex', gap: 24, padding: '20px 28px 28px', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 480px', minWidth: 0 }}>
        <div style={{ font: '600 11px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
          Per-player mechanic counts
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 90px 90px 90px 90px 100px', gap: 8, padding: '0 14px 10px', font: '600 11px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'center' }}>
          <div style={{ textAlign: 'left' }}>Sub</div>
          <div style={{ textAlign: 'left' }}>Player</div>
          <div style={{ textAlign: 'left' }}>Prof</div>
          <div>Shackled</div>
          <div>Green hit</div>
          <div>Claws hit</div>
          <div>Max enfeeble</div>
        </div>
        {MECHANICS.map((r) => (
          <div key={r.name} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 90px 90px 90px 90px 100px', gap: 8, alignItems: 'center', padding: '9px 14px', background: 'var(--bg-row)', borderRadius: 6, marginBottom: 3 }}>
            <div style={{ font: '700 12px var(--font-mono)', color: 'var(--text-35)' }}>{r.subgroup}</div>
            <div style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>{r.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <ProfDot color={r.color} />
              <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-65)' }}>{r.spec}</div>
            </div>
            <div style={{ textAlign: 'center', font: '700 13px var(--font-mono)', color: mechColor(r.shackled) }}>{r.shackled}</div>
            <div style={{ textAlign: 'center', font: '700 13px var(--font-mono)', color: mechColor(r.greenHit) }}>{r.greenHit}</div>
            <div style={{ textAlign: 'center', font: '700 13px var(--font-mono)', color: mechColor(r.clawsHit) }}>{r.clawsHit}</div>
            <div style={{ textAlign: 'center', font: '700 13px var(--font-mono)', color: 'var(--text-60)' }}>{r.maxEnfeeble}</div>
          </div>
        ))}
      </div>

      <FightTimeline />
    </div>
  );
}

function FightTimeline() {
  return (
    <div style={{ width: 280, flex: 'none' }}>
      <div style={{ font: '600 11px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
        Fight timeline
      </div>
      <div style={{ background: 'var(--bg-row)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
        {FIGHT_EVENTS.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border-soft)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: eventDotColor(e.type), marginTop: 5, flex: 'none' }} />
            <div>
              <div style={{ font: '600 11px var(--font-mono)', color: 'var(--text-40)' }}>{e.time}</div>
              <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text)' }}>{e.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineTab() {
  return (
    <div style={{ padding: '20px 28px 28px', maxWidth: 480 }}>
      <div style={{ background: 'var(--bg-row)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
        {FIGHT_EVENTS.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-soft)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: eventDotColor(e.type), marginTop: 5, flex: 'none' }} />
            <div>
              <div style={{ font: '600 12px var(--font-mono)', color: 'var(--text-40)' }}>{e.time}</div>
              <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text)' }}>{e.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
