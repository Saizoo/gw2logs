import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { professionColor, professionIconPath } from '../data/gw2-data';
import { Card, GoldButton, ParseLegend, ProfDot, ResultPill, StatCard } from '../components/atoms';
import { LoadingState, ErrorState } from '../components/QueryStates';

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function signed(n: number): string {
  return n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString();
}

export default function DashboardPage() {
  const { user, loading: userLoading } = useCurrentUser();

  if (userLoading) return <LoadingState label="Loading…" />;
  if (!user) return <LoggedOutDashboard />;
  return <SignedInDashboard />;
}

function LoggedOutDashboard() {
  const { data: stats } = useApiQuery(() => api.stats(), []);
  const { data: home, loading, error } = useApiQuery(() => api.home(), []);

  return (
    <div>
      <Card
        style={{
          padding: '48px 40px',
          textAlign: 'center',
          background:
            'radial-gradient(700px 300px at 15% 0%, oklch(0.4 0.1 55 / 25%), transparent), linear-gradient(135deg, oklch(0.2 0.02 260), oklch(0.13 0.015 250))',
        }}
      >
        <div style={{ font: '800 32px var(--font-sans)', letterSpacing: '-.3px' }}>
          Every log makes the rankings <span style={{ color: 'var(--gold)' }}>sharper</span>.
        </div>
        <div style={{ font: '500 14px var(--font-sans)', color: 'var(--text-62)', marginTop: 14, maxWidth: 480, margin: '14px auto 0' }}>
          Upload arcdps combat logs, get an instant breakdown, and see how you stack up against the whole community —
          patch over patch.
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
          <GoldButton to="/upload">Upload a log</GoldButton>
          <Link
            to="/login"
            style={{
              padding: '9px 16px',
              borderRadius: 10,
              font: '600 12.5px var(--font-sans)',
              color: 'var(--gold)',
              border: '1px solid var(--gold-dim)',
            }}
          >
            Sign in
          </Link>
        </div>
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 30 }}>
          <div>
            <div style={{ font: '800 22px var(--font-mono)', color: 'var(--gold)' }}>{stats?.totalLogs ?? '—'}</div>
            <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-55)' }}>logs parsed</div>
          </div>
          <div>
            <div style={{ font: '800 22px var(--font-mono)', color: 'var(--gold)' }}>{stats?.totalPlayers ?? '—'}</div>
            <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-55)' }}>players ranked</div>
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 28 }}>
        {loading && <LoadingState label="Loading highlights…" />}
        {error && <ErrorState message={error} />}
        {home && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, alignItems: 'start' }}>
            <Card style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', font: '700 13.5px var(--font-sans)' }}>
                Highest DPS logged, by profession
              </div>
              {home.topByProfession.length === 0 ? (
                <div style={{ padding: 20, font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>
                  No logs uploaded yet — this fills in as parses come in.
                </div>
              ) : (
                home.topByProfession.map((row, i) => (
                  <Link
                    key={row.profession}
                    to={`/logs/${row.logId}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 20px',
                      borderBottom: i === home.topByProfession.length - 1 ? 'none' : '1px solid var(--border-faint)',
                    }}
                  >
                    <ProfDot color={professionColor(row.profession)} size={9} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: '600 13px var(--font-sans)' }}>{row.name}</div>
                      <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>
                        {row.spec} · {row.boss}
                      </div>
                    </div>
                    <div style={{ font: '700 14px var(--font-mono)', color: 'var(--gold)' }}>{row.dps.toLocaleString()}</div>
                  </Link>
                ))
              )}
            </Card>

            <Card style={{ overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', font: '700 13.5px var(--font-sans)' }}>
                Recently uploaded
              </div>
              {home.recentLogs.length === 0 ? (
                <div style={{ padding: 20, font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>Nothing uploaded yet.</div>
              ) : (
                home.recentLogs.map((log, i) => (
                  <Link
                    key={log.id}
                    to={`/logs/${log.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '11px 20px',
                      borderBottom: i === home.recentLogs.length - 1 ? 'none' : '1px solid var(--border-faint)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ font: '600 13px var(--font-sans)' }}>
                        {log.boss}
                        {log.isCm ? ' CM' : ''}
                      </div>
                      <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>
                        {log.playerCount} players · {new Date(log.uploadedAt).toLocaleString()}
                      </div>
                    </div>
                    <ResultPill success={log.success} />
                  </Link>
                ))
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function SignedInDashboard() {
  const { data: dash, loading, error } = useApiQuery(() => api.dashboard(), []);

  if (loading) return <LoadingState label="Loading dashboard…" />;
  if (error) return <ErrorState message={error} />;
  if (!dash) return null;

  const maxBar = Math.max(...dash.weeklyActivity.map((b) => b.count), 1);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ font: '800 24px var(--font-sans)', letterSpacing: '-.3px' }}>
            Welcome back, <span style={{ color: 'var(--gold)' }}>{dash.displayName}</span>
          </div>
          <div style={{ font: '400 13px var(--font-sans)', color: 'var(--text-62)', marginTop: 4 }}>
            {dash.guild ? `[${dash.guild.tag}] ${dash.guild.name} · ` : ''}
            {dash.stats.logsThisWeek} log{dash.stats.logsThisWeek === 1 ? '' : 's'} uploaded this week
          </div>
        </div>
        <GoldButton to="/upload">Upload New Log</GoldButton>
      </div>

      {!dash.gw2AccountName && (
        <Card style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-80)' }}>
            Link your Guild Wars 2 account to see personalized stats and guild activity.
          </div>
          <Link to="/account" style={{ font: '700 12px var(--font-sans)', color: 'var(--gold)', flex: 'none' }}>
            Link account →
          </Link>
        </Card>
      )}

      <div style={{ marginBottom: 18 }}>
        <ParseLegend />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
        <StatCard label="Logs This Week" value={dash.stats.logsThisWeek} delta={dash.stats.logsThisWeekDelta !== 0 ? signed(dash.stats.logsThisWeekDelta) : undefined} />
        <StatCard
          label="Avg Squad DPS"
          value={dash.stats.avgSquadDps.toLocaleString()}
          delta={dash.stats.avgSquadDpsDelta !== 0 ? signed(dash.stats.avgSquadDpsDelta) : undefined}
        />
        <StatCard label="Clears" value={`${dash.stats.clearsThisWeek}/${dash.stats.totalThisWeek}`} />
        <StatCard label="Guild Rank" value={dash.stats.guildRank ? `#${dash.stats.guildRank}` : '—'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, alignItems: 'start' }}>
        <Card style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', font: '700 13.5px var(--font-sans)' }}>
            Recent Logs
          </div>
          {dash.recentLogs.length === 0 && (
            <div style={{ padding: 20, font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>
              No logs yet — upload one to see it here.
            </div>
          )}
          {dash.recentLogs.map((log, i) => (
            <Link
              key={log.logId}
              to={`/logs/${log.logId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '13px 20px',
                borderBottom: i === dash.recentLogs.length - 1 ? 'none' : '1px solid var(--border-faint)',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  flex: 'none',
                  background: `linear-gradient(135deg, ${professionColor(log.profession)}, oklch(0.16 0.01 250))`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img src={professionIconPath(log.profession)} alt={log.profession} style={{ width: 28, height: 28, objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ font: '600 13.5px var(--font-sans)' }}>
                    {log.boss}
                    {log.isCm ? ' CM' : ''}
                  </div>
                  <ResultPill success={log.success} />
                </div>
                <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-58)', marginTop: 2 }}>
                  {log.wing ?? 'Other'} · {formatDuration(log.durationMs)} · {new Date(log.uploadedAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{ textAlign: 'right', flex: 'none' }}>
                <div style={{ font: '700 13px var(--font-mono)', color: 'var(--gold)' }}>{log.dps.toLocaleString()}</div>
                <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--text-55)' }}>your dps</div>
              </div>
            </Link>
          ))}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card style={{ padding: '18px 20px' }}>
            <div style={{ font: '700 13.5px var(--font-sans)', marginBottom: 14 }}>Weekly Activity</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90 }}>
              {dash.weeklyActivity.map((bar) => (
                <div key={bar.label} style={{ flex: 1, alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max((bar.count / maxBar) * 100, bar.count > 0 ? 6 : 0)}%`,
                      borderRadius: '5px 5px 3px 3px',
                      background: 'linear-gradient(180deg, var(--gold), oklch(0.55 0.1 55 / 60%))',
                    }}
                  />
                  <div style={{ font: '400 9.5px var(--font-sans)', color: 'var(--text-55)' }}>{bar.label}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 4px', font: '700 13.5px var(--font-sans)' }}>Guild Activity</div>
            {dash.guildActivity.length === 0 && (
              <div style={{ padding: '10px 20px 18px', font: '500 12px var(--font-sans)', color: 'var(--text-55)' }}>
                {dash.guild ? 'No guild activity this week yet.' : 'Link a guild-synced GW2 account to see this.'}
              </div>
            )}
            {dash.guildActivity.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '11px 20px', alignItems: 'flex-start' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', marginTop: 6, flex: 'none', background: 'var(--gold)' }} />
                <div style={{ font: '400 12px var(--font-sans)', lineHeight: 1.45, color: 'var(--text-80)' }}>
                  {item.text} <span style={{ color: 'var(--text-50)' }}>· {new Date(item.time).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
