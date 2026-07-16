import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { professionColor, professionColorAlpha, professionForSpec, professionIconPath } from '../data/gw2-data';
import { Card, ParseBadge, ProfDot } from '../components/atoms';
import { LoadingState, ErrorState } from '../components/QueryStates';

export default function PlayerProfilePage() {
  const { name = '' } = useParams();
  const { data: player, loading, error } = useApiQuery(() => api.player(name), [name]);

  // Wipes don't have a meaningful "final" DPS — the fight never finished,
  // so a low number there just means it ended early, not that the parse was
  // bad. Both the trend line and its average are kills-only for that reason.
  const recentKills = useMemo(() => player?.recent.filter((r) => r.success) ?? [], [player]);

  const avgRecentDps = useMemo(() => {
    if (recentKills.length === 0) return null;
    return Math.round(recentKills.reduce((s, r) => s + r.dps, 0) / recentKills.length);
  }, [recentKills]);

  const chart = useMemo(() => {
    if (recentKills.length < 2) return null;
    const values = [...recentKills].reverse().map((r) => r.dps);
    const w = 720;
    const h = 150;
    const pad = 14;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = (w - pad * 2) / (values.length - 1);
    const pts = values.map((v, i) => ({ x: pad + i * step, y: pad + (1 - (v - min) / range) * (h - pad * 2) }));
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)} ${h - pad} L${pts[0].x.toFixed(1)} ${h - pad} Z`;
    return { line, area, pts };
  }, [recentKills]);

  if (loading) return <LoadingState label="Loading profile…" />;
  if (error) return <ErrorState message={error === 'Player not found' ? `No logs found for ${name} yet.` : error} />;
  if (!player) return null;

  const mainProfession = player.professionBreakdown[0]?.profession ?? null;

  const profileStats = [
    { label: 'Total Logs', value: player.totalLogs },
    { label: 'Overall Score', value: player.overallScore ?? '—' },
    { label: 'Consistency', value: player.consistencyScore ?? '—' },
    { label: 'Avg DPS (recent)', value: avgRecentDps ? avgRecentDps.toLocaleString() : '—' },
  ];

  return (
    <div>
      <Card
        style={{
          padding: 32,
          marginBottom: 22,
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          background:
            'radial-gradient(600px 260px at 85% 0%, oklch(0.32 0.06 155 / 25%), transparent), linear-gradient(135deg, oklch(0.2 0.018 250), oklch(0.13 0.014 250))',
        }}
      >
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 18,
            background: mainProfession
              ? `linear-gradient(135deg, ${professionColorAlpha(mainProfession, 50)}, oklch(0.16 0.02 155 / 60%))`
              : 'oklch(0.22 0.014 250)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
            border: '1px solid var(--border)',
          }}
        >
          {mainProfession && <img src={professionIconPath(mainProfession)} alt={mainProfession} style={{ width: 56, height: 56, objectFit: 'contain' }} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ font: '800 26px var(--font-sans)', letterSpacing: '-.4px' }}>{player.account}</div>
          {mainProfession && (
            <div style={{ font: '500 12.5px var(--font-sans)', color: 'var(--text-62)', marginTop: 4 }}>{mainProfession}</div>
          )}
          <div style={{ display: 'flex', gap: 20, marginTop: 14, flexWrap: 'wrap' }}>
            {profileStats.map((s) => (
              <div key={s.label}>
                <div style={{ font: '800 18px var(--font-sans)' }}>{s.value}</div>
                <div style={{ font: '400 10.5px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {chart && (
        <Card style={{ padding: '20px 20px 8px', marginBottom: 20 }}>
          <div style={{ font: '700 13.5px var(--font-sans)', marginBottom: 6 }}>DPS Trend — Last {recentKills.length} Kills</div>
          <svg viewBox="0 0 720 150" style={{ width: '100%', height: 'auto', aspectRatio: '720 / 150', overflow: 'visible' }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="dpsFill2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.65 0.1 155)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="oklch(0.65 0.1 155)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g stroke="var(--border-soft)" strokeWidth={1} vectorEffect="non-scaling-stroke">
              <line x1="0" y1="10" x2="720" y2="10" />
              <line x1="0" y1="56" x2="720" y2="56" />
              <line x1="0" y1="102" x2="720" y2="102" />
              <line x1="0" y1="148" x2="720" y2="148" />
            </g>
            <path d={chart.area} fill="url(#dpsFill2)" />
            <path d={chart.line} fill="none" stroke="oklch(0.65 0.1 155)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {chart.pts.map((pt, i) => (
              <circle key={i} cx={pt.x} cy={pt.y} r={3.5} fill="var(--bg)" stroke="oklch(0.65 0.1 155)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
        </Card>
      )}

      <div style={{ marginBottom: 12 }}>
        <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text-55)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
          Best parses
        </div>
        {player.bestParses.length === 0 && (
          <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>No logs yet.</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {player.bestParses.map((bp) => (
            <Card key={bp.logId} className="u-card-link" style={{ padding: 14 }}>
              <Link to={`/logs/${bp.logId}`} style={{ display: 'block' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <ProfDot color={professionColor(professionForSpec(bp.spec))} />
                  <div style={{ font: '700 13px var(--font-sans)' }}>
                    {bp.boss}
                    {bp.isCm ? ' CM' : ''}
                  </div>
                </div>
                <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-58)', marginBottom: 10 }}>{bp.spec}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <ParseBadge pct={bp.pct} style={{ height: 24, minWidth: 32, font: '800 13px var(--font-mono)' }} />
                  <span style={{ font: '600 13px var(--font-mono)', color: 'var(--text-65)' }}>{bp.dps.toLocaleString()} dps</span>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      </div>

      <Card style={{ marginTop: 20, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)', font: '700 13.5px var(--font-sans)' }}>
          Recent Activity
        </div>
        {player.recent.length === 0 && (
          <div style={{ padding: 20, font: '500 13px var(--font-sans)', color: 'var(--text-55)' }}>Nothing uploaded yet.</div>
        )}
        {player.recent.map((r, i) => (
          <Link
            key={r.logId}
            to={`/logs/${r.logId}`}
            className="u-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '11px 20px',
              borderBottom: i === player.recent.length - 1 ? 'none' : '1px solid var(--border-faint)',
            }}
          >
            <img src={professionIconPath(professionForSpec(r.spec), r.spec)} alt={r.spec} style={{ width: 26, height: 26, objectFit: 'contain', flex: 'none' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: '600 13px var(--font-sans)' }}>
                {r.boss}
                {r.isCm ? ' CM' : ''}
              </div>
              <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)' }}>
                {r.spec} · {new Date(r.uploadedAt).toLocaleString()}
              </div>
            </div>
            <div style={{ font: '700 13px var(--font-mono)', color: 'var(--gold)' }}>{r.dps.toLocaleString()}</div>
          </Link>
        ))}
      </Card>
    </div>
  );
}
