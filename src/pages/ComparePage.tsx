import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api, type CompareParse, type CompareResult } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { bossBgPath, professionColor, professionIconPath } from '../data/gw2-data';
import { ArtImg, Card, ParseBadge } from '../components/atoms';
import { Select } from '../components/Select';
import { LoadingState, ErrorState } from '../components/QueryStates';

function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function fmtValue(label: string, v: number): string {
  if (label === 'Parse %') return `${v}%`;
  if (label === 'Kill time') return fmtDuration(v);
  return v.toLocaleString();
}

export default function ComparePage() {
  const [params, setParams] = useSearchParams();
  const accountA = params.get('accountA') ?? '';
  const accountB = params.get('accountB') ?? '';
  const logIdA = params.get('logIdA') ?? '';
  const logIdB = params.get('logIdB') ?? '';
  const fightName = params.get('fightName') ?? '';
  const isCm = params.get('cm') === 'true';

  const byLog = Boolean(logIdA && logIdB && accountA && accountB);
  const byBest = Boolean(accountA && accountB && fightName);
  const ready = byLog || byBest;

  const { data: encounters } = useApiQuery(() => api.encounters(), []);

  const { data, loading, error } = useApiQuery(
    () =>
      ready
        ? api.compare(byLog ? { accountA, accountB, logIdA, logIdB } : { accountA, accountB, fightName, isCm })
        : Promise.resolve(null),
    [accountA, accountB, logIdA, logIdB, fightName, isCm, ready],
  );

  // The picker updates accounts / encounter and drops any specific-log params
  // so the page switches to best-parse mode.
  function setField(key: 'accountA' | 'accountB', value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('logIdA');
    next.delete('logIdB');
    setParams(next, { replace: true });
  }
  function setEncounter(value: string) {
    const [fn, cm] = value.split('|');
    const next = new URLSearchParams(params);
    next.set('fightName', fn);
    next.set('cm', cm);
    next.delete('logIdA');
    next.delete('logIdB');
    setParams(next, { replace: true });
  }

  const encounterOptions = useMemo(
    () => (encounters ?? []).map((e) => ({ value: `${e.fightName}|${e.isCm}`, label: `${e.fightName}${e.isCm ? ' CM' : ''}` })),
    [encounters],
  );

  return (
    <div style={{ maxWidth: 940, margin: '0 auto' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ font: '800 24px var(--font-sans)', letterSpacing: '-.4px' }}>Compare</div>
        <div style={{ font: '400 13px var(--font-sans)', color: 'var(--text-60)', marginTop: 4 }}>
          Put two players head-to-head on any encounter — each side uses their best logged clear.
        </div>
      </div>

      {/* --- self-service picker --- */}
      {/* Card's backdrop-filter makes it a stacking context, so lift the whole
          picker above the result card below or the search dropdown is hidden
          behind it. */}
      <Card style={{ padding: '16px 20px', marginBottom: 20, position: 'relative', zIndex: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
          <PlayerField label="Player A" value={accountA} onPick={(v) => setField('accountA', v)} accent="var(--gold)" />
          <PlayerField label="Player B" value={accountB} onPick={(v) => setField('accountB', v)} accent="var(--blue)" />
          <div style={{ minWidth: 220 }}>
            <FieldLabel>Encounter</FieldLabel>
            <Select
              ariaLabel="Encounter"
              value={fightName ? `${fightName}|${isCm}` : ''}
              onChange={setEncounter}
              placeholder="Pick an encounter"
              options={encounterOptions}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        {byLog && (
          <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-50)', marginTop: 10 }}>
            Comparing two specific parses. Pick an encounter above to switch to each player's best clear instead.
          </div>
        )}
      </Card>

      {!ready && (
        <Card style={{ padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ font: '700 15px var(--font-sans)', marginBottom: 8 }}>Pick two players and an encounter</div>
          <div style={{ font: '500 12.5px var(--font-sans)', color: 'var(--text-55)', lineHeight: 1.6 }}>
            Start typing an account name above, or launch a comparison from the Compare buttons on a Leaderboard row or a Fight Report's Squad tab.
          </div>
        </Card>
      )}

      {ready && loading && <LoadingState label="Loading comparison…" />}
      {ready && error && <ErrorState message={error} />}
      {ready && !loading && !error && data && <Comparison data={data} />}
    </div>
  );
}

function Comparison({ data }: { data: CompareResult }) {
  const { playerA, playerB, rows, boss } = data;
  const missing = !playerA || !playerB;
  const bg = boss.fightName ? bossBgPath(boss.fightName) : null;

  const scoreA = rows.filter((r) => r.winner === 'a').length;
  const scoreB = rows.filter((r) => r.winner === 'b').length;

  return (
    <Card style={{ overflow: 'hidden' }}>
      {/* Boss art header with both players */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {bg && (
          <>
            <ArtImg src={bg} style={{ opacity: 0.4, objectPosition: 'center 30%' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-surface) 55%, transparent), color-mix(in srgb, var(--color-surface) 92%, transparent))' }} />
          </>
        )}
        <div style={{ position: 'relative', padding: '18px 22px' }}>
          <div style={{ textAlign: 'center', font: '700 11px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 14 }}>
            {boss.fightName || 'Comparison'}{boss.isCm ? ' · CM' : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
            <PlayerHead parse={playerA} align="right" score={scoreA} />
            <div style={{ font: '800 13px var(--font-sans)', color: 'var(--text-55)' }}>VS</div>
            <PlayerHead parse={playerB} align="left" score={scoreB} />
          </div>
        </div>
      </div>

      {missing ? (
        <div style={{ padding: '28px 24px', textAlign: 'center', font: '500 13px var(--font-sans)', color: 'var(--text-60)' }}>
          {!playerA && !playerB
            ? 'Neither player has a logged clear for this encounter yet.'
            : `${!playerA ? 'Player A' : 'Player B'} has no logged clear for this encounter yet.`}
        </div>
      ) : (
        <div style={{ padding: '18px 24px 26px' }}>
          {rows.map((row) => {
            const worse = Math.min(row.a, row.b);
            const delta = worse > 0 && row.a !== row.b ? Math.round((Math.abs(row.a - row.b) / worse) * 100) : 0;
            return (
              <div key={row.label} style={{ marginBottom: 15 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
                  {/* A value (right-aligned toward center) */}
                  <div style={{ textAlign: 'right', font: `${row.winner === 'a' ? 800 : 600} 13px var(--font-mono)`, color: row.winner === 'a' ? 'var(--gold)' : 'var(--text-60)' }}>
                    {fmtValue(row.label, row.a)}
                  </div>
                  <div style={{ font: '700 10px var(--font-sans)', letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--text-55)', minWidth: 92, textAlign: 'center' }}>
                    {row.label}
                  </div>
                  <div style={{ textAlign: 'left', font: `${row.winner === 'b' ? 800 : 600} 13px var(--font-mono)`, color: row.winner === 'b' ? 'var(--blue)' : 'var(--text-60)' }}>
                    {fmtValue(row.label, row.b)}
                  </div>
                </div>
                {/* mirrored bars */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center', marginTop: 4 }}>
                  <div style={{ height: 7, background: 'var(--bg-chip)', borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: `${row.aPct}%`, height: '100%', borderRadius: 'var(--radius-md)', background: 'var(--gold)', opacity: row.winner === 'a' ? 1 : 0.4 }} />
                  </div>
                  <div style={{ minWidth: 92, textAlign: 'center', font: '700 9.5px var(--font-mono)', color: delta ? (row.winner === 'a' ? 'var(--gold)' : 'var(--blue)') : 'var(--text-45)' }}>
                    {delta ? `${row.winner === 'a' ? '◀' : '▶'} ${delta}%` : '—'}
                  </div>
                  <div style={{ height: 7, background: 'var(--bg-chip)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <div style={{ width: `${row.bPct}%`, height: '100%', borderRadius: 'var(--radius-md)', background: 'var(--blue)', opacity: row.winner === 'b' ? 1 : 0.4 }} />
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 6, font: '600 11.5px var(--font-sans)', color: 'var(--text-55)' }}>
            <Link to={`/logs/${playerA.logId}`} style={{ color: 'var(--gold)' }}>Player A's log</Link>
            <span>·</span>
            <Link to={`/logs/${playerB.logId}`} style={{ color: 'var(--blue)' }}>Player B's log</Link>
          </div>
        </div>
      )}
    </Card>
  );
}

function PlayerHead({ parse, align, score }: { parse: CompareParse | null; align: 'left' | 'right'; score: number }) {
  if (!parse) {
    return (
      <div style={{ textAlign: align === 'right' ? 'right' : 'left', font: '600 13px var(--font-sans)', color: 'var(--text-45)' }}>
        No clear
      </div>
    );
  }
  const color = professionColor(parse.profession);
  const items = (
    <>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-md)',
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'color-mix(in srgb, var(--color-surface) 75%, transparent)',
          border: `1px solid ${color}`,
          boxShadow: `0 0 10px ${color}`,
        }}
      >
        <img
          src={professionIconPath(parse.profession, parse.spec !== parse.profession ? parse.spec : null)}
          alt=""
          width={30}
          height={30}
          style={{ objectFit: 'contain' }}
          onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
        />
      </div>
      <div style={{ minWidth: 0, textAlign: align === 'right' ? 'right' : 'left' }}>
        <Link to={`/players/${encodeURIComponent(parse.account)}`} style={{ font: '800 15px var(--font-sans)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {parse.name}
        </Link>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', marginTop: 3 }}>
          <span style={{ font: '600 11px var(--font-sans)', color }}>{parse.spec}</span>
          <ParseBadge pct={parse.parsePct} style={{ height: 17, minWidth: 26, font: '800 10px var(--font-mono)' }} />
        </div>
        <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-45)', marginTop: 4 }}>
          {score} {score === 1 ? 'win' : 'wins'}
        </div>
      </div>
    </>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexDirection: align === 'right' ? 'row-reverse' : 'row', minWidth: 0 }}>
      {items}
    </div>
  );
}

// --- Account search combobox ----------------------------------------------

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ font: '600 10px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 5 }}>
      {children}
    </div>
  );
}

function PlayerField({ label, value, onPick, accent }: { label: string; value: string; onPick: (account: string) => void; accent: string }) {
  const [text, setText] = useState(value);
  const [results, setResults] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setText(value); }, [value]);

  // Debounced search while the field has focus.
  useEffect(() => {
    if (!active) return;
    const q = text.trim();
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await api.search(q);
        setResults(res.players.map((p) => p.account).slice(0, 8));
        setOpen(true);
      } catch { /* ignore search errors — the field still works by typing */ }
    }, 220);
    return () => clearTimeout(t);
  }, [text, active]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function choose(account: string) {
    setText(account);
    setOpen(false);
    onPick(account);
  }

  return (
    <div ref={boxRef} style={{ position: 'relative', minWidth: 0 }}>
      <FieldLabel>{label}</FieldLabel>
      <input
        value={text}
        placeholder="Account name…"
        onFocus={() => { setActive(true); if (results.length) setOpen(true); }}
        onChange={(e) => { setText(e.target.value); setActive(true); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); choose(text.trim()); }
          if (e.key === 'Escape') setOpen(false);
        }}
        style={{
          width: '100%',
          minHeight: 38,
          padding: '7px 11px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-input)',
          border: `1px solid ${value ? accent : 'var(--border)'}`,
          color: 'var(--text)',
          font: '600 12.5px var(--font-sans)',
          boxSizing: 'border-box',
        }}
      />
      {open && results.length > 0 && (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 40, marginTop: 4,
            background: 'var(--color-surface)', border: '1px solid color-mix(in srgb, var(--color-text) 16%, transparent)', borderRadius: 'var(--radius-md)',
            boxShadow: '0 18px 40px -14px rgba(0,0,0,.7)', overflow: 'hidden', maxHeight: 260, overflowY: 'auto', padding: 4,
          }}
        >
          {results.map((acc) => (
            <div
              key={acc}
              role="option"
              aria-selected={acc === value}
              onMouseDown={(e) => { e.preventDefault(); choose(acc); }}
              style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', cursor: 'pointer', font: '600 12.5px var(--font-sans)', color: 'var(--text-85)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-text) 8%, transparent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {acc}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
