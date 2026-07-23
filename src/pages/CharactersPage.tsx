import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, ApiError, type CharacterData } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { toast } from '../lib/toast';
import { professionColor, professionIconPath, specBgPath } from '../data/gw2-data';
import { buildSpec, CAT, PROF, PROF_BY_API, PROF_ORDER, toBuildEntry, type BuildEntry } from '../data/builds';
import { ArtImg, Card, GoldButton } from '../components/atoms';
import { Select, type SelectOption } from '../components/Select';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';

type FilterTab = 'all' | 'assigned';

export default function CharactersPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [reloadNonce, setReloadNonce] = useState(0);
  const refetch = () => setReloadNonce((n) => n + 1);
  const { data: characters, loading, error } = useApiQuery(() => api.myCharacters(), [reloadNonce]);
  const { data: buildsRaw } = useApiQuery(() => api.builds(), []);
  const builds = useMemo(() => (buildsRaw ?? []).map(toBuildEntry), [buildsRaw]);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newProf, setNewProf] = useState<string>(PROF_ORDER.map((k) => PROF[k].name)[0]);
  const [addError, setAddError] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (!characters) return characters;
    if (filterTab === 'all') return characters;
    return characters.filter((c) => c.templates.some((t) => t.assignedBuildId));
  }, [characters, filterTab]);

  if (userLoading) return <LoadingState label="Loading…" />;
  if (!user) return <Navigate to="/login" replace />;

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const res = await api.syncCharacters();
      setSyncResult(`Synced ${res.count} character${res.count === 1 ? '' : 's'} from your GW2 account.`);
      refetch();
    } catch (err) {
      setSyncError(err instanceof ApiError ? err.message : 'Failed to sync characters');
    } finally {
      setSyncing(false);
    }
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    setAddError(null);
    try {
      await api.addCharacter(newName.trim(), newProf);
      toast.success(`Added ${newName.trim()}`);
      setNewName('');
      setAdding(false);
      refetch();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to add character';
      setAddError(message);
      toast.error(message);
    }
  }

  async function handleDelete(name: string, id: string) {
    try {
      await api.deleteCharacter(id);
      toast.success(`Deleted ${name}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete character');
    }
  }

  const linked = Boolean(user.gw2AccountName);

  return (
    <div>
      {/* Underline tab strip (design: All Characters / Assigned) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, borderBottom: '1px solid color-mix(in srgb, var(--color-text) 11%, transparent)', marginBottom: 20 }}>
        {(
          [
            { key: 'all', label: 'All Characters' },
            { key: 'assigned', label: 'Assigned' },
          ] as { key: FilterTab; label: string }[]
        ).map((t) => {
          const active = filterTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setFilterTab(t.key)}
              style={{
                padding: '12px 2px',
                marginBottom: -1,
                font: '700 13.5px var(--font-sans)',
                borderBottom: `2px solid ${active ? 'var(--text)' : 'transparent'}`,
                color: active ? 'var(--text)' : 'var(--text-55)',
                borderRadius: 0,
                transition: 'color .15s ease, border-color .15s ease',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Status + action pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {linked ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              font: '700 12.5px var(--font-sans)',
              padding: '9px 16px',
              borderRadius: 0,
              background: 'var(--text)',
              color: 'var(--color-surface)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 2l7 4v6c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-4z" stroke="var(--color-surface)" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            API Key Connected
          </div>
        ) : (
          <Link
            to="/account"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              font: '700 12.5px var(--font-sans)',
              padding: '9px 16px',
              borderRadius: 0,
              background: 'var(--bad-dim)',
              color: 'var(--bad)',
              border: '1px solid color-mix(in oklab, var(--bad) 30%, transparent)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 2l7 4v6c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6l7-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            API Key Not Linked — link it →
          </Link>
        )}
        <button className="u-btn-ghost" onClick={handleSync} disabled={syncing} style={pillBtnStyle}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3M4 4v5h5M20 20v-5h-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {syncing ? 'Syncing…' : 'Sync Characters'}
        </button>
        <button className="u-btn-ghost" onClick={() => setAdding((a) => !a)} style={pillBtnStyle}>
          + Add Manually
        </button>
      </div>

      {syncError && <div style={{ marginBottom: 16, font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{syncError}</div>}
      {syncResult && <div style={{ marginBottom: 16, font: '500 12px var(--font-sans)', color: 'var(--good)' }}>{syncResult}</div>}

      {adding && (
        <Card style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input placeholder="Character name" value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} />
          <Select
            ariaLabel="Profession"
            value={newProf}
            onChange={setNewProf}
            style={{ minWidth: 190 }}
            panelWidth={220}
            options={PROF_ORDER.map((k) => ({
              value: PROF[k].name,
              label: PROF[k].name,
              icon: professionIconPath(PROF[k].name),
              accent: professionColor(PROF[k].name),
            }))}
          />
          <GoldButton onClick={handleAdd}>Add</GoldButton>
          {addError && <span style={{ font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{addError}</span>}
        </Card>
      )}

      {loading && <LoadingState label="Loading characters…" />}
      {error && <ErrorState message={error} />}
      {!loading && !error && visible?.length === 0 && (
        <EmptyState>
          {filterTab === 'assigned'
            ? 'No characters with an assigned build yet — pick a build tab and hit “+ Assign”.'
            : 'No characters yet — sync from GW2 or add one manually.'}
        </EmptyState>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible?.map((c) => (
          <CharacterRow key={c.id} character={c} builds={builds} onChanged={refetch} onDelete={() => handleDelete(c.name, c.id)} />
        ))}
      </div>
    </div>
  );
}

// Build options for the assign dropdown: a spec icon (derived from the
// build name) + the build name, with category · weapons as the sublabel,
// plus a leading "clear" row so a tab can be unassigned from the menu too.
function buildSelectOptions(builds: BuildEntry[]): SelectOption[] {
  return [
    { value: '', label: 'No build', icon: '' },
    ...builds.map((b): SelectOption => {
      const professionName = PROF[b.p]?.name ?? b.p;
      const spec = buildSpec(b);
      return {
        value: b.id,
        label: b.name,
        sublabel: `${CAT[b.cat].label} · ${b.weapons}`,
        icon: professionIconPath(professionName, spec),
        accent: professionColor(professionName),
      };
    }),
  ];
}

function CharacterRow({
  character,
  builds,
  onChanged,
  onDelete,
}: {
  character: CharacterData;
  builds: BuildEntry[];
  onChanged: () => void;
  onDelete: () => void;
}) {
  const color = professionColor(character.profession);
  const profKey = PROF_BY_API[character.profession];
  const templates = character.templates;
  const activeTemplate = templates.find((t) => t.isActive) ?? templates[0];
  const [selectedTab, setSelectedTab] = useState<number | null>(activeTemplate?.tab ?? null);
  const [assignOpen, setAssignOpen] = useState(false);

  const selected = templates.find((t) => t.tab === selectedTab) ?? activeTemplate;
  const spec = selected?.spec && selected.spec !== character.profession ? selected.spec : null;
  const assigned = selected?.assignedBuildId ? builds.find((b) => b.id === selected.assignedBuildId) : undefined;
  const options = profKey ? builds.filter((b) => b.p === profKey) : [];

  async function handleAssign(buildId: string | null) {
    if (!selected) return;
    try {
      await api.assignCharacterBuild(character.id, selected.tab, buildId);
      setAssignOpen(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update assignment');
    }
  }

  return (
    <div
      className="u-card-link"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        // Wrapping keeps the row usable on phones: identity stays on the
        // first line, build chips and the assignment area flow below it
        // instead of getting clipped off the card's right edge.
        flexWrap: 'wrap',
        gap: 16,
        padding: '14px 20px',
        borderRadius: 0,
        border: '1px solid color-mix(in srgb, var(--color-text) 9%, transparent)',
        boxShadow: '0 10px 26px -18px rgba(0,0,0,.6)',
      }}
    >
      {/* Spec banner art under a profession-color wash */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: 0, overflow: 'hidden' }} aria-hidden>
        <ArtImg src={specBgPath(character.profession, spec)} style={{ opacity: 0.5 }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, color-mix(in oklab, ${color} 55%, transparent) 0%, color-mix(in srgb, var(--color-surface) 55%, transparent) 45%, color-mix(in srgb, var(--color-surface) 96%, transparent) 70%)` }} />
        <div style={{ position: 'absolute', inset: 0, background: 'color-mix(in srgb, var(--color-surface) 45%, transparent)' }} />
      </div>

      {/* Glowing profession/spec emblem */}
      <div
        style={{
          position: 'relative',
          width: 40,
          height: 40,
          borderRadius: '50%',
          flex: 'none',
          border: `2px solid ${color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'color-mix(in srgb, var(--color-surface) 80%, transparent)',
          boxShadow: `0 0 10px ${color}`,
        }}
      >
        <img src={professionIconPath(character.profession, spec)} alt={character.profession} style={{ width: 22, height: 22, objectFit: 'contain' }} />
      </div>

      {/* Identity */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, flex: 'none', maxWidth: 420, overflow: 'hidden' }}>
        <div style={{ font: '700 14px var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={character.name}>
          {character.name}
        </div>
        {spec && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, font: '700 11px var(--font-sans)', color, whiteSpace: 'nowrap', flex: 'none' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill={color} aria-hidden>
              <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
            </svg>
            {spec}
          </div>
        )}
      </div>

      {/* Build-tab chips */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, overflowX: 'auto' }}>
        <div style={{ font: '700 10.5px var(--font-sans)', letterSpacing: '.5px', color: 'var(--text-55)', flex: 'none' }}>BUILDS</div>
        {templates.map((t) => {
          const isSelected = t.tab === selected?.tab;
          return (
            <button
              key={t.tab}
              onClick={() => {
                setSelectedTab(t.tab);
                setAssignOpen(false);
              }}
              title={`${t.name ?? `Build ${t.tab}`}${t.spec ? ` — ${t.spec}` : ''}${t.isActive ? ' (active in game)' : ''}`}
              className={isSelected ? undefined : 'u-chip'}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                font: '700 11px var(--font-sans)',
                flex: 'none',
                ...(isSelected
                  ? { background: 'var(--text)', color: 'var(--color-surface)', boxShadow: '0 0 0 1px color-mix(in srgb, var(--color-text) 40%, transparent)' }
                  : { background: 'color-mix(in srgb, var(--color-text) 8%, transparent)', color: 'var(--text-65)', border: '1px solid color-mix(in srgb, var(--color-text) 14%, transparent)' }),
              }}
            >
              {t.tab}
            </button>
          );
        })}
        {templates.length === 0 && <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-50)' }}>No build tabs</div>}
      </div>

      {/* Assignment area for the selected tab. flexWrap + maxWidth 100% let
          it drop to its own line and shrink on phones. */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, flex: 'none', flexWrap: 'wrap', maxWidth: '100%' }}>
        {assignOpen && selected ? (
          <>
            <Select
              autoFocus
              ariaLabel={`Assign a build to tab ${selected.tab}`}
              value={selected.assignedBuildId ?? ''}
              onChange={(v) => handleAssign(v || null)}
              placeholder={`— assign a build to tab ${selected.tab} —`}
              options={buildSelectOptions(options)}
              panelWidth={360}
              style={{ minWidth: 260 }}
            />
            <button onClick={() => setAssignOpen(false)} title="Cancel" style={{ font: '600 13px var(--font-sans)', color: 'var(--text-55)', padding: '0 2px' }}>
              ×
            </button>
          </>
        ) : assigned && selected ? (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 14px',
                borderRadius: 0,
                background: 'color-mix(in srgb, var(--color-text) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-text) 12%, transparent)',
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 0,
                  background: color,
                  color: 'var(--color-surface)',
                  font: '800 11px var(--font-sans)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 'none',
                }}
              >
                {selected.tab}
              </div>
              <div>
                <div style={{ font: '700 12.5px var(--font-sans)', whiteSpace: 'nowrap' }}>{assigned.name}</div>
                <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--text-58)', whiteSpace: 'nowrap' }}>
                  {CAT[assigned.cat].label} · {assigned.weapons} ·{' '}
                  <a href={assigned.url} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)', fontWeight: 600 }}>
                    Guide ↗
                  </a>
                </div>
              </div>
              <button onClick={() => handleAssign(null)} title={`Clear assignment for tab ${selected.tab}`} style={{ font: '600 13px var(--font-sans)', color: 'var(--text-55)', padding: '0 2px' }}>
                ×
              </button>
            </div>
            <button className="u-chip" onClick={() => setAssignOpen(true)} style={assignBtnStyle}>
              Change
            </button>
          </>
        ) : (
          <>
            <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-50)', whiteSpace: 'nowrap' }}>No build assigned</div>
            {selected && (
              <button className="u-chip" onClick={() => setAssignOpen(true)} style={assignBtnStyle}>
                + Assign
              </button>
            )}
          </>
        )}
        {character.source === 'manual' && (
          <button
            onClick={onDelete}
            title={`Delete ${character.name}`}
            className="u-btn-ghost"
            style={{ font: '600 11.5px var(--font-sans)', color: 'var(--bad)', padding: '8px 12px', borderRadius: 0, border: '1px solid color-mix(in srgb, var(--color-text) 14%, transparent)', whiteSpace: 'nowrap' }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

const pillBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  font: '600 12.5px var(--font-sans)',
  padding: '9px 16px',
  borderRadius: 0,
  background: 'color-mix(in srgb, var(--color-text) 8%, transparent)',
  color: 'var(--text-85)',
  border: '1px solid color-mix(in srgb, var(--color-text) 12%, transparent)',
} as const;

const assignBtnStyle = {
  font: '700 12px var(--font-sans)',
  padding: '9px 16px',
  borderRadius: 0,
  background: 'color-mix(in srgb, var(--color-text) 11%, transparent)',
  color: 'var(--text-92)',
  border: '1px solid color-mix(in srgb, var(--color-text) 14%, transparent)',
  whiteSpace: 'nowrap',
} as const;

const inputStyle = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontSize: 12.5,
  padding: '8px 12px',
  borderRadius: 0,
  fontFamily: 'var(--font-sans)',
} as const;
