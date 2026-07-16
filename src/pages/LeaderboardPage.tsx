import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useComparePicker } from '../hooks/useComparePicker';
import { professionColor, professionIconPath } from '../data/gw2-data';
import { Card, PageHeader, ParseBadge, ParseLegend, ProfDot, SquadRoleBadge } from '../components/atoms';
import { CompareCheckbox, ComparePickerBar } from '../components/ComparePickerBar';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';

const RANK_COLORS = ['var(--gold)', 'oklch(0.7 0.03 85)', 'oklch(0.7 0.03 85)'];

export default function LeaderboardPage() {
  const [params, setParams] = useSearchParams();
  const { data: encounters, loading: encountersLoading } = useApiQuery(() => api.encounters(), []);

  const encounterKey = params.get('encounter');
  const isCm = params.get('cm') !== 'false';
  const role = params.get('role') === 'condi' ? 'condi' : 'power';

  useEffect(() => {
    if (!encounterKey && encounters && encounters.length > 0) {
      const next = new URLSearchParams(params);
      next.set('encounter', encounters[0].fightName);
      next.set('cm', String(encounters[0].isCm));
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounters, encounterKey]);

  const selected = useMemo(
    () => (encounterKey ? { fightName: encounterKey, isCm } : null),
    [encounterKey, isCm],
  );

  const { data: leaderboard, loading: leaderboardLoading, error } = useApiQuery(
    () => (selected ? api.leaderboard(selected.fightName, selected.isCm, { role }) : Promise.resolve([])),
    [selected, role],
  );

  function selectEncounter(fightName: string, cm: boolean) {
    const next = new URLSearchParams(params);
    next.set('encounter', fightName);
    next.set('cm', String(cm));
    setParams(next);
  }

  function selectRole(r: 'power' | 'condi') {
    const next = new URLSearchParams(params);
    next.set('role', r);
    setParams(next);
  }

  const picker = useComparePicker();
  useEffect(() => {
    picker.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encounterKey, isCm]);

  return (
    <div>
      <PageHeader
        title="Leaderboards"
        subtitle="Top squad-verified DPS across the guild, ranked by encounter and role"
        actions={
          <>
          <select
            value={selected ? `${selected.fightName}|${selected.isCm}` : ''}
            onChange={(e) => {
              const [fightName, cm] = e.target.value.split('|');
              selectEncounter(fightName, cm === 'true');
            }}
            style={selectStyle}
          >
            {encounters?.map((e) => (
              <option key={`${e.fightName}-${e.isCm}`} value={`${e.fightName}|${e.isCm}`}>
                {e.fightName}
                {e.isCm ? ' CM' : ''}
              </option>
            ))}
          </select>
          <select value={role} onChange={(e) => selectRole(e.target.value === 'condi' ? 'condi' : 'power')} style={selectStyle}>
            <option value="power">Power DPS</option>
            <option value="condi">Condition DPS</option>
          </select>
          </>
        }
      />

      {encountersLoading && <LoadingState label="Loading encounters…" />}
      {!encountersLoading && encounters?.length === 0 && (
        <EmptyState>No logs have been uploaded yet — leaderboards will appear once the first log comes in.</EmptyState>
      )}

      <div style={{ marginBottom: 14 }}>
        <ParseLegend />
      </div>

      {leaderboardLoading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {leaderboard && leaderboard.length > 0 && (
        <Card style={{ overflow: 'hidden' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '24px 32px 2fr 1fr 1fr 0.7fr 1fr',
              gap: 8,
              padding: '12px 20px',
              font: '700 10.5px var(--font-sans)',
              textTransform: 'uppercase',
              letterSpacing: '.5px',
              color: 'var(--text-55)',
              borderBottom: '1px solid var(--border-soft)',
            }}
          >
            <div />
            <div>Rank</div>
            <div>Player</div>
            <div>Role</div>
            <div>DPS</div>
            <div>Parse</div>
            <div>Date</div>
          </div>
          {leaderboard.map((row, i) => {
            const candidate = { logId: row.logId, account: row.account, label: row.name };
            return (
              <div
                key={row.logId + row.account}
                className="u-row"
                style={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateColumns: '24px 32px 2fr 1fr 1fr 0.7fr 1fr',
                  gap: 8,
                  alignItems: 'center',
                  padding: '12px 20px',
                  borderBottom: i === leaderboard.length - 1 ? 'none' : '1px solid var(--border-faint)',
                }}
              >
                <CompareCheckbox checked={picker.isSelected(candidate)} onToggle={() => picker.toggle(candidate)} label={row.name} />
                <div style={{ font: '800 15px var(--font-sans)', color: i < 3 ? RANK_COLORS[i] : 'var(--text-55)' }}>#{row.rank}</div>
                <Link to={`/players/${encodeURIComponent(row.account)}`} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <img src={professionIconPath(row.profession, row.spec)} alt={row.spec} style={{ width: 28, height: 28, objectFit: 'contain', flex: 'none' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ font: '600 13px var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</div>
                      <SquadRoleBadge squadRole={row.squadRole} />
                    </div>
                    <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--text-55)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <ProfDot color={professionColor(row.profession)} size={6} /> {row.spec}
                    </div>
                  </div>
                </Link>
                <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-70)' }}>{row.role === 'power' ? 'Power DPS' : 'Condition DPS'}</div>
                <div style={{ font: '700 13.5px var(--font-mono)', color: 'var(--gold)' }}>{row.dps.toLocaleString()}</div>
                <div><ParseBadge pct={row.pct} /></div>
                <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>{new Date(row.date).toLocaleDateString()}</div>
              </div>
            );
          })}
        </Card>
      )}
      <ComparePickerBar selected={picker.selected} onClear={picker.clear} />

      {leaderboard && leaderboard.length === 0 && !leaderboardLoading && selected && (
        <EmptyState>No {role === 'power' ? 'power' : 'condition'} DPS parses logged for this encounter yet.</EmptyState>
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
