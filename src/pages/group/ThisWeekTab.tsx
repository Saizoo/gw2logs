import { useMemo, useState } from 'react';
import { api, ApiError, type GroupDetail, type GroupWeekPlan, type WeekPlanComposition, type WeekPlanItem } from '../../lib/api';
import { useApiQuery } from '../../hooks/useApiQuery';
import { toast } from '../../lib/toast';
import { ArtImg, Card, GoldButton } from '../../components/atoms';
import { Select } from '../../components/Select';
import { EXPANSIONS } from '../../data/encounters';
import { bossBgPathLoose, professionColor, professionIconPath, specBgPath } from '../../data/gw2-data';
import { ghostBtnStyle, inputStyle, smallBtnStyle } from './shared';

// This Week tab: the leader's agenda for the current reset week, organized
// by raid night. Each day gets its own card holding that night's fights;
// fights are picked from the raid-planner encounter catalog and can carry
// a squad composition built in the planner — members open this tab to see
// what's on the menu each night and which role they're playing.

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

// Reset week runs Monday → Sunday (GW2 reset is Monday 07:30 UTC), so day
// cards always render in that order, with unpinned fights last.
const WEEK_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

// "Thu" + weekStart Monday → "Jul 16": the concrete date this weekday
// lands on within the reset week.
function dayDateLabel(weekStart: string, day: string): string {
  const idx = WEEK_ORDER.indexOf(day);
  if (idx < 0) return '';
  const [y, m, d] = weekStart.split('-').map(Number);
  return new Date(y, m - 1, d + idx).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Today's weekday on the group's calendar, for the "Tonight" badge.
function groupToday(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date());
  }
}

interface DraftItem {
  encounterName: string;
  compositionId: string | null;
  note: string;
}

interface DraftDay {
  day: string | null;
  fights: DraftItem[];
}

function sortDayGroups<T extends { day: string | null }>(groups: T[]): T[] {
  return [...groups].sort((a, b) => {
    const ai = a.day === null ? WEEK_ORDER.length : WEEK_ORDER.indexOf(a.day);
    const bi = b.day === null ? WEEK_ORDER.length : WEEK_ORDER.indexOf(b.day);
    return ai - bi;
  });
}

export default function ThisWeekTab({ group, groupId }: { group: GroupDetail; groupId: string }) {
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

  const dayGroups = sortDayGroups(
    [...plan.items.reduce((acc, item) => {
      const key = item.day ?? '';
      acc.set(key, [...(acc.get(key) ?? []), item]);
      return acc;
    }, new Map<string, WeekPlanItem[]>())].map(([key, items]) => ({ day: key || null, items })),
  );
  const today = groupToday(group.resolvedTimezone);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: '700 13.5px var(--font-sans)' }}>This Week's Raid Plan</div>
          <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-55)', marginTop: 3 }}>
            Reset week of {resetLabel} · {plan.items.length} fight{plan.items.length === 1 ? '' : 's'} across {dayGroups.length} night{dayGroups.length === 1 ? '' : 's'}
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
          raidDays={group.raidDays}
          weekStart={plan.weekStart}
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
              ? 'Pick a raid night, add the fights for it, and attach squad compositions from the raid planner.'
              : "The group leader hasn't planned this week's fights yet — check back later."}
          </div>
        </Card>
      ) : (
        dayGroups.map(({ day, items }) => (
          <DayCard key={day ?? 'any'} day={day} items={items} weekStart={plan.weekStart} isTonight={day !== null && day === today} />
        ))
      )}
    </div>
  );
}

// ---- Read view -----------------------------------------------------------

function DayCard({ day, items, weekStart, isTonight }: { day: string | null; items: WeekPlanItem[]; weekStart: string; isTonight: boolean }) {
  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 22px', borderBottom: '1px solid var(--border-soft)', background: 'oklch(1 0 0 / 2.5%)', flexWrap: 'wrap' }}>
        <div style={{ font: '800 15px var(--font-sans)', letterSpacing: '-.2px' }}>
          {day ? DAY_FULL[day] : 'Anytime this week'}
        </div>
        {day && (
          <div style={{ font: '500 11.5px var(--font-sans)', color: 'var(--text-55)' }}>{dayDateLabel(weekStart, day)}</div>
        )}
        {isTonight && (
          <span style={{ font: '700 10px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--gold)', background: 'oklch(0.78 0.14 85 / 15%)', border: '1px solid oklch(0.78 0.14 85 / 35%)', padding: '3px 9px', borderRadius: 12 }}>
            Tonight
          </span>
        )}
        <div style={{ marginLeft: 'auto', font: '500 11.5px var(--font-sans)', color: 'var(--text-50)' }}>
          {items.length} fight{items.length === 1 ? '' : 's'}
        </div>
      </div>
      {items.map((item, i) => (
        <PlannedFight key={item.id} item={item} index={i} />
      ))}
    </Card>
  );
}

function PlannedFight({ item, index }: { item: WeekPlanItem; index: number }) {
  const info = CATALOG_BY_NAME.get(item.encounterName);
  const art = bossBgPathLoose(item.encounterName);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div style={{ borderTop: index > 0 ? '1px solid var(--border-soft)' : undefined }}>
      <div style={{ position: 'relative', padding: '15px 22px', overflow: 'hidden' }}>
        {art && (
          <>
            <ArtImg src={art} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', opacity: 0.3 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, var(--bg-card) 0%, oklch(0 0 0 / 25%) 60%, oklch(0 0 0 / 10%) 100%)' }} />
          </>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ font: '800 12px var(--font-mono, monospace)', color: 'var(--gold)', opacity: 0.9 }}>{String(index + 1).padStart(2, '0')}</span>
          <div>
            <div style={{ font: '800 16px var(--font-sans)', letterSpacing: '-.2px' }}>{item.encounterName}</div>
            {info && <div style={{ font: '500 10.5px var(--font-sans)', color: 'var(--text-60)', marginTop: 2 }}>{info.wing}</div>}
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
        <div style={{ padding: '10px 22px', borderTop: '1px solid var(--border-faint)', font: '400 12.5px var(--font-sans)', color: 'var(--gold)', fontStyle: 'italic' }}>
          “{item.note}”
        </div>
      )}

      {guideOpen && info && (
        <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border-faint)' }}>
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
        <div style={{ padding: '10px 22px 14px', font: '400 12px var(--font-sans)', color: 'var(--text-50)' }}>
          No squad composition attached — the leader can link one from the raid planner.
        </div>
      )}
    </div>
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
      <div style={{ padding: '10px 22px 14px', font: '400 12px var(--font-sans)', color: 'var(--text-50)' }}>
        Composition “{composition.name}” has no slots filled yet.
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 22px 16px' }}>
      <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-55)', letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: 10 }}>
        Squad · {composition.name}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: subgroups.length > 1 ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr', gap: 14 }}>
        {subgroups.map(([subgroup, slots]) => (
          <div key={subgroup} style={{ border: '1px solid var(--border-faint)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', background: 'oklch(1 0 0 / 3%)', font: '700 10.5px var(--font-sans)', color: 'var(--text-55)', letterSpacing: '.4px', textTransform: 'uppercase' }}>
              Subgroup {subgroup}
            </div>
            {slots.map((slot) => {
              const color = professionColor(slot.profession);
              return (
              <div key={`${slot.subgroup}-${slot.slotIndex}`} style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderTop: '1px solid var(--border-faint)' }}>
                {/* Spec banner art under a profession-color wash, matching the Characters page rows. */}
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} aria-hidden>
                  <ArtImg src={specBgPath(slot.profession, slot.spec)} style={{ opacity: 0.42 }} />
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, color-mix(in oklab, ${color} 45%, transparent) 0%, oklch(0.15 0.014 250 / 55%) 40%, oklch(0.15 0.014 250 / 94%) 68%)` }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'oklch(0.15 0.014 250 / 40%)' }} />
                </div>
                <img
                  src={professionIconPath(slot.profession, slot.spec)}
                  alt=""
                  width={22}
                  height={22}
                  style={{ position: 'relative', borderRadius: 5, flexShrink: 0 }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div style={{ position: 'relative', minWidth: 0 }}>
                  <div style={{ font: '650 12.5px var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {slot.player ?? slot.characterName ?? 'Open slot'}
                    {slot.player && slot.characterName && (
                      <span style={{ font: '400 11px var(--font-sans)', color: 'var(--text-50)' }}> · {slot.characterName}</span>
                    )}
                  </div>
                  <div style={{ font: '500 10.5px var(--font-sans)', color, marginTop: 1 }}>
                    {slot.role}
                    <span style={{ color: 'var(--text-55)' }}> · {slot.spec ?? slot.profession}{slot.buildName ? ` · ${slot.buildName}` : ''}</span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Leader editor -------------------------------------------------------

function PlanEditor({
  groupId,
  raidDays,
  weekStart,
  initial,
  onDone,
}: {
  groupId: string;
  raidDays: string[];
  weekStart: string;
  initial: GroupWeekPlan;
  onDone: (changed: boolean) => void;
}) {
  const { data: compositions } = useApiQuery(() => api.compositions(groupId), [groupId]);
  const [days, setDays] = useState<DraftDay[]>(() => {
    const byDay = new Map<string, DraftItem[]>();
    for (const item of initial.items) {
      const key = item.day ?? '';
      byDay.set(key, [
        ...(byDay.get(key) ?? []),
        { encounterName: item.encounterName, compositionId: item.composition?.id ?? null, note: item.note ?? '' },
      ]);
    }
    return sortDayGroups([...byDay.entries()].map(([key, fights]) => ({ day: key || null, fights })));
  });
  const [saving, setSaving] = useState(false);

  const totalFights = days.reduce((sum, d) => sum + d.fights.length, 0);
  const usedDays = new Set(days.map((d) => (d.day === null ? 'any' : d.day)));

  const addDay = (day: string | null) =>
    setDays((prev) => sortDayGroups([...prev, { day, fights: [] }]));
  const removeDay = (index: number) => setDays((prev) => prev.filter((_, i) => i !== index));
  const addFight = (dayIndex: number) =>
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex ? { ...d, fights: [...d.fights, { encounterName: CATALOG[0].encs[0].name, compositionId: null, note: '' }] } : d,
      ),
    );
  const updateFight = (dayIndex: number, fightIndex: number, patch: Partial<DraftItem>) =>
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex ? { ...d, fights: d.fights.map((f, j) => (j === fightIndex ? { ...f, ...patch } : f)) } : d,
      ),
    );
  const moveFight = (dayIndex: number, fightIndex: number, delta: -1 | 1) =>
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== dayIndex) return d;
        const target = fightIndex + delta;
        if (target < 0 || target >= d.fights.length) return d;
        const fights = [...d.fights];
        [fights[fightIndex], fights[target]] = [fights[target], fights[fightIndex]];
        return { ...d, fights };
      }),
    );
  const removeFight = (dayIndex: number, fightIndex: number) =>
    setDays((prev) => prev.map((d, i) => (i === dayIndex ? { ...d, fights: d.fights.filter((_, j) => j !== fightIndex) } : d)));

  async function save() {
    setSaving(true);
    try {
      await api.setGroupWeekPlan(
        groupId,
        days.flatMap((d) =>
          d.fights.map((f) => ({
            day: d.day,
            encounterName: f.encounterName,
            compositionId: f.compositionId,
            note: f.note.trim() || null,
          })),
        ),
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {days.map((dayGroup, di) => (
        <Card key={dayGroup.day ?? 'any'} style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderBottom: '1px solid var(--border-soft)', background: 'oklch(1 0 0 / 2.5%)', flexWrap: 'wrap' }}>
            <div style={{ font: '800 14px var(--font-sans)' }}>{dayGroup.day ? DAY_FULL[dayGroup.day] : 'Anytime this week'}</div>
            {dayGroup.day && (
              <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-55)' }}>{dayDateLabel(weekStart, dayGroup.day)}</div>
            )}
            {dayGroup.day && raidDays.includes(dayGroup.day) && (
              <span style={{ font: '600 10px var(--font-sans)', color: 'var(--gold)', letterSpacing: '.4px', textTransform: 'uppercase' }}>Raid night</span>
            )}
            <button
              className="u-btn-ghost"
              style={{ ...smallBtnStyle, color: 'var(--bad)', marginLeft: 'auto' }}
              onClick={() => removeDay(di)}
              title="Remove this day and its fights"
            >
              Remove day
            </button>
          </div>

          {dayGroup.fights.length === 0 && (
            <div style={{ padding: '14px 20px', font: '400 12px var(--font-sans)', color: 'var(--text-50)' }}>
              No fights yet for this night.
            </div>
          )}
          {dayGroup.fights.map((fight, fi) => (
            <div key={fi} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderBottom: '1px solid var(--border-faint)', flexWrap: 'wrap' }}>
              <span style={{ font: '700 11px var(--font-mono, monospace)', color: 'var(--text-50)', width: 20 }}>{fi + 1}.</span>
              <Select
                ariaLabel="Encounter"
                value={fight.encounterName}
                onChange={(v) => updateFight(di, fi, { encounterName: v })}
                options={CATALOG.flatMap((g) =>
                  g.encs.map((enc) => ({ value: enc.name, label: enc.name, group: g.wing })),
                )}
                style={{ minWidth: 190 }}
                panelWidth={260}
              />
              <Select
                ariaLabel="Composition"
                value={fight.compositionId ?? ''}
                onChange={(v) => updateFight(di, fi, { compositionId: v || null })}
                options={[
                  { value: '', label: 'No composition' },
                  ...compsFor(fight.encounterName).map((c) => ({
                    value: c.id,
                    label: `${c.name}${c.fightName ? ` (${c.fightName})` : ''}`,
                  })),
                ]}
                style={{ minWidth: 170 }}
              />
              <input
                value={fight.note}
                onChange={(e) => updateFight(di, fi, { note: e.target.value })}
                placeholder="Note (optional) — e.g. CM attempt, new comp trial"
                maxLength={300}
                style={{ ...inputStyle, flex: 1, minWidth: 160 }}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="u-btn-ghost" style={smallBtnStyle} onClick={() => moveFight(di, fi, -1)} disabled={fi === 0} title="Move up">↑</button>
                <button className="u-btn-ghost" style={smallBtnStyle} onClick={() => moveFight(di, fi, 1)} disabled={fi === dayGroup.fights.length - 1} title="Move down">↓</button>
                <button className="u-btn-ghost" style={{ ...smallBtnStyle, color: 'var(--bad)' }} onClick={() => removeFight(di, fi)} title="Remove fight">✕</button>
              </div>
            </div>
          ))}

          <div style={{ padding: '12px 20px' }}>
            <button
              className="u-btn-ghost"
              style={ghostBtnStyle}
              onClick={() => addFight(di)}
              disabled={totalFights >= 30}
            >
              + Add fight to {dayGroup.day ? DAY_FULL[dayGroup.day] : 'this list'}
            </button>
          </div>
        </Card>
      ))}

      <Card style={{ padding: '14px 20px' }}>
        <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-55)', letterSpacing: '.4px', textTransform: 'uppercase', marginBottom: 10 }}>
          Add a raid night
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {WEEK_ORDER.map((day) => (
            <button
              key={day}
              className="u-chip"
              onClick={() => addDay(day)}
              disabled={usedDays.has(day)}
              title={raidDays.includes(day) ? 'One of your scheduled raid days' : undefined}
              style={{
                padding: '7px 14px',
                borderRadius: 14,
                font: '600 12px var(--font-sans)',
                background: 'oklch(1 0 0 / 4%)',
                color: usedDays.has(day) ? 'var(--text-35)' : raidDays.includes(day) ? 'var(--gold)' : 'var(--text-70)',
                border: `1px solid ${raidDays.includes(day) && !usedDays.has(day) ? 'oklch(0.78 0.14 85 / 35%)' : 'var(--border)'}`,
                cursor: usedDays.has(day) ? 'default' : 'pointer',
                opacity: usedDays.has(day) ? 0.5 : 1,
              }}
            >
              {DAY_FULL[day]}
              {raidDays.includes(day) ? ' ★' : ''}
            </button>
          ))}
          <button
            className="u-chip"
            onClick={() => addDay(null)}
            disabled={usedDays.has('any')}
            style={{
              padding: '7px 14px',
              borderRadius: 14,
              font: '600 12px var(--font-sans)',
              background: 'oklch(1 0 0 / 4%)',
              color: usedDays.has('any') ? 'var(--text-35)' : 'var(--text-70)',
              border: '1px solid var(--border)',
              cursor: usedDays.has('any') ? 'default' : 'pointer',
              opacity: usedDays.has('any') ? 0.5 : 1,
            }}
          >
            Anytime this week
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="u-btn-ghost" style={ghostBtnStyle} onClick={() => onDone(false)} disabled={saving}>Cancel</button>
          <GoldButton onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save plan'}</GoldButton>
        </div>
      </Card>
    </div>
  );
}
