import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api, ApiError, type CharacterData } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { professionColor, professionIconPath } from '../data/gw2-data';
import { CAT, PROF, PROF_BY_API, PROF_ORDER, toBuildEntry, type BuildEntry } from '../data/builds';
import { Card, GoldButton, ProfDot } from '../components/atoms';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';

export default function CharactersPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [reloadNonce, setReloadNonce] = useState(0);
  const refetch = () => setReloadNonce((n) => n + 1);
  const { data: characters, loading, error } = useApiQuery(() => api.myCharacters(), [reloadNonce]);
  const { data: buildsRaw } = useApiQuery(() => api.builds(), []);
  const builds = useMemo(() => (buildsRaw ?? []).map(toBuildEntry), [buildsRaw]);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newProf, setNewProf] = useState<string>(PROF_ORDER.map((k) => PROF[k].name)[0]);
  const [addError, setAddError] = useState<string | null>(null);

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
      setNewName('');
      setAdding(false);
      refetch();
    } catch (err) {
      setAddError(err instanceof ApiError ? err.message : 'Failed to add character');
    }
  }

  async function handleDelete(id: string) {
    await api.deleteCharacter(id);
    refetch();
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ font: '800 22px var(--font-sans)', marginBottom: 6 }}>My Characters</div>
          <div style={{ font: '400 13px var(--font-sans)', color: 'var(--text-62)', maxWidth: 560, lineHeight: 1.5 }}>
            Connect your GW2 account to import your characters and build tabs, or add them manually. Assign each
            build tab to a catalog build so group leaders can pull you into the Raid Planner.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <GoldButton onClick={handleSync}>{syncing ? 'Syncing…' : 'Sync from GW2'}</GoldButton>
          <button onClick={() => setAdding((a) => !a)} style={ghostBtnStyle}>
            Add manually
          </button>
        </div>
      </div>

      {!user.gw2AccountName && (
        <Card style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-80)' }}>
            Link your GW2 API key from the Account page before syncing — it needs the "characters" and "builds"
            permissions.
          </div>
        </Card>
      )}
      {syncError && <div style={{ marginBottom: 16, font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{syncError}</div>}
      {syncResult && <div style={{ marginBottom: 16, font: '500 12px var(--font-sans)', color: 'var(--good)' }}>{syncResult}</div>}

      {adding && (
        <Card style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input placeholder="Character name" value={newName} onChange={(e) => setNewName(e.target.value)} style={inputStyle} />
          <select value={newProf} onChange={(e) => setNewProf(e.target.value)} style={selectStyle}>
            {PROF_ORDER.map((k) => (
              <option key={k} value={PROF[k].name}>
                {PROF[k].name}
              </option>
            ))}
          </select>
          <GoldButton onClick={handleAdd}>Add</GoldButton>
          {addError && <span style={{ font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{addError}</span>}
        </Card>
      )}

      {loading && <LoadingState label="Loading characters…" />}
      {error && <ErrorState message={error} />}
      {!loading && !error && characters?.length === 0 && (
        <EmptyState>No characters yet — sync from GW2 or add one manually.</EmptyState>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {characters?.map((c) => (
          <CharacterCard key={c.id} character={c} builds={builds} onChanged={refetch} onDelete={() => handleDelete(c.id)} />
        ))}
      </div>
    </div>
  );
}

function CharacterCard({
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
  const profKey = PROF_BY_API[character.profession];
  const color = professionColor(character.profession);

  return (
    <Card style={{ overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: '1px solid var(--border-soft)' }}>
        <img src={professionIconPath(character.profession)} style={{ width: 32, height: 32, objectFit: 'contain', flex: 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ font: '700 14px var(--font-sans)' }}>{character.name}</div>
            <span
              style={{
                font: '700 9.5px var(--font-sans)',
                letterSpacing: '.4px',
                textTransform: 'uppercase',
                padding: '2px 7px',
                borderRadius: 5,
                background: character.source === 'gw2' ? 'var(--gold-dim)' : 'var(--bg-chip)',
                color: character.source === 'gw2' ? 'var(--gold)' : 'var(--text-70)',
              }}
            >
              {character.source === 'gw2' ? 'GW2 Synced' : 'Manual'}
            </span>
          </div>
          <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <ProfDot color={color} size={6} /> {character.profession}
            {character.race ? ` · ${character.race}` : ''}
          </div>
        </div>
        {character.source === 'manual' && (
          <button onClick={onDelete} style={{ ...ghostBtnStyle, color: 'var(--bad)' }}>
            Delete
          </button>
        )}
      </div>
      {character.templates.map((t) => (
        <TemplateRow key={t.id} character={character} template={t} profKey={profKey} builds={builds} onChanged={onChanged} />
      ))}
    </Card>
  );
}

function TemplateRow({
  character,
  template,
  profKey,
  builds,
  onChanged,
}: {
  character: CharacterData;
  template: CharacterData['templates'][number];
  profKey: string | undefined;
  builds: BuildEntry[];
  onChanged: () => void;
}) {
  const options = profKey ? builds.filter((b) => b.p === profKey) : [];
  const assigned = template.assignedBuildId ? builds.find((b) => b.id === template.assignedBuildId) : undefined;

  async function handleAssign(buildId: string) {
    await api.assignCharacterBuild(character.id, template.tab, buildId || null);
    onChanged();
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--border-faint)' }}>
      <div style={{ width: 70, flex: 'none' }}>
        <div style={{ font: '700 10px var(--font-sans)', color: 'var(--text-50)', textTransform: 'uppercase' }}>Tab {template.tab}</div>
        {template.isActive && <div style={{ font: '600 9.5px var(--font-sans)', color: 'var(--gold)' }}>Active</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: '600 12.5px var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {template.name ?? `Build ${template.tab}`}
        </div>
        <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>{template.spec ?? 'Core'}</div>
      </div>
      <select value={template.assignedBuildId ?? ''} onChange={(e) => handleAssign(e.target.value)} style={{ ...selectStyle, minWidth: 220 }}>
        <option value="">— assign a build —</option>
        {options.map((b) => (
          <option key={b.id} value={b.id}>
            [{CAT[b.cat].label}] {b.name} — {b.weapons}
          </option>
        ))}
      </select>
      {assigned && (
        <a href={assigned.url} target="_blank" rel="noreferrer" style={{ font: '600 11px var(--font-sans)', color: 'var(--gold)', flex: 'none' }}>
          Guide →
        </a>
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
