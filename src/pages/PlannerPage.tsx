import { useEffect, useState } from 'react';
import { api, ApiError, type CompositionDetail, type CompositionSlotData } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { PROFESSIONS, professionColor, professionIconPath } from '../data/gw2-data';
import { Card, GoldButton, ProfDot } from '../components/atoms';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';

const SUBGROUPS = [1, 2];
const SLOTS_PER_SUBGROUP = 5;

export default function PlannerPage() {
  const { user } = useCurrentUser();
  const { data: guilds, loading: guildsLoading } = useApiQuery(() => api.guilds(), []);
  const [guildTag, setGuildTag] = useState<string | null>(null);
  const [compositionId, setCompositionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFightName, setNewFightName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (!guildTag && guilds && guilds.length > 0) setGuildTag(guilds[0].tag);
  }, [guilds, guildTag]);

  const { data: compositions, loading: compsLoading } = useApiQuery(
    () => (guildTag ? api.compositions(guildTag) : Promise.resolve([])),
    [guildTag, reloadNonce],
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
    if (!guildTag || !newName.trim()) return;
    setCreateError(null);
    try {
      const res = await api.createComposition(guildTag, newName.trim(), newFightName.trim() || null);
      setNewName('');
      setNewFightName('');
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

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: '800 22px var(--font-sans)', marginBottom: 6 }}>Raid Composition Planner</div>
          <div style={{ font: '400 13px var(--font-sans)', color: 'var(--text-62)', maxWidth: 560, lineHeight: 1.5 }}>
            Build and save squad comps per encounter. Assign roles and builds to each subgroup slot, then share the
            plan with your guild.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select value={guildTag ?? ''} onChange={(e) => { setGuildTag(e.target.value); setCompositionId(null); }} style={selectStyle}>
            {guilds?.map((g) => (
              <option key={g.tag} value={g.tag}>
                [{g.tag}] {g.name}
              </option>
            ))}
          </select>
          <select value={compositionId ?? ''} onChange={(e) => setCompositionId(e.target.value || null)} style={selectStyle} disabled={!compositions?.length}>
            {compositions?.length ? (
              compositions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            ) : (
              <option value="">No compositions yet</option>
            )}
          </select>
          {user && guildTag && <GoldButton onClick={() => setCreating((c) => !c)}>New</GoldButton>}
          {composition && user && (
            <button onClick={handleDelete} style={{ font: '600 12px var(--font-sans)', padding: '9px 14px', borderRadius: 10, background: 'var(--bg-chip)', color: 'var(--bad)', border: '1px solid var(--border)' }}>
              Delete
            </button>
          )}
        </div>
      </div>

      {creating && (
        <Card style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder="Composition name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="Fight name (optional)"
            value={newFightName}
            onChange={(e) => setNewFightName(e.target.value)}
            style={inputStyle}
          />
          <GoldButton onClick={handleCreate}>Create</GoldButton>
          {createError && <span style={{ font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{createError}</span>}
        </Card>
      )}

      {guildsLoading && <LoadingState label="Loading guilds…" />}
      {!guildsLoading && guilds?.length === 0 && (
        <EmptyState>No guilds yet. Guilds appear here once a member links their GW2 account with guild sync.</EmptyState>
      )}
      {!compsLoading && guildTag && compositions?.length === 0 && !creating && (
        <EmptyState>No compositions saved for this guild yet.{user ? ' Click "New" to create one.' : ''}</EmptyState>
      )}
      {compLoading && <LoadingState label="Loading composition…" />}
      {compError && <ErrorState message={compError} />}

      {composition && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {SUBGROUPS.map((sub) => (
            <SubgroupCard key={sub} subgroup={sub} composition={composition} canEdit={Boolean(user)} onChanged={() => setReloadNonce((n) => n + 1)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubgroupCard({
  subgroup,
  composition,
  canEdit,
  onChanged,
}: {
  subgroup: number;
  composition: CompositionDetail;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const slotByIndex = new Map(composition.slots.filter((s) => s.subgroup === subgroup).map((s) => [s.slotIndex, s]));

  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px', font: '700 11.5px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-60)', borderBottom: '1px solid var(--border-soft)' }}>
        Subgroup {subgroup}
      </div>
      {Array.from({ length: SLOTS_PER_SUBGROUP }, (_, i) => (
        <SlotRow
          key={i}
          compositionId={composition.id}
          subgroup={subgroup}
          slotIndex={i}
          slot={slotByIndex.get(i) ?? null}
          canEdit={canEdit}
          onChanged={onChanged}
        />
      ))}
    </Card>
  );
}

function SlotRow({
  compositionId,
  subgroup,
  slotIndex,
  slot,
  canEdit,
  onChanged,
}: {
  compositionId: string;
  subgroup: number;
  slotIndex: number;
  slot: CompositionSlotData | null;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(slot?.role ?? '');
  const [profession, setProfession] = useState(slot?.profession ?? Object.keys(PROFESSIONS)[0]);
  const [spec, setSpec] = useState(slot?.spec ?? '');
  const [buildName, setBuildName] = useState(slot?.buildName ?? '');
  const [buildDetails, setBuildDetails] = useState(slot?.buildDetails ?? '');
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    if (!role.trim() || !profession.trim()) return;
    setSaveError(null);
    try {
      await api.setCompositionSlot(compositionId, subgroup, slotIndex, {
        role: role.trim(),
        profession: profession.trim(),
        spec: spec.trim() || null,
        buildName: buildName.trim() || null,
        buildDetails: buildDetails.trim() || null,
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
    const specs = PROFESSIONS[profession]?.specs ?? [];
    return (
      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-faint)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Role (e.g. Power DPS)" value={role} onChange={(e) => setRole(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
          <select
            value={profession}
            onChange={(e) => {
              setProfession(e.target.value);
              setSpec('');
            }}
            style={selectStyle}
          >
            {Object.keys(PROFESSIONS).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select value={spec} onChange={(e) => setSpec(e.target.value)} style={selectStyle}>
            <option value="">Core</option>
            {specs.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Build name (optional)" value={buildName} onChange={(e) => setBuildName(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
          <input placeholder="Weapons / details (optional)" value={buildDetails} onChange={(e) => setBuildDetails(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <GoldButton onClick={handleSave}>Save</GoldButton>
          <button onClick={() => setEditing(false)} style={ghostBtnStyle}>Cancel</button>
          {slot && <button onClick={handleClear} style={{ ...ghostBtnStyle, color: 'var(--bad)' }}>Clear slot</button>}
          {saveError && <span style={{ font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{saveError}</span>}
        </div>
      </div>
    );
  }

  if (slot) {
    return (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: '1px solid var(--border-faint)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${professionColor(slot.profession)} 0%, transparent 55%)`, opacity: 0.16 }} />
        <img src={professionIconPath(slot.profession, slot.spec)} style={{ position: 'relative', width: 34, height: 34, objectFit: 'contain', borderRadius: 8, background: 'oklch(0.14 0.01 250 / 60%)', padding: 3, flex: 'none' }} />
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, font: '700 9.5px var(--font-sans)', letterSpacing: '.4px', textTransform: 'uppercase', color: professionColor(slot.profession) }}>
            <ProfDot color={professionColor(slot.profession)} size={6} />
            {slot.role} · {slot.spec ?? slot.profession}
          </div>
          <div style={{ font: '600 13px var(--font-sans)' }}>{slot.buildName ?? slot.spec ?? slot.profession}</div>
          {slot.buildDetails && <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>{slot.buildDetails}</div>}
        </div>
        {canEdit && (
          <button
            onClick={() => setEditing(true)}
            style={{ position: 'relative', font: '700 11px var(--font-sans)', padding: '6px 13px', borderRadius: 8, background: 'var(--bg-chip)', color: 'var(--text-85)', border: '1px solid var(--border)', flex: 'none' }}
          >
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
        <button
          onClick={() => setEditing(true)}
          style={{ font: '700 11px var(--font-sans)', padding: '6px 13px', borderRadius: 8, background: 'var(--gold-dim)', color: 'var(--gold)', border: '1px solid var(--gold-dim)', flex: 'none' }}
        >
          PICK
        </button>
      )}
    </div>
  );
}

const selectStyle = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  color: 'var(--text-92)',
  fontSize: 12.5,
  fontWeight: 600,
  padding: '9px 12px',
  borderRadius: 10,
  fontFamily: 'var(--font-sans)',
} as const;

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
