import { Link } from 'react-router-dom';
import { GUILD_PROFILE } from '../data/gw2-data';
import { ProfDot } from '../components/atoms';

export default function GuildPage() {
  const guild = GUILD_PROFILE;

  return (
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: '0 0 40px' }}>
      <div
        style={{
          position: 'relative',
          padding: '26px 32px',
          background: 'linear-gradient(160deg,#241a10,#0f0d0a 75%)',
          borderBottom: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 320,
            background: 'repeating-linear-gradient(115deg,rgba(224,180,88,.08) 0 12px,rgba(224,180,88,.02) 12px 24px)',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 10, flex: 'none',
              background: 'repeating-linear-gradient(115deg,rgba(224,180,88,.3) 0 6px,rgba(224,180,88,.1) 6px 12px)',
            }}
          />
          <div>
            <h1 style={{ font: '800 30px var(--font-sans)', color: 'var(--text)' }}>
              {guild.name} <span style={{ color: 'var(--gold)' }}>{guild.tag}</span>
            </h1>
            <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-50)', marginTop: 4 }}>
              {guild.region} · {guild.recruitment}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1, background: 'var(--border)' }}>
        {guild.stats.map((gs) => (
          <div key={gs.label} style={{ background: 'var(--bg-card)', padding: '18px 24px' }}>
            <div style={{ font: '600 10px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              {gs.label}
            </div>
            <div style={{ font: '700 22px var(--font-mono)', color: 'var(--gold)', marginTop: 6 }}>{gs.value}</div>
            <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-40)', marginTop: 2 }}>{gs.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 24, padding: '24px 32px 28px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 480px', minWidth: 0 }}>
          <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text-45)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
            Roster
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 130px 100px', gap: 10, padding: '0 14px 10px', font: '600 11px var(--font-sans)', color: 'var(--text-40)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            <div>Player</div>
            <div>Role</div>
            <div>Profession</div>
            <div>Logs / wk</div>
          </div>
          {guild.roster.map((row) => (
            <Link
              key={row.name}
              to={`/players/${encodeURIComponent(row.name)}`}
              style={{ display: 'grid', gridTemplateColumns: '1fr 110px 130px 100px', gap: 10, alignItems: 'center', padding: '10px 14px', background: 'var(--bg-row)', borderRadius: 6, marginBottom: 3 }}
            >
              <div style={{ font: '600 13px var(--font-sans)', color: 'var(--text)' }}>{row.name}</div>
              <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-55)' }}>{row.role}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <ProfDot color={row.color} />
                <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-70)' }}>{row.spec}</div>
              </div>
              <div style={{ font: '700 13px var(--font-mono)', color: 'var(--gold)' }}>{row.logsThisWeek}</div>
            </Link>
          ))}
        </div>

        <div style={{ width: 280, flex: 'none' }}>
          <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text-45)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>
            CM progression
          </div>
          <div style={{ background: 'var(--bg-row)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px' }}>
            {guild.progression.map((p) => (
              <div key={p.boss} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-soft)' }}>
                <div>
                  <div style={{ font: '600 12px var(--font-sans)', color: 'var(--text)' }}>{p.boss}</div>
                  <div style={{ font: '400 10px var(--font-sans)', color: 'var(--text-40)' }}>{p.kills} kills</div>
                </div>
                <div style={{ font: '700 12px var(--font-mono)', color: 'var(--gold)' }}>{p.bestTime}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
