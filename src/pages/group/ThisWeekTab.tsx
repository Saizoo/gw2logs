import { useMemo, useState } from 'react';
import { api, ApiError, type GroupWeekPlan, type WeekPlanComposition, type WeekPlanItem } from '../../lib/api';
import { useApiQuery } from '../../hooks/useApiQuery';
import { toast } from '../../lib/toast';
import { ArtImg, Card, GoldButton } from '../../components/atoms';
import { EXPANSIONS } from '../../data/encounters';
import { bossBgPathLoose, professionColor, professionIconPath } from '../../data/gw2-data';
import { ghostBtnStyle, inputStyle, smallBtnStyle } from './shared';

// This Week tab: the leader's agenda for the current reset week. Fights
// are picked from the raid-planner encounter catalog and each one can
// carry a squad composition built in the planner — members open this tab
// to see what's on the menu and which role they're playing.

interface CatalogEncounter {
  name: string;
  wing: string;
  guide: string;
  tag: string;
  notes: string[];
}

// Flattened once — the catalog is static data.
const CATALOG: { wing: string; encs: CatalogEncounter[] }[] = EXPANSIONS.flatMap((exp) =>
  exp.wings.map((wing) => ({
    wing: `${exp.name} — ${wing.name}`,
    encs: wing.encs.map((enc) => ({
      name: enc.name,
      wing: wing.name,
      guide: enc.guide,
      tag: enc.tag,
      notes: enc.notes,
    })),
  })),
);
const CATALOG_BY_NAME = new Map<string, CatalogEncounter>(
  CATALOG.flatMap((g) => g.encs).map((e) => [e.name, e]),
);

interface DraftItem {
  encounterName: string;
  compositionId: string | null;
  note: string;
}

export default function ThisWeekTab({ groupId }: { groupId: string }) {
  const [nonce, setNonce] = useState(0);
  const { data: plan, loading, error } = useApiQuery(() => api.groupWeekPlan(groupId), [groupId, nonce]);
  const [editing, setEditing] = useState(false);

  if (loading) {
    return (
      <Card style={{ padding: '18px 22px' }}>
        <div className="u-skeleton" style={{ height: 14, width: 220, borderRadius: 6 }} />
      </Card>
    );
  }
  if (error) {
    return (
      <Card style={{ padding: '18px 22px', font: '400 12.5px var(--font-sans)', color: 'var(--text-55)' }}>{error}</Card>
    );
  }
  if (!plan) return null;

  const resetLabel = new Date(`${plan.weekStart}T07:30:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: '700 13.5px var(--font-sans)' }}>This Week's Raid Plan</div>
          <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-55)', marginTop: 3 }}>
            Reset week of {resetLabel} · {plan.items.length} fight{plan.items.length === 1 ? '' : 's'} planned
          </div>
        </div>
        {plan.canEdit && !editing && (
          <GoldButton onClick={() => setEditing(true)} style={{ marginLeft: 'auto' }}>
            {plan.items.length > 0 ? 'Edit plan' : 'Plan this week'}
          </GoldButton>
        )}
      </Card>

      {editing && plan.canEdit ? (
        <PlanEditor
          groupId={groupId}
          initial={plan}
          onDone={(changed) => {
            setEditing(false);
            if (changed) setNonce((n) => n + 1);
          }}
        />
      ) : plan.items.length === 0 ? (
        <Card style={{ padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ font: '700 14px var(--font-sans)', marginBottom: 6 }}>Nothing planned yet</div>
          <div style={{ font: '400 12.5px var(--font-sans)', color: 'var(--text-55)' }}>
            {plan.canEdit
              ? 'Pick the fights for this week and attach squad compositions from the raid planner.'
              : "The group leader hasn't planned this week's fights yet — check back later."}
          </div>
        </Card>
      ) : (
        plan.items.map((item, i) => <PlannedFightCard key={item.id} item={item} index={i} />)
      )}
    </div>
  );
}

// ---- Read view -----------------------------------------------------------

function PlannedFightCard({ item, index }: { item: WeekPlanItem; index: number }) {
  const info = CATALOG_BY_NAME.get(item.encounterName);
  const art = bossBgPathLoose(item.encounterName);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ position: 'relative', padding: '18px 22px', borderBottom: '1px solid var(--border-soft)', overflow: 'hidden' }}>
        {art && (
          <>
            <ArtImg src={art} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', opacity: 0.35 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, var(--bg-card) 0%, oklch(0 0 0 / 25%) 60%, oklch(0 0 0 / 10%) 100%)' }} />
          </>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ font: '800 13px var(--font-mono, monospace)', color: 'var(--gold)', opacity: 0.9 }}>{String(index + 1).padStart(2, '0')}</span>
          <div>
            <div style={{ font: '800 17px var(--font-sans)', letterSpacing: '-.2px' }}>{item.encounterName}</div>
            {info && <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-60)', marginTop: 2 }}>{info.wing}</div>}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {info && (
              <button className="u-btn-ghost" style={smallBtnStyle} onClick={() => setGuideOpen((v) => !v)}>
                {guideOpen ? 'Hide guide' : 'Raid guide'}
              </button>
            )}
            {info && (
              <a href={info.guide} target="_blank" rel="noreferrer" className="u-btn-ghost" style={{ ...smallBtnStyle, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                SnowCrows ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {item.note && (
        <div style={{ padding: '12px 22px', borderBottom: '1px solid var(--border-faint)', font: '400 12.5px var(--font-sans)', color: 'var(--gold)', fontStyle: 'italic' }}>
          “{item.note}”
        </div>
      )}

      {guideOpen && info && (
        <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border-faint)' }}>
          <div style={{ font: '400 12.5px/1.6 var(--font-sans)', color: 'var(--text-70)', marginBottom: info.notes.length ? 10 : 0 }}>{info.tag}</div>
          {info.notes.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {info.notes.map((n, i) => (
                <li key={i} style={{ font: '400 12px/1.55 var(--font-sans)', color: 'var(--text-62)' }}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {item.composition ? (
        <CompositionRoster composition={item.composition} />
      ) : (
        <div style={{ padding: '14px 22px', font: '400 12px var(--font-sans)', color: 'var(--text-50)' }}>
          No squad composition attached — the leader can link one from the raid planner.
        </div>
      )}
    </Card>
  );
}

function CompositionRoster({ composition }: { composition: WeekPlanComposition }) {
  const subgroups = useMemo(() => {
    const bySub = new Map<number, WeekPlanComposition['slots']>();
    for (const slot of composition.slots) {
      const list = bySub.get(slot.subgroup) ?? [];
      list.push(slot);
      bySub.set(slot.subgroup, list);
    }
    return [...bySub.entries()].sort((a, b) => a[0] - b[0]);
  }, [composition]);

  if (composition.slots.length === 0) {
    return (
      <div style={{ padding: '14px 22px', font: '400 12px var(--font-sans)', color: 'var(--text-50)' }}>
        Composition “{composition.name}” has no slots filled yet.
      </div>
    );
  }

  return (
    <div style={{ padding: '14px 22px' }}>
      <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-55)', letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: 10 }}>
        Squad · {composition.name}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: subgroups.length > 1 ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr', gap: 14 }}>
        {subgroups.map(([subgroup, slots]) => (
          <div key={subgroup} style={{ border: '1px solid var(--border-faint)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', background: 'oklch(1 0 0 / 3%)', font: '700 10.5px var(--font-sans)', color: 'var(--text-55)', letterSpacing: '.4px', textTransform: 'uppercase' }}>
              Subgroup {subgroup}
            </div>
            {slots.map((slot) => (
              <div key={`${slot.subgroup}-${slot.slotIndex}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderTop: '1px solid var(--border-faint)' }}>
                <img
                  src={professionIconPath(slot.profession, slot.spec)}
                  alt=""
                  width={22}
                  height={22}
                  style={{ borderRadius: 5, flexShrink: 0 }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: '650 12.5px var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {slot.player ?? slot.characterName ?? 'Open slot'}
                    {slot.player && slot.characterName && (
                      <span style={{ font: '400 11px var(--font-sans)', color: 'var(--text-50)' }}> · {slot.characterName}</span>
                    )}
                  </div>
                  <div style={{ font: '500 10.5px var(--font-sans)', color: professionColor(slot.profession), marginTop: 1 }}>
                    {slot.role}
                    <span style={{ color: 'var(--text-55)' }}> · {slot.spec ?? slot.profession}{slot.buildName ? ` · ${slot.buildName}` : ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Leader editor -------------------------------------------------------

function PlanEditor({
  groupId,
  initial,
  onDone,
}: {
  groupId: string;
  initial: GroupWeekPlan;
  onDone: (changed: boolean) => void;
}) {
  const { data: compositions } = useApiQuery(() => api.compositions(groupId), [groupId]);
  const [items, setItems] = useState<DraftItem[]>(
    initial.items.map((item) => ({
      encounterName: item.encounterName,
      compositionId: item.composition?.id ?? null,
      note: item.note ?? '',
    })),
  );
  const [saving, setSaving] = useState(false);

  const update = (index: number, patch: Partial<DraftItem>) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const move = (index: number, delta: -1 | 1) =>
    setItems((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  async function save() {
    setSaving(true);
    try {
      await api.setGroupWeekPlan(
        groupId,
        items.map((item) => ({
          encounterName: item.encounterName,
          compositionId: item.compositionId,
          note: item.note.trim() || null,
        })),
      );
      toast.success('Weekly plan saved');
      onDone(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save plan');
      setSaving(false);
    }
  }

  // Compositions saved against the same fight float to the top of each
  // picker — that's usually the one the leader means.
  const compsFor = (encounterName: string) => {
    const comps = compositions ?? [];
    return [...comps].sort((a, b) => {
      const aMatch = a.fightName === encounterName ? 0 : 1;
      const bMatch = b.fightName === encounterName ? 0 : 1;
      return aMatch - bMatch || a.name.localeCompare(b.name);
    });
  };

  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-soft)', font: '700 13px var(--font-sans)' }}>
        Edit weekly plan
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.length === 0 && (
          <div style={{ padding: '18px 20px', font: '400 12.5px var(--font-sans)', color: 'var(--text-55)' }}>
            No fights yet — add the first one below.
          </div>
        )}
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderBottom: '1px solid var(--border-faint)', flexWrap: 'wrap' }}>
            <span style={{ font: '700 11px var(--font-mono, monospace)', color: 'var(--text-50)', width: 20 }}>{i + 1}.</span>
            <select
              value={item.encounterName}
              onChange={(e) => update(i, { encounterName: e.target.value })}
              style={{ ...inputStyle, minWidth: 190 }}
            >
              {CATALOG.map((g) => (
                <optgroup key={g.wing} label={g.wing}>
                  {g.encs.map((enc) => (
                    <option key={enc.name} value={enc.name}>{enc.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select
              value={item.compositionId ?? ''}
              onChange={(e) => update(i, { compositionId: e.target.value || null })}
              style={{ ...inputStyle, minWidth: 170 }}
            >
              <option value="">No composition</option>
              {compsFor(item.encounterName).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.fightName ? ` (${c.fightName})` : ''}
                </option>
              ))}
            </select>
            <input
              value={item.note}
              onChange={(e) => update(i, { note: e.target.value })}
              placeholder="Note (optional) — e.g. CM attempt, new comp trial"
              maxLength={300}
              style={{ ...inputStyle, flex: 1, minWidth: 160 }}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="u-btn-ghost" style={smallBtnStyle} onClick={() => move(i, -1)} disabled={i === 0} title="Move up">↑</button>
              <button className="u-btn-ghost" style={smallBtnStyle} onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Move down">↓</button>
              <button
                className="u-btn-ghost"
                style={{ ...smallBtnStyle, color: 'var(--bad)' }}
                onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                title="Remove fight"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', flexWrap: 'wrap' }}>
        <button
          className="u-btn-ghost"
          style={ghostBtnStyle}
          onClick={() => setItems((prev) => [...prev, { encounterName: CATALOG[0].encs[0].name, compositionId: null, note: '' }])}
          disabled={items.length >= 30}
        >
          + Add fight
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="u-btn-ghost" style={ghostBtnStyle} onClick={() => onDone(false)} disabled={saving}>Cancel</button>
          <GoldButton onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save plan'}</GoldButton>
        </div>
      </div>
    </Card>
  );
}
