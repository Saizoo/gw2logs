import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ApiError, type CompositionDetail, type CompositionSlotData, type RosterCharacter } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { PROF, PROF_ORDER, CAT, buildSpec, toBuildEntry, type BuildEntry } from '../data/builds';
import { Select } from '../components/Select';
import { catalogFor, encounterCategory, findEncounter, DMG_PREF, DMG_VERIFIED, ENC_INFO, type EncounterCategory } from '../data/encounters';
import { COV_BOONS, coverageFor } from '../data/boonCoverage';
import { professionColor, professionIconPath } from '../data/gw2-data';
import { Card, GoldButton, ProfDot } from '../components/atoms';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';

const SUBGROUPS = [1, 2];
const SLOTS_PER_SUBGROUP = 5;

export default function PlannerPage() {
  const { user } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: myGroups, loading: groupsLoading } = useApiQuery(() => (user ? api.myGroups() : Promise.resolve([])), [user]);
  const { data: buildsRaw } = useApiQuery(() => api.builds(), []);
  const builds = useMemo(() => (buildsRaw ?? []).map(toBuildEntry), [buildsRaw]);
  const buildById = useMemo(() => {
    const map = new Map(builds.map((b) => [b.id, b]));
    return (id: string) => map.get(id);
  }, [builds]);
  const groupIdParam = searchParams.get('group');
  const [groupId, setGroupId] = useState<string | null>(groupIdParam);

  useEffect(() => {
    if (!groupId && myGroups && myGroups.length > 0) setGroupId(myGroups[0].id);
  }, [myGroups, groupId]);

  const { data: group } = useApiQuery(() => (groupId ? api.group(groupId) : Promise.resolve(null)), [groupId]);
  const canEdit = group?.canManage ?? false;

  const { data: roster } = useApiQuery(
    () => (groupId && canEdit ? api.groupRoster(groupId) : Promise.resolve([])),
    [groupId, canEdit],
  );

  // --- encounter browser ---
  // Raid vs Fractal is the top-level split — it swaps the whole catalog the
  // expansion/wing/encounter pickers browse.
  const [category, setCategory] = useState<EncounterCategory>(searchParams.get('cat') === 'fractal' ? 'fractal' : 'raid');
  const catalog = catalogFor(category);
  const [expId, setExpId] = useState(searchParams.get('exp') ?? catalog[0].id);
  const expansion = catalog.find((e) => e.id === expId) ?? catalog[0];
  const [wingId, setWingId] = useState(searchParams.get('wing') ?? expansion.wings[0].id);
  const wing = expansion.wings.find((w) => w.id === wingId) ?? expansion.wings[0];
  const [encId, setEncId] = useState(searchParams.get('enc') ?? wing.encs[0].id);
  const found = findEncounter(encId) ?? findEncounter(wing.encs[0].id)!;

  function selectCategory(cat: EncounterCategory) {
    if (cat === category) return;
    const first = catalogFor(cat)[0];
    setCategory(cat);
    setExpId(first.id);
    setWingId(first.wings[0].id);
    setEncId(first.wings[0].encs[0].id);
    updateEncounterParams({ cat, exp: first.id, wing: first.wings[0].id, enc: first.wings[0].encs[0].id });
  }
  function selectExpansion(id: string) {
    const exp = catalog.find((e) => e.id === id)!;
    setExpId(id);
    setWingId(exp.wings[0].id);
    setEncId(exp.wings[0].encs[0].id);
  }
  function selectWing(id: string) {
    const w = expansion.wings.find((x) => x.id === id)!;
    setWingId(id);
    setEncId(w.encs[0].id);
  }

  // --- composition management ---
  const [compositionId, setCompositionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const { data: compositions } = useApiQuery(
    () => (groupId ? api.compositions(groupId) : Promise.resolve([])),
    [groupId, reloadNonce],
  );

  useEffect(() => {
    if (compositions && compositions.length > 0 && !compositions.some((c) => c.id === compositionId)) {
      setCompositionId(compositions[0].id);
    }
    if (compositions && compositions.length === 0) setCompositionId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compositions]);

  const { data: composition, loading: compLoading, error: compError } = useApiQuery(
    () => (compositionId ? api.composition(compositionId) : Promise.resolve(null)),
    [compositionId, reloadNonce],
  );

  async function handleCreate() {
    if (!groupId || !newName.trim()) return;
    setCreateError(null);
    try {
      const res = await api.createComposition(groupId, newName.trim(), found.encounter.name);
      setNewName('');
      setCreating(false);
      setReloadNonce((n) => n + 1);
      setCompositionId(res.id);
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Failed to create composition');
    }
  }

  async function handleDelete() {
    if (!compositionId) return;
    await api.deleteComposition(compositionId);
    setCompositionId(null);
    setReloadNonce((n) => n + 1);
  }

  function updateEncounterParams(next: { cat?: string; exp?: string; wing?: string; enc?: string }) {
    const params = new URLSearchParams(searchParams);
    if (next.cat) params.set('cat', next.cat);
    if (next.exp) params.set('exp', next.exp);
    if (next.wing) params.set('wing', next.wing);
    if (next.enc) params.set('enc', next.enc);
    setSearchParams(params, { replace: true });
  }

  const dmgPref = DMG_PREF[encId];
  const dmgVerified = DMG_VERIFIED[encId];
  const encInfo = ENC_INFO[encId];

  const coverage1 = composition ? coverageFor(composition.slots.filter((s) => s.subgroup === 1).map((s) => (s.buildId ? buildById(s.buildId) : undefined))) : new Set();
  const coverage2 = composition ? coverageFor(composition.slots.filter((s) => s.subgroup === 2).map((s) => (s.buildId ? buildById(s.buildId) : undefined))) : new Set();

  return (
    <div>
      {groupId && (
        <Link
          to={`/groups/${groupId}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 14, font: '600 12.5px var(--font-sans)', color: 'var(--text-60)' }}
        >
          <span aria-hidden>←</span> Back to {group?.name ?? 'group'}
        </Link>
      )}
      <div style={{ marginBottom: 20 }}>
        <div style={{ font: '800 22px var(--font-sans)', marginBottom: 6 }}>Encounter Composition Planner</div>
        <div style={{ font: '400 13px var(--font-sans)', color: 'var(--text-62)', maxWidth: 640, lineHeight: 1.5 }}>
          Browse any raid wing or fractal challenge mode, build a squad from the full community build catalog,
          and pull real characters from your group once you're logged in.
        </div>
      </div>

      {/* --- encounter browser --- */}
      <Card style={{ padding: '16px 18px', marginBottom: 20 }}>
        {/* Raid vs Fractal — the top-level catalog switch. */}
        <div style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 12, background: 'oklch(0.12 0.014 250 / 55%)', border: '1px solid var(--border)', marginBottom: 16 }}>
          {(['raid', 'fractal'] as const).map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                onClick={() => selectCategory(cat)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  font: '700 12px var(--font-sans)',
                  background: active ? 'var(--gold-grad)' : 'transparent',
                  color: active ? 'var(--gold-fg)' : 'var(--text-60)',
                }}
              >
                {cat === 'raid' ? 'Raids' : 'Fractals'}
              </button>
            );
          })}
        </div>
        <div style={{ font: '700 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
          {category === 'fractal' ? 'Tier' : 'Expansion'}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {catalog.map((e) => (
            <button
              key={e.id}
              onClick={() => {
                selectExpansion(e.id);
                updateEncounterParams({ exp: e.id, wing: e.wings[0].id, enc: e.wings[0].encs[0].id });
              }}
              className={e.id === expId ? undefined : "u-chip"} style={pillStyle(e.id === expId)}
            >
              {e.name}
            </button>
          ))}
        </div>
        <div style={{ font: '700 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
          {category === 'fractal' ? 'Fractal' : expansion.strikesOnly ? 'Strike' : 'Wing'}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {expansion.wings.map((w) => (
            <button
              key={w.id}
              onClick={() => {
                selectWing(w.id);
                updateEncounterParams({ wing: w.id, enc: w.encs[0].id });
              }}
              className={w.id === wingId ? undefined : "u-chip"} style={pillStyle(w.id === wingId)}
            >
              {w.name}
            </button>
          ))}
        </div>
        <div style={{ font: '700 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
          Encounter
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {wing.encs.map((e) => (
            <button
              key={e.id}
              onClick={() => {
                setEncId(e.id);
                updateEncounterParams({ enc: e.id });
              }}
              className={e.id === encId ? undefined : "u-chip"} style={pillStyle(e.id === encId)}
            >
              {e.name}
            </button>
          ))}
        </div>
      </Card>

      {/* --- boss info panel --- */}
      <Card style={{ padding: '20px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{ font: '800 20px var(--font-sans)' }}>{found.encounter.name}</div>
          <a href={found.encounter.guide} target="_blank" rel="noreferrer" style={{ font: '600 12px var(--font-sans)', color: 'var(--gold)' }}>
            Guide →
          </a>
        </div>
        <div style={{ font: '400 13px var(--font-sans)', color: 'var(--text-80)', lineHeight: 1.55, marginBottom: 14 }}>{found.encounter.tag}</div>

        {found.encounter.notes.length > 0 && (
          <ul style={{ margin: '0 0 14px', padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {found.encounter.notes.map((n, i) => (
              <li key={i} style={{ font: '400 12.5px var(--font-sans)', color: 'var(--text-70)', lineHeight: 1.5 }}>
                {n}
              </li>
            ))}
          </ul>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {dmgPref && (
            <div
              title={dmgPref.reason}
              style={{
                font: '700 10.5px var(--font-sans)',
                letterSpacing: '.4px',
                padding: '4px 10px',
                borderRadius: 20,
                background: 'var(--bg-chip)',
                color: 'var(--text-85)',
                border: '1px solid var(--border)',
              }}
            >
              {dmgPref.pref === 'power' ? 'POWER PREFERRED' : dmgPref.pref === 'condi' ? 'CONDI PREFERRED' : 'POWER OR CONDI'}
            </div>
          )}
          {dmgVerified && (
            <div
              style={{
                font: '700 10.5px var(--font-sans)',
                letterSpacing: '.4px',
                padding: '4px 10px',
                borderRadius: 20,
                background: 'var(--good-dim)',
                color: 'var(--good)',
                border: '1px solid var(--good)',
              }}
            >
              GUIDE VERIFIED
            </div>
          )}
        </div>
        {dmgPref && <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-58)', marginTop: 8, lineHeight: 1.5 }}>{dmgPref.reason}</div>}
        {dmgVerified && <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-58)', marginTop: 4, lineHeight: 1.5 }}>{dmgVerified}</div>}

        {encInfo?.read && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
            {(encInfo.roles?.length ?? 0) > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ font: '700 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>
                  Special roles
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 18px' }}>
                  {encInfo.roles!.map((r, i) => (
                    <li key={i} style={{ font: '400 12px var(--font-sans)', color: 'var(--text-70)', lineHeight: 1.5 }}>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(encInfo.mast?.length ?? 0) > 0 && (
              <div>
                <div style={{ font: '700 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>
                  Helpful masteries
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 18px' }}>
                  {encInfo.mast!.map((m, i) => (
                    <li key={i} style={{ font: '400 12px var(--font-sans)', color: 'var(--text-70)', lineHeight: 1.5 }}>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* --- group / composition picker --- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <Select
          ariaLabel="Group"
          value={groupId ?? ''}
          onChange={(v) => { setGroupId(v || null); setCompositionId(null); }}
          placeholder="No groups yet"
          style={{ minWidth: 190 }}
          options={(myGroups ?? []).map((g) => ({ value: g.id, label: g.name }))}
        />
        <Select
          ariaLabel="Composition"
          value={compositionId ?? ''}
          onChange={(v) => setCompositionId(v || null)}
          placeholder="No compositions yet"
          disabled={!compositions?.length}
          style={{ minWidth: 190 }}
          options={(compositions ?? []).map((c) => ({ value: c.id, label: c.name }))}
        />
        {canEdit && <GoldButton onClick={() => setCreating((c) => !c)}>New</GoldButton>}
        {composition && canEdit && (
          <button onClick={handleDelete} className="u-btn-ghost" style={ghostBtnStyle}>
            Delete
          </button>
        )}
      </div>

      {creating && (
        <Card style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input placeholder="Composition name" value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} />
          <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-55)' }}>for {found.encounter.name}</div>
          <GoldButton onClick={handleCreate}>Create</GoldButton>
          {createError && <span style={{ font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{createError}</span>}
        </Card>
      )}

      {!user && <EmptyState>Sign in and join a group to build and save squad compositions.</EmptyState>}
      {user && !groupsLoading && myGroups?.length === 0 && (
        <EmptyState>You're not in any groups yet — create or join one from the Groups page.</EmptyState>
      )}
      {groupId && !compLoading && compositions?.length === 0 && !creating && (
        <EmptyState>No compositions saved for this group yet.{canEdit ? ' Click "New" to create one.' : ''}</EmptyState>
      )}
      {compLoading && <LoadingState label="Loading composition…" />}
      {compError && <ErrorState message={compError} />}

      {composition && (
        <>
          {/* Fractals run a single 5-player party, not two raid subgroups. Keyed
              off the composition's own encounter so a fractal comp always shows
              as one Party regardless of the Raids/Fractals browser toggle. */}
          {(() => {
            const isParty = composition.fightName ? encounterCategory(composition.fightName) === 'fractal' : category === 'fractal';
            const groups = isParty ? [1] : SUBGROUPS;
            const covs = isParty ? [coverage1] : [coverage1, coverage2];
            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: isParty ? 'minmax(0, 480px)' : '1fr 1fr', gap: 20, marginBottom: 20 }}>
                  {groups.map((sub) => (
                    <SubgroupCard
                      key={sub}
                      subgroup={sub}
                      label={isParty ? 'Party' : `Subgroup ${sub}`}
                      composition={composition}
                      canEdit={canEdit}
                      roster={roster ?? []}
                      builds={builds}
                      onChanged={() => setReloadNonce((n) => n + 1)}
                    />
                  ))}
                </div>

                <Card style={{ padding: '18px 20px' }}>
                  <div style={{ font: '700 13px var(--font-sans)', marginBottom: 12 }}>Boon Coverage</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isParty ? 'minmax(0, 480px)' : '1fr 1fr', gap: 24 }}>
                    {covs.map((cov, i) => (
                      <div key={i} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-55)', width: '100%', marginBottom: 2 }}>{isParty ? 'Party' : `Subgroup ${i + 1}`}</div>
                  {COV_BOONS.map((b) => {
                    const ok = cov.has(b.k);
                    return (
                      <span
                        key={b.k}
                        title={b.k}
                        style={{
                          font: '700 10px var(--font-sans)',
                          letterSpacing: '.3px',
                          textTransform: 'uppercase',
                          padding: '3px 8px',
                          borderRadius: 20,
                          background: ok ? 'var(--good-dim)' : 'var(--bg-chip)',
                          color: ok ? 'var(--good)' : 'var(--text-50)',
                          opacity: ok || b.core ? 1 : 0.6,
                          border: `1px solid ${ok ? 'var(--good)' : 'var(--border)'}`,
                        }}
                      >
                        {ok ? '✓' : b.core ? '!' : '·'} {b.short}
                      </span>
                    );
                        })}
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
}

function SubgroupCard({
  subgroup,
  label,
  composition,
  canEdit,
  roster,
  builds,
  onChanged,
}: {
  subgroup: number;
  label: string;
  composition: CompositionDetail;
  canEdit: boolean;
  roster: RosterCharacter[];
  builds: BuildEntry[];
  onChanged: () => void;
}) {
  const slotByIndex = new Map(composition.slots.filter((s) => s.subgroup === subgroup).map((s) => [s.slotIndex, s]));

  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', font: '700 11.5px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-60)', borderBottom: '1px solid var(--border-soft)' }}>
        {label}
      </div>
      {Array.from({ length: SLOTS_PER_SUBGROUP }, (_, i) => (
        <SlotRow
          key={i}
          compositionId={composition.id}
          subgroup={subgroup}
          slotIndex={i}
          slot={slotByIndex.get(i) ?? null}
          canEdit={canEdit}
          roster={roster}
          builds={builds}
          onChanged={onChanged}
        />
      ))}
    </Card>
  );
}

type PickTab = 'catalog' | 'character';

function SlotRow({
  compositionId,
  subgroup,
  slotIndex,
  slot,
  canEdit,
  roster,
  builds,
  onChanged,
}: {
  compositionId: string;
  subgroup: number;
  slotIndex: number;
  slot: CompositionSlotData | null;
  canEdit: boolean;
  roster: RosterCharacter[];
  builds: BuildEntry[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<PickTab>('catalog');
  const [profKey, setProfKey] = useState(PROF_ORDER[0]);
  const [buildId, setBuildId] = useState('');
  const [role, setRole] = useState(slot?.role ?? '');
  // A manually typed player name — seeded from the slot's name unless it's
  // filled by a real synced character (whose name we don't let them edit here).
  const [playerName, setPlayerName] = useState(slot && !slot.characterId ? slot.characterName ?? '' : '');
  const [saveError, setSaveError] = useState<string | null>(null);

  const buildById = (id: string) => builds.find((b) => b.id === id);
  const catalogOptions = builds.filter((b) => b.p === profKey);

  async function handleSaveCatalog() {
    const build = buildById(buildId);
    if (!build || !role.trim()) return;
    setSaveError(null);
    try {
      await api.setCompositionSlot(compositionId, subgroup, slotIndex, {
        role: role.trim(),
        profession: PROF[build.p].name,
        buildId: build.id,
        buildName: build.name,
        buildDetails: build.weapons,
        characterName: playerName.trim() || null,
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Failed to save slot');
    }
  }

  async function handlePickCharacter(character: RosterCharacter, template: RosterCharacter['templates'][number]) {
    const build = template.assignedBuildId ? buildById(template.assignedBuildId) : undefined;
    setSaveError(null);
    try {
      await api.setCompositionSlot(compositionId, subgroup, slotIndex, {
        role: build ? CAT[build.cat].label : role.trim() || 'Flex',
        profession: character.profession,
        spec: template.spec,
        buildId: build?.id ?? null,
        buildName: template.name,
        characterId: character.id,
        characterTemplateId: template.id,
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Failed to save slot');
    }
  }

  async function handleClear() {
    await api.clearCompositionSlot(compositionId, subgroup, slotIndex);
    setEditing(false);
    onChanged();
  }

  if (editing) {
    return (
      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-faint)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setTab('catalog')} className={tab === 'catalog' ? undefined : 'u-chip'} style={pillStyle(tab === 'catalog')}>
            Catalog build
          </button>
          <button onClick={() => setTab('character')} className={tab === 'character' ? undefined : 'u-chip'} style={pillStyle(tab === 'character')}>
            Group character ({roster.length})
          </button>
        </div>

        {tab === 'catalog' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input placeholder="Player name (optional)" value={playerName} onChange={(e) => setPlayerName(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
            <input placeholder="Role (e.g. Power DPS)" value={role} onChange={(e) => setRole(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
            <Select
              ariaLabel="Profession"
              value={profKey}
              onChange={(v) => { setProfKey(v as typeof profKey); setBuildId(''); }}
              style={{ minWidth: 170 }}
              panelWidth={210}
              options={PROF_ORDER.map((k) => ({
                value: k,
                label: PROF[k].name,
                icon: professionIconPath(PROF[k].name),
                accent: professionColor(PROF[k].name),
              }))}
            />
            <Select
              ariaLabel="Choose a build"
              value={buildId}
              onChange={setBuildId}
              placeholder="— choose a build —"
              style={{ minWidth: 260 }}
              panelWidth={360}
              options={catalogOptions.map((b) => {
                const professionName = PROF[b.p]?.name ?? b.p;
                const spec = buildSpec(b);
                return {
                  value: b.id,
                  label: b.name,
                  sublabel: `${CAT[b.cat].label} · ${b.weapons}`,
                  icon: professionIconPath(professionName, spec),
                  accent: professionColor(professionName),
                };
              })}
            />
            <GoldButton onClick={handleSaveCatalog}>Save</GoldButton>
          </div>
        )}

        {tab === 'character' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
            {roster.length === 0 && <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-55)' }}>No characters synced by group members yet.</div>}
            {roster.map((c) =>
              c.templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handlePickCharacter(c, t)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
                    background: 'var(--bg-chip)', border: '1px solid var(--border)', textAlign: 'left',
                  }}
                >
                  <img src={professionIconPath(c.profession, t.spec)} alt={t.spec ?? c.profession} style={{ width: 24, height: 24, objectFit: 'contain', flex: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: '600 12px var(--font-sans)' }}>
                      {c.name} <span style={{ color: 'var(--text-55)', fontWeight: 400 }}>({c.owner})</span>
                    </div>
                    <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--text-55)' }}>
                      Tab {t.tab} · {t.spec ?? 'Core'} · {t.name ?? 'unnamed'}
                    </div>
                  </div>
                </button>
              )),
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setEditing(false)} className="u-btn-ghost" style={ghostBtnStyle}>Cancel</button>
          {slot && <button onClick={handleClear} className="u-btn-ghost" style={{ ...ghostBtnStyle, color: 'var(--bad)' }}>Clear slot</button>}
          {saveError && <span style={{ font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{saveError}</span>}
        </div>
      </div>
    );
  }

  if (slot) {
    return (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: '1px solid var(--border-faint)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${professionColor(slot.profession)} 0%, transparent 55%)`, opacity: 0.16 }} />
        <img src={professionIconPath(slot.profession, slot.spec)} alt={slot.spec ?? slot.profession} style={{ position: 'relative', width: 34, height: 34, objectFit: 'contain', borderRadius: 8, background: 'oklch(0.14 0.01 250 / 60%)', padding: 3, flex: 'none' }} />
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, font: '700 9.5px var(--font-sans)', letterSpacing: '.4px', textTransform: 'uppercase', color: professionColor(slot.profession) }}>
            <ProfDot color={professionColor(slot.profession)} size={6} />
            {slot.role} · {slot.spec ?? slot.profession}
          </div>
          <div style={{ font: '600 13px var(--font-sans)' }}>
            {slot.characterName ? `${slot.characterName}${slot.buildName ? ` — ${slot.buildName}` : ''}` : slot.buildName ?? slot.spec ?? slot.profession}
          </div>
          {slot.buildDetails && <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>{slot.buildDetails}</div>}
        </div>
        {canEdit && (
          <button onClick={() => setEditing(true)} className="u-chip" style={{ position: 'relative', font: '700 11px var(--font-sans)', padding: '6px 13px', borderRadius: 8, background: 'var(--bg-chip)', color: 'var(--text-85)', border: '1px solid var(--border)', flex: 'none' }}>
            CHANGE
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: '1px solid var(--border-faint)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px dashed var(--border)', flex: 'none' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: '700 10px var(--font-sans)', letterSpacing: '.4px', textTransform: 'uppercase', color: 'var(--text-50)' }}>Empty Slot</div>
        <div style={{ font: '500 12.5px var(--font-sans)', color: 'var(--text-62)' }}>Choose a build or character</div>
      </div>
      {canEdit && (
        <button onClick={() => setEditing(true)} className="u-chip" style={{ font: '700 11px var(--font-sans)', padding: '6px 13px', borderRadius: 8, background: 'var(--gold-dim)', color: 'var(--gold)', border: '1px solid var(--gold-dim)', flex: 'none' }}>
          PICK
        </button>
      )}
    </div>
  );
}

function pillStyle(active: boolean) {
  return {
    padding: '7px 14px',
    borderRadius: 9,
    font: '600 12px var(--font-sans)',
    background: active ? 'var(--gold-grad)' : 'var(--bg-chip)',
    color: active ? 'var(--gold-fg)' : 'var(--text-65)',
    border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
  } as const;
}

const inputStyle = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontSize: 12.5,
  padding: '8px 12px',
  borderRadius: 8,
  fontFamily: 'var(--font-sans)',
} as const;

const ghostBtnStyle = {
  font: '600 12px var(--font-sans)',
  padding: '9px 14px',
  borderRadius: 10,
  background: 'var(--bg-chip)',
  color: 'var(--text-80)',
  border: '1px solid var(--border)',
} as const;
