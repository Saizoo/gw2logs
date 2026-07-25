import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/atoms';
import { api } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';
import { RAID_BACKGROUNDS } from '../data/gw2-data';

// Fisher–Yates — so the backdrop leads with a different encounter each visit.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CYCLE_MS = 7000;

export default function LoginPage() {
  const { data: stats } = useApiQuery(() => api.stats(), []);

  // Cycle raid encounter art behind the panel, crossfading one to the next.
  // Capped to a shuffled handful — every layer fetches immediately, so this
  // keeps the login page light while still varying the set per visit.
  const images = useMemo(() => shuffle(RAID_BACKGROUNDS).slice(0, 10), []);
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => setActive((i) => (i + 1) % images.length), CYCLE_MS);
    return () => clearInterval(t);
  }, [images.length]);

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1.1fr 1fr' }}>
      <div
        style={{
          position: 'relative',
          padding: 36,
          background: '#0f0d0a',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        {/* Cycling raid encounter backdrop — stacked layers crossfaded by
            opacity, behind a dark scrim that keeps the text readable. */}
        {images.map((src, i) => (
          <div
            key={src}
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'contrast(1.05)',
              opacity: i === active ? 1 : 0,
              transform: i === active ? 'scale(1.05)' : 'scale(1)',
              transition: 'opacity 1.4s ease, transform 8s ease',
            }}
          />
        ))}
        {/* Readability wash — lighter than before so the art actually reads,
            darkening toward the bottom-left where the copy sits — plus a
            horizontal fade on the right that blends the panel into the sign-in
            column (var(--bg-card)) so there's no hard seam between them. */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            background:
              'linear-gradient(90deg, color-mix(in srgb, var(--color-neutral-900) 35%, transparent) 0%, color-mix(in srgb, var(--color-neutral-900) 20%, transparent) 40%, transparent 62%, var(--bg-card) 100%),' +
              'linear-gradient(180deg, color-mix(in srgb, var(--color-neutral-900) 40%, transparent) 0%, color-mix(in srgb, var(--color-neutral-900) 25%, transparent) 40%, color-mix(in srgb, var(--color-neutral-900) 88%, transparent) 100%)',
          }}
        />
        <div style={{ position: 'relative' }}>
          <Logo />
        </div>
        <div style={{ position: 'relative', color: 'var(--on-art)' }}>
          <div style={{ font: '800 32px var(--font-sans)', color: 'var(--on-art)', lineHeight: 1.2 }}>
            Every log makes
            <br />
            the rankings sharper.
          </div>
          <div style={{ font: '500 13px var(--font-sans)', color: 'color-mix(in srgb, var(--on-art) 62%, transparent)', marginTop: 14, maxWidth: 360 }}>
            Upload arcdps logs, rank your parses against the whole community, and track your progress patch over
            patch.
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 26 }}>
            <div>
              <div style={{ font: '800 20px var(--font-mono)', color: 'var(--gold)' }}>{stats?.totalLogs ?? '—'}</div>
              <div style={{ font: '500 11px var(--font-sans)', color: 'color-mix(in srgb, var(--on-art) 62%, transparent)' }}>logs parsed</div>
            </div>
            <div>
              <div style={{ font: '800 20px var(--font-mono)', color: 'var(--gold)' }}>{stats?.totalPlayers ?? '—'}</div>
              <div style={{ font: '500 11px var(--font-sans)', color: 'color-mix(in srgb, var(--on-art) 62%, transparent)' }}>players ranked</div>
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
              background: '#5865F2', borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ width: 18, height: 18, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,.9)' }} />
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
          style={{ padding: '12px 16px', border: '1px solid var(--gold-dim)', borderRadius: 'var(--radius-md)', textAlign: 'center', display: 'block' }}
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
