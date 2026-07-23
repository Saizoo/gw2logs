import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useComparePicker } from '../hooks/useComparePicker';
import { professionColor, professionIconPath, specBgPath } from '../data/gw2-data';
import { ArtImg, Card, PageHeader, ParseBadge, ParseLegend, ProfDot, ScopeSubNav, SquadRoleBadge } from '../components/atoms';
import { CompareCheckbox, ComparePickerBar } from '../components/ComparePickerBar';
import { Select } from '../components/Select';
import { LoadingState, ErrorState, EmptyState } from '../components/QueryStates';

const RANK_COLORS = ['var(--gold)', 'var(--text-70)', 'var(--text-70)'];

// Rankings: FFLogs-style per-boss ranked DPS. The boss comes from the Raids /
// Fractals catalog menu (?boss=), scoped by challenge mode and damage role.
export default function LeaderboardPage() {
  const [params, setParams] = useSearchParams();
  const boss = params.get('boss') ?? '';
  const isCm = params.get('cm') === 'true';
  const role = params.get('role') === 'condi' ? 'condi' : 'power';
  const squadRoleParam = params.get('squadRole');
  const squadRole =
    squadRoleParam === 'dps' || squadRoleParam === 'boon_dps' || squadRoleParam === 'boon_heal' ? squadRoleParam : 'all';

  // Power/condi is a damage-type split — only meaningful for the DPS boards.
  // On the Boon-DPS and Healer boards, rank everyone in that role regardless
  // of damage type, so a healer board isn't narrowed to "power healers".
  const damageApplies = squadRole === 'all' || squadRole === 'dps';

  const { data: leaderboard, loading, error } = useApiQuery(
    () =>
      boss
        ? api.leaderboard(boss, isCm, {
            role: damageApplies ? role : undefined,
            squadRole: squadRole === 'all' ? undefined : squadRole,
          })
        : Promise.resolve([]),
    [boss, isCm, role, squadRole, damageApplies],
  );

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
  }

  const picker = useComparePicker();
  useEffect(() => {
    picker.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boss, isCm]);

  if (!boss) {
    return (
      <div>
        <PageHeader title="Rankings" subtitle="Top squad-verified DPS, ranked per boss" />
        <EmptyState>Pick a boss from the Raids or Fractals menu to see its rankings.</EmptyState>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${boss}${isCm ? ' CM' : ''}`}
        subtitle="Top squad-verified DPS, ranked by role"
        actions={
          <>
            <Select
              ariaLabel="Mode"
              value={String(isCm)}
              onChange={(v) => setParam('cm', v)}
              options={[
                { value: 'false', label: 'Normal' },
                { value: 'true', label: 'Challenge Mode' },
              ]}
              style={{ minWidth: 160 }}
            />
            <Select
              ariaLabel="Squad role"
              value={squadRole}
              onChange={(v) => setParam('squadRole', v)}
              options={[
                { value: 'all', label: 'All roles' },
                { value: 'dps', label: 'DPS' },
                { value: 'boon_dps', label: 'Boon DPS' },
                { value: 'boon_heal', label: 'Healer' },
              ]}
              style={{ minWidth: 150 }}
            />
            {damageApplies && (
              <Select
                ariaLabel="Damage type"
                value={role}
                onChange={(v) => setParam('role', v === 'condi' ? 'condi' : 'power')}
                options={[
                  { value: 'power', label: 'Power DPS' },
                  { value: 'condi', label: 'Condition DPS' },
                ]}
                style={{ minWidth: 160 }}
              />
            )}
          </>
        }
      />
      <ScopeSubNav boss={boss} />

      <div style={{ marginBottom: 14 }}>
        <ParseLegend />
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}

      {leaderboard && leaderboard.length > 0 && (
        <Card style={{ overflow: 'hidden' }}>
          {/* Wide row grid scrolls inside the card on phones instead of
              overlapping name/badge/DPS columns. */}
          <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 680 }}>
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
            // Hidden-name rows still show their parse, but can't be linked to
            // a profile or picked for compare (both need the real account).
            const candidate = row.account ? { logId: row.logId, account: row.account, label: row.name } : null;
            return (
              <div
                key={`${row.logId}-${i}`}
                className="u-row"
                style={{
                  position: 'relative',
                  isolation: 'isolate',
                  display: 'grid',
                  gridTemplateColumns: '24px 32px 2fr 1fr 1fr 0.7fr 1fr',
                  gap: 8,
                  alignItems: 'center',
                  padding: '12px 20px',
                  borderBottom: i === leaderboard.length - 1 ? 'none' : '1px solid var(--border-faint)',
                  overflow: 'hidden',
                }}
              >
                <ArtImg src={specBgPath(row.profession, row.spec)} style={{ opacity: 0.22, zIndex: -1 }} />
                <div style={{ position: 'absolute', inset: 0, zIndex: -1, background: 'linear-gradient(90deg, color-mix(in srgb, var(--color-surface) 90%, transparent) 0%, color-mix(in srgb, var(--color-surface) 60%, transparent) 55%, color-mix(in srgb, var(--color-surface) 90%, transparent) 100%)' }} />
                {candidate ? (
                  <CompareCheckbox checked={picker.isSelected(candidate)} onToggle={() => picker.toggle(candidate)} label={row.name} />
                ) : (
                  <div />
                )}
                <div style={{ font: '800 15px var(--font-sans)', color: i < 3 ? RANK_COLORS[i] : 'var(--text-55)' }}>#{row.rank}</div>
                {(() => {
                  const inner = (
                    <>
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
                    </>
                  );
                  const style = { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 } as const;
                  return row.account ? (
                    <Link to={`/players/${encodeURIComponent(row.account)}`} style={style}>{inner}</Link>
                  ) : (
                    <div style={style}>{inner}</div>
                  );
                })()}
                <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-70)' }}>{row.role === 'power' ? 'Power DPS' : 'Condition DPS'}</div>
                <div style={{ font: '700 13.5px var(--font-mono)', color: 'var(--gold)' }}>{row.dps.toLocaleString()}</div>
                <div><ParseBadge pct={row.pct} /></div>
                <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>{new Date(row.date).toLocaleDateString()}</div>
              </div>
            );
          })}
          </div>
          </div>
        </Card>
      )}
      <ComparePickerBar selected={picker.selected} onClear={picker.clear} />

      {leaderboard && leaderboard.length === 0 && !loading && (
        <EmptyState>
          No{' '}
          {squadRole === 'boon_heal'
            ? 'healer'
            : squadRole === 'boon_dps'
              ? 'boon DPS'
              : role === 'power'
                ? 'power DPS'
                : 'condition DPS'}{' '}
          parses logged for {boss}
          {isCm ? ' CM' : ''} yet.
        </EmptyState>
      )}
    </div>
  );
}
