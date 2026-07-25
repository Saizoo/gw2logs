import { useMemo, useState } from 'react';
import { api, ApiError, type CharacterData, type CharBuildTab, type CharEquipmentTab, type GearItem, type GearRef, type ProfileCharacter } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { professionColor, professionIconPath, specBgPath } from '../data/gw2-data';
import { buildSpec, PROF, PROF_BY_API, toBuildEntry, type BuildEntry } from '../data/builds';
import { Card, GoldButton } from './atoms';
import { Select } from './Select';
import { toast } from '../lib/toast';

// GW2 item-rarity accent colours (border on each gear slot).
const RARITY_COLOR: Record<string, string> = {
  Junk: '#AAAAAA', Basic: '#c9c9c9', Fine: '#62A4DA', Masterwork: '#1a9306',
  Rare: '#fcd00b', Exotic: '#ffa405', Ascended: '#fb3e8d', Legendary: '#9d5cff',
};

// Hero-panel slot layout: armour, then trinkets, then the two weapon sets.
const GEAR_SLOTS: { key: string; label: string }[] = [
  { key: 'Helm', label: 'Head' }, { key: 'Shoulders', label: 'Shoulders' }, { key: 'Coat', label: 'Chest' },
  { key: 'Gloves', label: 'Hands' }, { key: 'Leggings', label: 'Legs' }, { key: 'Boots', label: 'Feet' },
  { key: 'Backpack', label: 'Back' }, { key: 'Amulet', label: 'Amulet' },
  { key: 'Ring1', label: 'Ring' }, { key: 'Ring2', label: 'Ring' },
  { key: 'Accessory1', label: 'Accessory' }, { key: 'Accessory2', label: 'Accessory' },
  { key: 'WeaponA1', label: 'Main' }, { key: 'WeaponA2', label: 'Off' },
  { key: 'WeaponB1', label: 'Main II' }, { key: 'WeaponB2', label: 'Off II' },
];

function iconTitle(ref: GearItem): string {
  const extras = [...ref.upgrades, ...ref.infusions].map((u) => u.name).filter(Boolean);
  return [ref.name, ...extras].filter(Boolean).join(' · ');
}

// A single gear slot: item icon with a rarity-coloured border, tiny upgrade/
// infusion pips in the corner, empty placeholder when the slot is unfilled.
function GearSlot({ item, label }: { item: GearItem | undefined; label: string }) {
  const border = item?.rarity ? RARITY_COLOR[item.rarity] ?? 'var(--border-soft)' : 'var(--border)';
  return (
    <div
      title={item ? iconTitle(item) : label}
      style={{ position: 'relative', width: 46, height: 46, borderRadius: 8, border: `1.5px solid ${border}`, background: 'var(--color-neutral-800)', overflow: 'hidden', display: 'grid', placeItems: 'center' }}
    >
      {item?.icon ? (
        <img src={item.icon} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
      ) : (
        <span style={{ font: '600 8px var(--font-sans)', color: 'var(--text-45)', textTransform: 'uppercase', letterSpacing: '.03em', textAlign: 'center', padding: 2 }}>{label}</span>
      )}
      {item && (item.upgrades.length > 0 || item.infusions.length > 0) && (
        <span style={{ position: 'absolute', bottom: 2, right: 2, display: 'flex', gap: 1 }}>
          {[...item.upgrades, ...item.infusions].slice(0, 2).map((u, i) =>
            u.icon ? <img key={i} src={u.icon} alt="" title={u.name} style={{ width: 13, height: 13, borderRadius: 3, border: '1px solid rgba(0,0,0,.6)' }} loading="lazy" /> : null,
          )}
        </span>
      )}
    </div>
  );
}

// A small round icon for skills/traits.
function SkillIcon({ ref, size = 34, round }: { ref: GearRef | null; size?: number; round?: boolean }) {
  return (
    <div
      title={ref?.name ?? undefined}
      style={{ width: size, height: size, borderRadius: round ? '50%' : 7, border: '1px solid var(--border-soft)', background: 'var(--color-neutral-800)', overflow: 'hidden', flex: 'none', display: 'grid', placeItems: 'center' }}
    >
      {ref?.icon && <img src={ref.icon} alt={ref.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />}
    </div>
  );
}

function BuildPanel({ tab }: { tab: CharBuildTab }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ font: '700 10px var(--font-sans)', letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--text-50)', marginBottom: 8 }}>Specializations</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tab.specializations.length === 0 && <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-50)' }}>No traits</div>}
          {tab.specializations.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <SkillIcon ref={s} size={30} round />
              <span style={{ font: '650 11.5px var(--font-sans)', color: s.elite ? 'var(--gold)' : 'var(--text-70)', width: 96, flex: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
              <div style={{ display: 'flex', gap: 5 }}>
                {s.traits.map((t, j) => <SkillIcon key={j} ref={t} size={26} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ font: '700 10px var(--font-sans)', letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--text-50)', marginBottom: 8 }}>Skills</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <SkillIcon ref={tab.skills.heal} />
          {tab.skills.utilities.map((u, i) => <SkillIcon key={i} ref={u} />)}
          <SkillIcon ref={tab.skills.elite} />
        </div>
      </div>
    </div>
  );
}

function HeroCard({
  char,
  owner,
  builds,
  onChanged,
}: {
  char: ProfileCharacter | CharacterData;
  owner: boolean;
  builds: BuildEntry[];
  onChanged: () => void;
}) {
  const buildTabs = char.buildTabs ?? [];
  const equipTabs = char.equipmentTabs ?? [];
  const defaultTab = buildTabs.find((t) => t.isActive)?.tab ?? buildTabs[0]?.tab ?? char.activeTab;
  const [tabNum, setTabNum] = useState<number>(defaultTab);
  const build = buildTabs.find((t) => t.tab === tabNum) ?? buildTabs[0];
  const equip: CharEquipmentTab | undefined = equipTabs.find((t) => t.tab === tabNum) ?? equipTabs.find((t) => t.isActive) ?? equipTabs[0];
  const spec = build?.spec ?? null;
  const color = professionColor(char.profession);
  const itemsBySlot = useMemo(() => new Map((equip?.items ?? []).map((it) => [it.slot, it])), [equip]);

  const cd = owner ? (char as CharacterData) : null;
  const hidden = cd?.hidden ?? false;

  // Owner: build assignment for the active-looking template (matched by tab).
  const profKey = PROF_BY_API[char.profession];
  const assignTemplate = cd?.templates.find((t) => t.tab === tabNum) ?? cd?.templates.find((t) => t.isActive) ?? cd?.templates[0];
  const buildOptions = profKey ? builds.filter((b) => b.p === profKey) : [];

  async function assign(buildId: string | null) {
    if (!cd || !assignTemplate) return;
    try {
      await api.assignCharacterBuild(cd.id, assignTemplate.tab, buildId);
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to assign build');
    }
  }
  async function toggleHidden() {
    if (!cd) return;
    try {
      await api.setCharacterHidden(cd.id, !hidden);
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update visibility');
    }
  }
  async function remove() {
    if (!cd || !window.confirm(`Remove ${cd.name} from your roster?`)) return;
    try {
      await api.deleteCharacter(cd.id);
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete character');
    }
  }

  return (
    <Card style={{ overflow: 'hidden', opacity: hidden ? 0.6 : 1 }}>
      {/* Banner header: spec art wash + profession emblem + identity. */}
      <div style={{ position: 'relative', padding: '16px 18px', borderBottom: '1px solid var(--border)', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0 }}>
          <img src={specBgPath(char.profession, spec)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.28 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, color-mix(in srgb, ${color} 40%, transparent), transparent 60%), linear-gradient(0deg, var(--bg-card), transparent 130%)` }} />
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', flex: 'none', border: `2px solid ${color}`, boxShadow: `0 0 12px ${color}`, background: 'color-mix(in srgb, var(--color-surface) 80%, transparent)', display: 'grid', placeItems: 'center' }}>
            <img src={professionIconPath(char.profession, spec)} alt={char.profession} style={{ width: 26, height: 26, objectFit: 'contain' }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ font: '800 17px var(--font-sans)', letterSpacing: '-.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{char.name}</span>
              {hidden && <span style={{ font: '700 9px var(--font-sans)', textTransform: 'uppercase', letterSpacing: '.05em', padding: '2px 6px', borderRadius: 999, color: 'var(--text-55)', border: '1px solid var(--border-soft)' }}>Hidden</span>}
            </div>
            <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-60)', marginTop: 2 }}>
              {char.level ? `Level ${char.level} ` : ''}{char.race ?? ''}{spec ? <> · <span style={{ color, fontWeight: 700 }}>{spec}</span></> : ''}
            </div>
          </div>
          {owner && (
            <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
              <button type="button" onClick={toggleHidden} className="u-btn-ghost" title={hidden ? 'Show on profile' : 'Hide from profile'} style={{ font: '600 11px var(--font-sans)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-soft)', color: 'var(--text-70)', background: 'none' }}>
                {hidden ? 'Show' : 'Hide'}
              </button>
              <button type="button" onClick={remove} className="u-btn-ghost" title="Remove character" style={{ font: '600 11px var(--font-sans)', padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid color-mix(in srgb, var(--bad) 35%, transparent)', color: 'var(--bad)', background: 'none' }}>
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Build-tab switcher */}
        {buildTabs.length > 1 && (
          <div style={{ position: 'relative', display: 'flex', gap: 5, marginTop: 12 }}>
            {buildTabs.map((t) => {
              const on = t.tab === tabNum;
              return (
                <button key={t.tab} type="button" onClick={() => setTabNum(t.tab)} title={t.name ?? `Build ${t.tab}`} style={{ font: '700 11px var(--font-mono)', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', border: '1px solid var(--border-soft)', background: on ? 'var(--gold)' : 'transparent', color: on ? 'var(--gold-fg)' : 'var(--text-60)' }}>
                  {t.tab}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Body: gear grid + build panel. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 18, padding: 18 }} className="hero-body">
        <div>
          <div style={{ font: '700 10px var(--font-sans)', letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--text-50)', marginBottom: 8 }}>Equipment</div>
          {equip && equip.items.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 46px))', gap: 7 }}>
              {GEAR_SLOTS.map((s) => <GearSlot key={s.key} item={itemsBySlot.get(s.key)} label={s.label} />)}
            </div>
          ) : (
            <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-50)' }}>No equipment data — re-sync with a key that has the “builds” permission.</div>
          )}
        </div>
        {build ? <BuildPanel tab={build} /> : <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-50)' }}>No build data.</div>}
      </div>

      {/* Owner: build assignment (feeds group roster coverage). */}
      {owner && assignTemplate && buildOptions.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
          <span style={{ font: '600 11px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', flex: 'none' }}>Assigned build</span>
          <Select
            ariaLabel="Assign build"
            value={assignTemplate.assignedBuildId ?? ''}
            onChange={(v) => assign(v || null)}
            options={[{ value: '', label: 'None' }, ...buildOptions.map((b) => ({ value: b.id, label: `${b.name} · ${buildSpec(b)}` }))]}
            style={{ minWidth: 200 }}
          />
        </div>
      )}
    </Card>
  );
}

// The profile's Characters tab: a gallery of hero-panel cards. Owners see all
// their synced characters (including hidden ones) plus management — Sync, add,
// hide/show, delete and per-character build assignment. Visitors see the
// owner's visible characters, read-only.
export function ProfileCharacters({ account, isOwner, publicCharacters }: { account: string; isOwner: boolean; publicCharacters: ProfileCharacter[] }) {
  const [nonce, setNonce] = useState(0);
  const { data: mine } = useApiQuery(() => (isOwner ? api.myCharacters() : Promise.resolve(null)), [isOwner, nonce]);
  const { data: buildsRaw } = useApiQuery(() => (isOwner ? api.builds() : Promise.resolve([])), [isOwner]);
  const builds = useMemo(() => (buildsRaw ?? []).map(toBuildEntry), [buildsRaw]);
  const [syncing, setSyncing] = useState(false);
  const [newName, setNewName] = useState('');
  const [newProf, setNewProf] = useState('Guardian');

  const refetch = () => setNonce((n) => n + 1);
  const chars: (ProfileCharacter | CharacterData)[] = isOwner ? mine ?? [] : publicCharacters;

  async function sync() {
    setSyncing(true);
    try {
      const res = await api.syncCharacters();
      toast.success(`Synced ${res.count} character${res.count === 1 ? '' : 's'} from the GW2 API`);
      refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to sync characters');
    } finally {
      setSyncing(false);
    }
  }
  async function add() {
    if (!newName.trim()) return;
    try {
      await api.addCharacter(newName.trim(), newProf);
      setNewName('');
      refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to add character');
    }
  }

  if (chars.length === 0 && !isOwner) {
    return (
      <Card style={{ padding: '28px 22px', textAlign: 'center' }}>
        <div style={{ font: '750 15px var(--font-sans)' }}>No characters shared</div>
        <div style={{ font: '400 12.5px/1.6 var(--font-sans)', color: 'var(--text-55)', marginTop: 6 }}>{account.split('.')[0]} hasn’t synced any characters to their profile yet.</div>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {isOwner && (
        <Card style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ font: '750 14px var(--font-sans)' }}>Your characters</div>
            <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-55)', marginTop: 2 }}>Sync pulls gear + builds from the GW2 API. Hidden characters stay off your public profile.</div>
          </div>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Add manually…" style={{ padding: '8px 11px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', font: '400 12px var(--font-sans)', color: 'var(--text)', width: 150 }} />
          <Select ariaLabel="Profession" value={newProf} onChange={setNewProf} options={Object.values(PROF).map((p) => ({ value: p.name, label: p.name }))} style={{ minWidth: 140 }} />
          <button type="button" onClick={add} disabled={!newName.trim()} className="u-btn-ghost" style={{ font: '650 12.5px var(--font-sans)', padding: '9px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-soft)', color: 'var(--text-80)', background: 'none' }}>Add</button>
          <GoldButton onClick={sync} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync from GW2'}</GoldButton>
        </Card>
      )}

      {chars.length === 0 ? (
        <Card style={{ padding: '28px 22px', textAlign: 'center' }}>
          <div style={{ font: '750 15px var(--font-sans)' }}>No characters yet</div>
          <div style={{ font: '400 12.5px/1.6 var(--font-sans)', color: 'var(--text-55)', marginTop: 6 }}>Hit “Sync from GW2” to pull in your roster with full gear and builds.</div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(430px, 1fr))', gap: 16 }}>
          {chars.map((c) => <HeroCard key={c.id} char={c} owner={isOwner} builds={builds} onChanged={refetch} />)}
        </div>
      )}
    </div>
  );
}
