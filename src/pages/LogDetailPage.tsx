import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { heat, eventDotColor, severityColor, severityRank } from '../data/derived';
import { bossBgPath, playerRoleLabel, professionColor, professionIconPath, specBgPath } from '../data/gw2-data';
import { ArtImg, Card, ParseBadge, ParseLegend, ProfDot } from '../components/atoms';
import { api, ApiError, type DpsChartPoint, type GroupSummary, type LogDetail, type LogDetailPlayer } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useComparePicker } from '../hooks/useComparePicker';
import { CompareCheckbox, ComparePickerBar } from '../components/ComparePickerBar';
import { Select } from '../components/Select';
import { LoadingState, ErrorState } from '../components/QueryStates';
import { toast } from '../lib/toast';

// A player's name linking to their profile — unless they hid their name
// (account null), in which case it's plain text with no link (a link would
// leak the real account in its href).
function PlayerLink({ name, account, style, onClick }: { name: string; account: string | null; style?: CSSProperties; onClick?: (e: React.MouseEvent) => void }) {
  if (!account) return <span style={style}>{name}</span>;
  return (
    <Link to={`/players/${encodeURIComponent(account)}`} style={style} onClick={onClick}>
      {name}
    </Link>
  );
}

type Tab = 'Damage' | 'Boons' | 'Mechanics' | 'Timeline';
const TABS: Tab[] = ['Damage', 'Boons', 'Mechanics', 'Timeline'];

const BOON_COLUMNS: { key: string; label: string; weight?: number }[] = [
  { key: 'quickness', label: 'Quick' },
  { key: 'alacrity', label: 'Alac' },
  { key: 'might', label: 'Might', weight: 4 },
  { key: 'fury', label: 'Fury' },
  { key: 'protection', label: 'Prot' },
  { key: 'aegis', label: 'Aegis', weight: 3 },
  { key: 'stability', label: 'Stab' },
];

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export default function LogDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [tab, setTab] = useState<Tab>('Damage');
  const [reloadNonce, setReloadNonce] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const { data: log, loading, error } = useApiQuery(() => api.log(id), [id, reloadNonce]);
  const { data: myGroups } = useApiQuery(() => (user ? api.myGroups() : Promise.resolve([] as GroupSummary[])), [user]);

  if (loading) return <LoadingState label="Loading log…" />;
  if (error) return <ErrorState message={error} />;
  if (!log) return null;

  const totalDeaths = log.players.reduce((s, p) => s + p.deaths, 0);

  async function handleClaim() {
    setClaiming(true);
    try {
      await api.claimLog(id);
      toast.success('Claimed — this log is now attributed to you');
      setReloadNonce((n) => n + 1);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to claim this log');
    } finally {
      setClaiming(false);
    }
  }

  const headerBg = bossBgPath(log.boss);

  return (
    <div>
      {/* Boss banner — full-bleed band (matches the profile design): boss art
          under a teal-tinted scrim spanning the viewport, a breadcrumb, the
          boss identity + result badges, and Share / Claim actions. The summary
          tiles overlap its bottom edge and are clipped at the separator. */}
      <div style={{ position: 'relative', width: '100vw', marginLeft: 'calc(50% - 50vw)', marginTop: -32, marginBottom: 22, overflow: 'hidden', borderBottom: '1px solid var(--border)', background: 'linear-gradient(180deg, color-mix(in srgb, var(--color-accent) 7%, transparent) 0%, transparent 92%)' }}>
        {headerBg && (
          <ArtImg src={headerBg} style={{ opacity: 0.16, maskImage: 'linear-gradient(180deg, #000, transparent 88%)', WebkitMaskImage: 'linear-gradient(180deg, #000, transparent 88%)' }} />
        )}
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(1000px 420px at 82% -30%, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 60%), radial-gradient(760px 460px at 2% 130%, color-mix(in srgb, var(--color-accent-700) 26%, transparent), transparent 60%)' }} />
        <div style={{ position: 'relative', maxWidth: 1440, margin: '0 auto', padding: '20px 32px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, font: '500 12.5px var(--font-sans)', color: 'var(--text-55)' }}>
            <Link to="/" style={{ color: 'inherit' }}>Dashboard</Link>
            <span style={{ color: 'var(--text-45)' }}>/</span>
            <Link to="/raids" style={{ color: 'inherit' }}>Encounters</Link>
            <span style={{ color: 'var(--text-45)' }}>/</span>
            <span style={{ color: 'var(--text-80)' }}>{log.boss}{log.isCm ? ' CM' : ''}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h1 style={{ font: '800 30px var(--font-sans)', letterSpacing: '-.6px', lineHeight: 1.05 }}>{log.boss}</h1>
                <span style={{ font: '800 11.5px var(--font-sans)', letterSpacing: '.03em', padding: '3px 10px', borderRadius: 999, background: log.success ? 'var(--good)' : 'var(--bad)', color: '#08130c' }}>
                  {log.success ? 'KILL' : 'WIPE'}
                </span>
                {log.isCm && <span style={{ font: '700 11px var(--font-sans)', padding: '3px 9px', borderRadius: 999, border: '1px solid color-mix(in srgb, var(--color-accent) 45%, transparent)', color: 'var(--gold)', background: 'var(--gold-dim)' }}>Challenge Mode</span>}
                {log.private && <span style={{ font: '700 10.5px var(--font-sans)', textTransform: 'uppercase', letterSpacing: '.04em', padding: '3px 9px', borderRadius: 999, border: '1px solid var(--border-soft)', color: 'var(--text-65)' }}>Private</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px', marginTop: 11, font: '500 13px var(--font-sans)', color: 'var(--text-60)' }}>
                {log.wing && <span style={{ fontWeight: 700, color: 'var(--text-80)' }}>{log.wing}</span>}
                <span><b style={{ color: 'var(--text-80)' }}>{formatDuration(log.durationMs)}</b> duration</span>
                <span><b style={{ color: 'var(--text-80)' }}>{log.players.length}</b>-player squad</span>
                <span>{new Date(log.date).toLocaleString()}</span>
                <span>{log.uploadedBy ? <>by <b style={{ color: 'var(--text-80)' }}>{log.uploadedBy.username}</b></> : 'uploaded anonymously'}</span>
                {log.group && <Link to={`/groups/${log.group.id}`} style={{ color: 'var(--gold)', fontWeight: 600 }}>{log.group.name}</Link>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 9, marginLeft: 'auto', alignSelf: 'flex-start' }}>
              {log.canClaim && (
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className={claiming ? undefined : 'u-chip'}
                  style={{ font: '650 13.5px var(--font-sans)', padding: '9px 15px', borderRadius: 'var(--radius-md)', background: 'var(--gold-dim)', color: 'var(--gold)', border: '1px solid color-mix(in srgb, var(--color-accent) 45%, transparent)', opacity: claiming ? 0.6 : 1 }}
                >
                  {claiming ? 'Claiming…' : 'Claim this upload'}
                </button>
              )}
              <button
                type="button"
                className="u-btn-ghost"
                onClick={() => { navigator.clipboard?.writeText(window.location.href).then(() => toast.success('Log link copied'), () => toast.error('Could not copy link')); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 15px', borderRadius: 'var(--radius-md)', font: '650 13.5px var(--font-sans)', border: '1px solid var(--border-soft)', color: 'var(--text-80)', background: 'none' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4m4-4v13" /></svg>
                Share
              </button>
            </div>
          </div>
          {/* Summary tiles bleed past the band's bottom edge; the band's
              overflow:hidden clips them at the separator so the cards are cut
              off there (the design), rather than floating whole below it. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 13, marginTop: 24, marginBottom: -24 }}>
            <SummaryTile label="Squad DPS" value={log.squadDps.toLocaleString()} accent />
            <SummaryTile label="Duration" value={formatDuration(log.durationMs)} />
            <SummaryTile label="Players" value={log.players.length} />
            <SummaryTile label="Result" value={<span style={{ color: log.success ? 'var(--good)' : 'var(--bad)' }}>{log.success ? 'Success' : 'Wipe'}</span>} />
            <SummaryTile label="Deaths" value={totalDeaths} />
          </div>
        </div>
      </div>

      {log.canManage && (
        <LogOwnerControls
          log={log}
          myGroups={myGroups ?? []}
          onChanged={() => setReloadNonce((n) => n + 1)}
          onDeleted={() => navigate('/reports')}
        />
      )}

      <div style={{ marginBottom: 14 }}>
        <ParseLegend />
      </div>

      <div className="u-scroll-x" style={{ display: 'flex', gap: 24, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {TABS.map((t) => {
          const on = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '12px 2px',
                marginBottom: -1,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                font: '700 13.5px var(--font-sans)',
                borderBottom: `2px solid ${on ? 'var(--gold)' : 'transparent'}`,
                color: on ? 'var(--gold)' : 'var(--text-55)',
                transition: 'color .15s ease, border-color .15s ease',
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {tab === 'Damage' && <SquadTab log={log} durationLabel={formatDuration(log.durationMs)} />}
      {tab === 'Boons' && <BoonsTab players={log.players} />}
      {tab === 'Mechanics' && <MechanicsTab log={log} />}
      {tab === 'Timeline' && <TimelineTab log={log} />}
    </div>
  );
}

function SummaryTile({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <Card style={{ padding: '15px 17px 26px' }}>
      <div style={{ font: '700 11px var(--font-sans)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-55)' }}>{label}</div>
      <div style={{ font: '800 24px var(--font-sans)', letterSpacing: '-.4px', marginTop: 5, color: accent ? 'var(--gold)' : 'var(--text)' }}>{value}</div>
    </Card>
  );
}

// Uploader/admin controls: flip privacy, attach/move the log to one of your
// groups, or delete it outright. Only mounted when the API says canManage, but
// every action is re-checked server-side.
function LogOwnerControls({
  log,
  myGroups,
  onChanged,
  onDeleted,
}: {
  log: LogDetail;
  myGroups: GroupSummary[];
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [groupBusy, setGroupBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function togglePrivacy() {
    setPrivacyBusy(true);
    try {
      await api.setLogPrivacy(log.id, !log.private);
      toast.success(log.private ? 'Log is now public' : 'Log is now private');
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update privacy');
    } finally {
      setPrivacyBusy(false);
    }
  }

  async function changeGroup(groupId: string) {
    setGroupBusy(true);
    try {
      await api.assignLogGroup(log.id, groupId || null);
      toast.success(groupId ? 'Log attached to group' : 'Log removed from group');
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to reassign group');
    } finally {
      setGroupBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this log permanently? This removes it and all its parse data for everyone. This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.deleteLog(log.id);
      toast.success('Log deleted');
      onDeleted();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete this log');
      setDeleting(false);
    }
  }

  return (
    <Card style={{ padding: '18px 20px', marginBottom: 20 }}>
      <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 14 }}>
        Manage this log
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, paddingBottom: 16, borderBottom: '1px solid var(--border-faint)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: '700 13px var(--font-sans)' }}>Private log</div>
          <div style={{ font: '400 11.5px/1.55 var(--font-sans)', color: 'var(--text-55)', marginTop: 3 }}>
            Keeps this log off the public site — only you, admins, and any group it&apos;s attached to can open it. Its parses still count toward rankings.
          </div>
        </div>
        <button
          role="switch"
          aria-checked={log.private}
          aria-label="Private log"
          onClick={togglePrivacy}
          disabled={privacyBusy}
          style={{
            position: 'relative',
            width: 46,
            height: 25,
            borderRadius: 'var(--radius-md)',
            flexShrink: 0,
            marginTop: 2,
            background: log.private ? 'var(--gold-grad)' : 'color-mix(in srgb, var(--color-text) 14%, transparent)',
            border: '1px solid ' + (log.private ? 'transparent' : 'var(--border)'),
            cursor: privacyBusy ? 'default' : 'pointer',
            opacity: privacyBusy ? 0.6 : 1,
            transition: 'background .15s ease',
          }}
        >
          <span aria-hidden style={{ position: 'absolute', top: 2, left: log.private ? 23 : 2, width: 19, height: 19, borderRadius: '50%', background: log.private ? 'var(--gold-fg)' : 'var(--text-85)', transition: 'left .15s ease' }} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', paddingTop: 16 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 260 }}>
          <span style={{ font: '600 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Group
          </span>
          {myGroups.length > 0 ? (
            <Select
              ariaLabel="Assign to group"
              value={log.group?.id ?? ''}
              onChange={changeGroup}
              disabled={groupBusy}
              options={[{ value: '', label: 'No group' }, ...myGroups.map((g) => ({ value: g.id, label: g.name }))]}
              style={{ width: '100%' }}
            />
          ) : (
            <span style={{ font: '400 12px var(--font-sans)', color: 'var(--text-55)' }}>You&apos;re not in any groups yet.</span>
          )}
        </label>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className={deleting ? undefined : 'u-chip'}
          style={{
            font: '700 12px var(--font-sans)',
            padding: '9px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bad-dim)',
            color: 'var(--bad)',
            border: '1px solid color-mix(in srgb, var(--bad) 40%, transparent)',
            cursor: deleting ? 'default' : 'pointer',
            opacity: deleting ? 0.6 : 1,
          }}
        >
          {deleting ? 'Deleting…' : 'Delete log'}
        </button>
      </div>
    </Card>
  );
}

function DpsOverTimeChart({ points, durationLabel }: { points: DpsChartPoint[]; durationLabel: string }) {
  const { linePath, areaPath } = useMemo(() => {
    const w = 720;
    const h = 160;
    const pad = 14;
    const values = points.map((p) => p.dps);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = (w - pad * 2) / (points.length - 1 || 1);
    const pts = points.map((p, i) => ({
      x: pad + i * step,
      y: pad + (1 - (p.dps - min) / range) * (h - pad * 2),
    }));
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)} ${h - pad} L${pts[0].x.toFixed(1)} ${h - pad} Z`;
    return { linePath: line, areaPath: area };
  }, [points]);

  return (
    <Card style={{ padding: '20px 20px 8px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ font: '700 13.5px var(--font-sans)' }}>Squad DPS Over Time</div>
        <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>0:00 – {durationLabel}</div>
      </div>
      <svg viewBox="0 0 720 160" style={{ width: '100%', height: 'auto', aspectRatio: '720 / 160', overflow: 'visible' }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="dpsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
          </linearGradient>
          <filter id="dpsGlow">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g stroke="var(--border-soft)" strokeWidth={1} vectorEffect="non-scaling-stroke">
          <line x1="0" y1="20" x2="720" y2="20" />
          <line x1="0" y1="66" x2="720" y2="66" />
          <line x1="0" y1="112" x2="720" y2="112" />
          <line x1="0" y1="158" x2="720" y2="158" />
        </g>
        <path d={areaPath} fill="url(#dpsFill)" />
        <path d={linePath} fill="none" stroke="var(--gold)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" filter="url(#dpsGlow)" />
      </svg>
    </Card>
  );
}

function SquadTab({ log, durationLabel }: { log: LogDetail; durationLabel: string }) {
  const subgroups = useMemo(() => {
    const bySubgroup = new Map<number, LogDetailPlayer[]>();
    for (const p of log.players) {
      if (!bySubgroup.has(p.subgroup)) bySubgroup.set(p.subgroup, []);
      bySubgroup.get(p.subgroup)!.push(p);
    }
    return [...bySubgroup.entries()].sort((a, b) => a[0] - b[0]);
  }, [log.players]);

  const maxDps = Math.max(...log.players.map((p) => p.total), 1);
  const picker = useComparePicker();

  return (
    <div>
      {/* Two-column layout (matches the design): the DPS-over-time chart and the
          per-subgroup squad breakdown on the left, a boss / phase timeline
          sidebar on the right — the latter still coming-soon since combat logs
          don't yet carry boss-health or phase data. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 320px)', gap: 20, alignItems: 'start' }} className="log-damage-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          {log.dpsChart && <DpsOverTimeChart points={log.dpsChart} durationLabel={durationLabel} />}
          <div style={{ display: 'grid', gridTemplateColumns: subgroups.length > 1 ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr', gap: 20 }}>
        {subgroups.map(([sub, players]) => (
          <Card key={sub} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', font: '700 11.5px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-60)', borderBottom: '1px solid var(--border-soft)' }}>
              Subgroup {sub}
            </div>
            {players.map((p) => {
              const barWidth = Math.round((p.total / maxDps) * 100);
              // Hidden-name players can't be picked for compare (no account
              // to key on) — the checkbox is simply absent for them.
              const candidate = p.account ? { logId: log.id, account: p.account, label: p.name } : null;
              return (
                <div key={p.account ?? p.name} className="u-row" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: '1px solid var(--border-faint)', overflow: 'hidden' }}>
                  <ArtImg src={specBgPath(p.profession, p.spec)} style={{ opacity: 0.32 }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, color-mix(in srgb, var(--color-surface) 88%, transparent) 0%, color-mix(in srgb, var(--color-surface) 55%, transparent) 55%, color-mix(in srgb, var(--color-surface) 88%, transparent) 100%)' }} />
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${professionColor(p.profession)} 0%, transparent ${barWidth}%)`, opacity: 0.16 }} />
                  <div style={{ position: 'relative', flex: 'none' }}>
                    {candidate ? (
                      <CompareCheckbox checked={picker.isSelected(candidate)} onToggle={() => picker.toggle(candidate)} label={p.name} />
                    ) : (
                      <div style={{ width: 18 }} />
                    )}
                  </div>
                  <img
                    src={professionIconPath(p.profession, p.spec)}
                    alt={p.spec}
                    style={{ position: 'relative', width: 32, height: 32, objectFit: 'contain', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', padding: 3, flex: 'none' }}
                  />
                  <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, font: '700 9.5px var(--font-sans)', letterSpacing: '.4px', textTransform: 'uppercase', color: professionColor(p.profession) }}>
                      <ProfDot color={professionColor(p.profession)} size={6} />
                      {playerRoleLabel(p.squadRole, p.role)} · {p.spec}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <PlayerLink
                        name={p.name}
                        account={p.account}
                        style={{ position: 'relative', font: '600 13px var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <div style={{ position: 'relative', textAlign: 'right', flex: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div>
                      <div style={{ font: '700 12.5px var(--font-mono)' }}>{p.total.toLocaleString()}</div>
                      <div style={{ font: '400 9.5px var(--font-sans)', color: 'var(--text-55)' }}>dps</div>
                    </div>
                    {p.parsePct != null && <ParseBadge pct={p.parsePct} />}
                  </div>
                </div>
              );
            })}
          </Card>
        ))}
          </div>
        </div>

        {/* Right rail — boss encounter context. Health-over-time and per-phase
            splits aren't in the parsed data yet, so those sit as coming-soon. */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <Card style={{ padding: '16px 18px' }}>
            <div style={{ font: '750 14px var(--font-sans)', marginBottom: 12 }}>Encounter</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SidebarStat label="Result" value={<span style={{ color: log.success ? 'var(--good)' : 'var(--bad)' }}>{log.success ? 'Success' : 'Wipe'}</span>} />
              <SidebarStat label="Squad DPS" value={log.squadDps.toLocaleString()} />
              <SidebarStat label="Duration" value={durationLabel} />
              <SidebarStat label="Deaths" value={log.players.reduce((s, p) => s + p.deaths, 0)} />
            </div>
          </Card>
          <ComingSoonPanel
            title="Boss health"
            body="A health-over-time curve for the boss lands here once the parser surfaces it."
          />
          <ComingSoonPanel
            title="Phase breakdown"
            body="Per-phase timings and DPS splits are coming once phase data is extracted from logs."
          />
        </aside>
      </div>
      <ComparePickerBar selected={picker.selected} onClear={picker.clear} />
    </div>
  );
}

function SidebarStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ font: '600 11.5px var(--font-sans)', color: 'var(--text-55)' }}>{label}</span>
      <span style={{ font: '700 14px var(--font-sans)', color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

function ComingSoonPanel({ title, body }: { title: string; body: string }) {
  return (
    <Card style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ font: '750 14px var(--font-sans)' }}>{title}</span>
        <span style={{ font: '700 9.5px var(--font-sans)', letterSpacing: '.06em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 999, color: 'var(--gold)', background: 'var(--gold-dim)', border: '1px solid color-mix(in srgb, var(--color-accent) 40%, transparent)' }}>
          Coming soon
        </span>
      </div>
      <div style={{ font: '400 12px/1.6 var(--font-sans)', color: 'var(--text-55)' }}>{body}</div>
    </Card>
  );
}

function BoonsTab({ players }: { players: LogDetailPlayer[] }) {
  // Fixed column count, but still wrapped in its own scroll container for
  // consistency with MechanicsTab and safety on narrow viewports — a data
  // table like this should never be allowed to blow out the page's width.
  const gridColumns = `28px 1fr 90px repeat(${BOON_COLUMNS.length}, 70px)`;
  return (
    <Card style={{ padding: '18px 20px' }}>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 'fit-content' }}>
          <div style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 8, padding: '0 4px 10px', font: '700 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'center' }}>
            <div style={{ textAlign: 'left' }}>Sub</div>
            <div style={{ textAlign: 'left' }}>Player</div>
            <div style={{ textAlign: 'left' }}>Prof</div>
            {BOON_COLUMNS.map((c) => (
              <div key={c.key}>{c.label}</div>
            ))}
          </div>
          {players.map((p) => (
            <div key={p.account ?? p.name} style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 8, alignItems: 'center', padding: '9px 4px', borderBottom: '1px solid var(--border-faint)' }}>
              <div style={{ font: '700 12px var(--font-mono)', color: 'var(--text-50)' }}>{p.subgroup}</div>
              <PlayerLink name={p.name} account={p.account} style={{ font: '600 13px var(--font-sans)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <ProfDot color={professionColor(p.profession)} />
                <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-65)' }}>{p.spec}</div>
              </div>
              {BOON_COLUMNS.map((c) => {
                const raw = p.boons[c.key] ?? 0;
                const heatValue = c.weight ? Math.min(raw * c.weight, 100) : raw;
                return (
                  <div key={c.key} style={{ textAlign: 'center', padding: '4px 0', borderRadius: 'var(--radius-md)', background: heat(heatValue), font: '700 12px var(--font-mono)', color: '#14120f' }}>
                    {raw}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-50)', marginTop: 12 }}>
        Uptime % (Might shown as avg stacks). Darker gold = higher uptime.
      </div>
    </Card>
  );
}

interface MechanicSummary {
  name: string;                 // EI short name — the key into per-player counts
  label: string;                // FullName when EI provides one, else the short name
  description: string | null;   // EI's human-readable explanation, if any
  total: number;
}

function summarizeMechanics(log: LogDetail): MechanicSummary[] {
  const byName = new Map<string, MechanicSummary>();
  for (const e of log.mechanicEvents) {
    let cur = byName.get(e.name);
    if (!cur) {
      const meta = log.mechanicsMeta?.[e.name];
      cur = { name: e.name, label: meta?.fullName || e.name, description: meta?.description ?? null, total: 0 };
      byName.set(e.name, cur);
    }
    cur.total++;
  }
  // Most-frequent first: Elite Insights emits no severity, so how often a
  // mechanic fired is the meaningful ordering (not an inert severity rank).
  return [...byName.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

// A mechanic label carrying Elite Insights' own description as a hover/focus
// card (keyboard-focusable). Plain text when EI gave no description.
function MechTip({ label, description, style }: { label: string; description: string | null; style?: CSSProperties }) {
  const [open, setOpen] = useState(false);
  if (!description) return <span style={style}>{label}</span>;
  return (
    <span
      style={{ position: 'relative', display: 'inline-block', textDecoration: 'underline dotted', textUnderlineOffset: 3, textDecorationColor: 'var(--text-45)', cursor: 'help', outline: 'none', ...style }}
      tabIndex={0}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {label}
      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 50,
            width: 260,
            padding: '11px 13px',
            background: 'var(--color-surface)',
            border: '1px solid var(--border-soft)',
            boxShadow: 'var(--shadow-md)',
            cursor: 'default',
            whiteSpace: 'normal',
            textTransform: 'none',
            letterSpacing: 'normal',
            textAlign: 'left',
          }}
        >
          <span style={{ display: 'block', font: '800 12px var(--font-sans)', color: 'var(--gold)', marginBottom: 4 }}>{label}</span>
          <span style={{ display: 'block', font: '400 11.5px/1.55 var(--font-sans)', color: 'var(--text-75)' }}>{description}</span>
        </span>
      )}
    </span>
  );
}

function MechanicsTab({ log }: { log: LogDetail }) {
  const mechanics = useMemo(() => summarizeMechanics(log), [log]);
  const mechanicNames = mechanics.map((m) => m.name);
  const byName = new Map(mechanics.map((m) => [m.name, m]));
  // A real raid log can carry a dozen-plus mechanic columns — the grid scales
  // with that, so it scrolls inside its own card rather than blowing out the
  // page width.
  const gridColumns = `28px 1fr 90px repeat(${mechanicNames.length}, 100px)`;
  const countColor = (count: number) => (count > 0 ? 'var(--gold)' : 'rgba(242,237,226,.25)');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {mechanics.length > 0 && (
        <Card style={{ padding: '16px 20px' }}>
          <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
            Mechanics — most frequent first
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {mechanics.map((m) => (
              <div
                key={m.name}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', background: 'var(--bg-chip)', border: '1px solid var(--border-faint)' }}
              >
                <MechTip label={m.label} description={m.description} style={{ font: '600 12px var(--font-sans)', color: 'var(--text-85)' }} />
                <div style={{ font: '600 11px var(--font-mono)', color: 'var(--text-55)' }}>×{m.total}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card style={{ padding: '18px 20px' }}>
        <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
          Per-player mechanic counts
        </div>
        {mechanicNames.length === 0 && (
          <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>No mechanics recorded for this encounter.</div>
        )}
        {mechanicNames.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 'fit-content' }}>
              <div style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 8, padding: '0 4px 10px', font: '700 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'center' }}>
                <div style={{ textAlign: 'left' }}>Sub</div>
                <div style={{ textAlign: 'left' }}>Player</div>
                <div style={{ textAlign: 'left' }}>Prof</div>
                {mechanicNames.map((n) => {
                  const m = byName.get(n);
                  // Compact grid keeps EI's short name; the readable full name +
                  // description ride along as a native hover tooltip.
                  const tip = m ? [m.label, m.description].filter(Boolean).join(' — ') : '';
                  return (
                    <div key={n} title={tip || undefined} style={{ color: 'var(--text-65)', cursor: tip ? 'help' : undefined }}>
                      {n}
                    </div>
                  );
                })}
              </div>
              {log.players.map((p) => (
                <div key={p.account ?? p.name} style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 8, alignItems: 'center', padding: '9px 4px', borderBottom: '1px solid var(--border-faint)' }}>
                  <div style={{ font: '700 12px var(--font-mono)', color: 'var(--text-50)' }}>{p.subgroup}</div>
                  <PlayerLink name={p.name} account={p.account} style={{ font: '600 13px var(--font-sans)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <ProfDot color={professionColor(p.profession)} />
                    <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-65)' }}>{p.spec}</div>
                  </div>
                  {mechanicNames.map((n) => {
                    const count = p.mechanics[n] ?? 0;
                    return (
                      <div key={n} style={{ textAlign: 'center', font: '700 13px var(--font-mono)', color: countColor(count) }}>
                        {count}
                      </div>
                    );
                  })}
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: gridColumns, gap: 8, alignItems: 'center', padding: '10px 4px 2px', borderTop: '1px solid var(--border-soft)', marginTop: 4 }}>
                <div />
                <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Squad total</div>
                <div />
                {mechanics.map((m) => (
                  <div key={m.name} style={{ textAlign: 'center', font: '800 13px var(--font-mono)', color: 'var(--gold)' }}>
                    {m.total}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

type TimelineRow =
  | { kind: 'mechanic'; timeMs: number; name: string; actor: string | null; severity: string | null }
  | { kind: 'death'; timeMs: number; actor: string; killedBy: string | null };

function TimelineTab({ log }: { log: LogDetail }) {
  const rows = useMemo<TimelineRow[]>(() => {
    const mechanicRows: TimelineRow[] = log.mechanicEvents.map((e) => ({ kind: 'mechanic', ...e }));
    const deathRows: TimelineRow[] = log.deathEvents.map((e) => ({ kind: 'death', ...e }));
    return [...mechanicRows, ...deathRows].sort((a, b) => a.timeMs - b.timeMs);
  }, [log.mechanicEvents, log.deathEvents]);

  // Mechanic/death "actor" is a character name — only squad members resolve
  // to a profile link here (a boss or NPC name just renders as plain text).
  const accountByName = useMemo(() => new Map(log.players.map((p) => [p.name, p.account])), [log.players]);
  const actorLink = (actor: string) => {
    const account = accountByName.get(actor);
    return account ? (
      <Link to={`/players/${encodeURIComponent(account)}`} style={{ color: 'inherit', textDecoration: 'underline', textDecorationColor: 'var(--border)' }}>
        {actor}
      </Link>
    ) : (
      actor
    );
  };

  if (rows.length === 0) {
    return (
      <Card style={{ padding: '18px 20px' }}>
        <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>No events recorded for this log.</div>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <TimelineScrubber log={log} />
      <Card style={{ padding: '18px 20px' }}>
        <div style={{ font: '700 11px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
          Full event history — {rows.length} events
        </div>
        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
          {rows.map((r, i) =>
            r.kind === 'death' ? (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 8px', borderBottom: '1px solid var(--border-faint)', background: 'var(--bad-dim)', borderRadius: 'var(--radius-md)' }}
              >
                <div style={{ width: 8, height: 8, borderRadius: 'var(--radius-md)', transform: 'rotate(45deg)', background: eventDotColor('bad'), marginTop: 6, flex: 'none' }} />
                <div>
                  <div style={{ font: '600 12px var(--font-mono)', color: 'var(--text-55)' }}>{formatDuration(r.timeMs)}</div>
                  <div style={{ font: '700 13px var(--font-sans)', color: 'var(--bad)' }}>
                    {actorLink(r.actor)} died{r.killedBy ? ` — killed by ${r.killedBy}` : ''}
                  </div>
                </div>
              </div>
            ) : (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 8px', borderBottom: '1px solid var(--border-faint)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: severityColor(r.severity), marginTop: 5, flex: 'none' }} />
                <div>
                  <div style={{ font: '600 12px var(--font-mono)', color: 'var(--text-55)' }}>{formatDuration(r.timeMs)}</div>
                  <div style={{ font: '500 13px var(--font-sans)' }}>
                    {r.name}
                    {r.actor && <> — {actorLink(r.actor)}</>}
                    {r.severity && (
                      <span style={{ font: '700 10px var(--font-mono)', color: severityColor(r.severity), marginLeft: 8 }}>{r.severity}</span>
                    )}
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      </Card>
    </div>
  );
}

function TimelineScrubber({ log }: { log: LogDetail }) {
  const w = 720;
  const h = 90;
  const pad = 14;
  const duration = Math.max(log.durationMs, 1);
  const xFor = (t: number) => pad + (Math.min(t, duration) / duration) * (w - pad * 2);

  const minuteMarks = useMemo(() => {
    const marks: number[] = [];
    for (let ms = 0; ms <= duration; ms += 60000) marks.push(ms);
    return marks;
  }, [duration]);

  return (
    <Card style={{ padding: '20px 20px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ font: '700 13.5px var(--font-sans)' }}>Fight Timeline</div>
        <div style={{ display: 'flex', gap: 14, font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: severityColor('Sev4'), display: 'inline-block' }} /> mechanic (severity)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 'var(--radius-md)', transform: 'rotate(45deg)', background: eventDotColor('bad'), display: 'inline-block' }} /> death
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', aspectRatio: `${w} / ${h}`, overflow: 'visible' }} preserveAspectRatio="none">
        <line x1={pad} y1={60} x2={w - pad} y2={60} stroke="var(--border-soft)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {minuteMarks.map((ms) => (
          <g key={ms}>
            <line x1={xFor(ms)} y1={20} x2={xFor(ms)} y2={70} stroke="var(--border-faint)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <text x={xFor(ms)} y={84} textAnchor="middle" fontSize={9} fill="var(--text-50)">
              {formatDuration(ms)}
            </text>
          </g>
        ))}
        {log.mechanicEvents.map((e, i) => (
          <circle key={`m${i}`} cx={xFor(e.timeMs)} cy={60} r={3 + severityRank(e.severity) * 0.6} fill={severityColor(e.severity)} opacity={0.85}>
            <title>
              {formatDuration(e.timeMs)} — {e.name}
              {e.actor ? ` (${e.actor})` : ''}
            </title>
          </circle>
        ))}
        {log.deathEvents.map((e, i) => (
          <rect key={`d${i}`} x={xFor(e.timeMs) - 4} y={16} width={8} height={8} transform={`rotate(45 ${xFor(e.timeMs)} 20)`} fill={eventDotColor('bad')} stroke="var(--bg)" strokeWidth={1} vectorEffect="non-scaling-stroke">
            <title>
              {formatDuration(e.timeMs)} — {e.actor} died{e.killedBy ? ` (killed by ${e.killedBy})` : ''}
            </title>
          </rect>
        ))}
      </svg>
    </Card>
  );
}
