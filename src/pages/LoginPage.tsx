import { Link } from 'react-router-dom';
import { Logo } from '../components/atoms';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';

export default function LoginPage() {
  const { data: stats } = useApiQuery(() => api.stats(), []);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.1fr 1fr' }}>
      <div
        style={{
          position: 'relative',
          padding: 36,
          background: 'linear-gradient(160deg,#241a10,#0f0d0a 80%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
            background: 'repeating-linear-gradient(115deg, oklch(0.78 0.14 85 / 6%) 0 12px, oklch(0.78 0.14 85 / 1.5%) 12px 24px)',
          }}
        />
        <div style={{ position: 'relative' }}>
          <Logo />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ font: '800 32px var(--font-sans)', color: 'var(--text)', lineHeight: 1.2 }}>
            Every log makes
            <br />
            the rankings sharper.
          </div>
          <div style={{ font: '500 13px var(--font-sans)', color: 'var(--text-50)', marginTop: 14, maxWidth: 360 }}>
            Upload arcdps logs, rank your parses against the whole community, and track your progress patch over
            patch.
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 26 }}>
            <div>
              <div style={{ font: '800 20px var(--font-mono)', color: 'var(--gold)' }}>{stats?.totalLogs ?? '—'}</div>
              <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-50)' }}>logs parsed</div>
            </div>
            <div>
              <div style={{ font: '800 20px var(--font-mono)', color: 'var(--gold)' }}>{stats?.totalPlayers ?? '—'}</div>
              <div style={{ font: '500 11px var(--font-sans)', color: 'var(--text-50)' }}>players ranked</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '44px 40px', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ font: '800 22px var(--font-sans)', color: 'var(--text)', marginBottom: 6 }}>Sign in</div>
        <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-55)', marginBottom: 26 }}>
          Claim your account to track ratings across every log you upload.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a
            href="/api/auth/discord"
            className="u-btn-gold"
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
              background: '#5865F2', borderRadius: 10,
            }}
          >
            <div style={{ width: 18, height: 18, borderRadius: 5, background: 'rgba(255,255,255,.9)' }} />
            <span style={{ font: '700 13px var(--font-sans)', color: '#fff' }}>Continue with Discord</span>
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ font: '500 11px var(--font-sans)', color: 'var(--text-50)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <Link
          to="/upload"
          className="u-btn-ghost"
          style={{ padding: '12px 16px', border: '1px solid var(--gold-dim)', borderRadius: 10, textAlign: 'center', display: 'block' }}
        >
          <span style={{ font: '700 13px var(--font-sans)', color: 'var(--gold)' }}>Upload without an account</span>
          <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)', marginTop: 3 }}>
            Every player in the log still shows up in search and leaderboards under their GW2 account name
          </div>
        </Link>

        <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)', marginTop: 24, lineHeight: 1.5 }}>
          By continuing you agree to the Terms of Service and Privacy Policy. Account claiming links your ArenaNet
          API key read-only for character/account verification.
        </div>
      </div>
    </div>
  );
}
