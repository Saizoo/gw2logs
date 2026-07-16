import { useEffect, useRef, useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { REPLAY_TOUR_EVENT } from '../components/OnboardingTour';
import { api, ApiError, type DpsReportImportStatus } from '../lib/api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { LoadingState } from '../components/QueryStates';
import { Badge, Card, GoldButton } from '../components/atoms';

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, loading, refresh } = useCurrentUser();
  const [apiKey, setApiKey] = useState('');
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const [dpsToken, setDpsToken] = useState('');
  const [dpsStarting, setDpsStarting] = useState(false);
  const [dpsError, setDpsError] = useState<string | null>(null);
  const [dpsStatus, setDpsStatus] = useState<DpsReportImportStatus | null>(null);
  const dpsPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (dpsPollRef.current) clearInterval(dpsPollRef.current);
    };
  }, []);

  if (loading) return <LoadingState label="Loading account…" />;
  if (!user) return <Navigate to="/login" replace />;

  async function handleLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLinking(true);
    try {
      const res = await api.linkGw2(apiKey.trim());
      setApiKey('');
      setResult(`Linked ${res.gw2AccountName}.`);
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to link API key');
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink() {
    setError(null);
    setResult(null);
    setUnlinking(true);
    try {
      await api.unlinkGw2();
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to unlink account');
    } finally {
      setUnlinking(false);
    }
  }

  async function handleLogout() {
    await api.logout();
    window.location.href = '/';
  }

  async function handleImportDpsReport(e: React.FormEvent) {
    e.preventDefault();
    setDpsError(null);
    setDpsStatus(null);
    setDpsStarting(true);
    try {
      const start = await api.importDpsReport(dpsToken.trim());
      if (!start.batchId) {
        setDpsError('No uploads found for that token.');
        return;
      }
      setDpsStatus({ total: start.total, processed: 0, succeeded: 0, failed: 0, done: false });
      if (dpsPollRef.current) clearInterval(dpsPollRef.current);
      dpsPollRef.current = setInterval(async () => {
        try {
          const status = await api.importDpsReportStatus(start.batchId!);
          setDpsStatus(status);
          if (status.done && dpsPollRef.current) {
            clearInterval(dpsPollRef.current);
            dpsPollRef.current = null;
          }
        } catch {
          if (dpsPollRef.current) {
            clearInterval(dpsPollRef.current);
            dpsPollRef.current = null;
          }
        }
      }, 1500);
    } catch (err) {
      setDpsError(err instanceof ApiError ? err.message : 'Failed to start import');
    } finally {
      setDpsStarting(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        {user.discordAvatar && (
          <img src={user.discordAvatar} alt="" style={{ width: 44, height: 44, borderRadius: '50%' }} />
        )}
        <div>
          <div style={{ font: '800 18px var(--font-sans)', color: 'var(--text)' }}>{user.discordUsername}</div>
          <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-55)' }}>Signed in with Discord</div>
        </div>
        <button
          onClick={handleLogout}
          className="u-btn-ghost"
          style={{
            marginLeft: 'auto',
            font: '600 12px var(--font-sans)',
            color: 'var(--text-70)',
            padding: '8px 14px',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
        >
          Sign out
        </button>
      </div>

      <Card style={{ padding: 22 }}>
        <div style={{ font: '700 14px var(--font-sans)', color: 'var(--text)', marginBottom: 4 }}>Guild Wars 2 account</div>

        {user.gw2AccountName ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <span style={{ font: '700 14px var(--font-mono)', color: 'var(--gold)' }}>{user.gw2AccountName}</span>
              <Badge tone="good">Verified</Badge>
            </div>
            <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-55)', marginTop: 4, lineHeight: 1.6 }}>
              Linked {user.gw2LinkedAt ? new Date(user.gw2LinkedAt).toLocaleDateString() : ''}. Logs uploaded from any
              character on this account are now attributed to your profile.
            </div>
            <button
              onClick={handleUnlink}
              disabled={unlinking}
              className={unlinking ? undefined : 'u-btn-ghost'}
              style={{
                marginTop: 14,
                font: '600 12px var(--font-sans)',
                color: 'var(--bad)',
                padding: '9px 14px',
                border: '1px solid var(--bad-dim)',
                borderRadius: 8,
                opacity: unlinking ? 0.6 : 1,
              }}
            >
              {unlinking ? 'Unlinking…' : 'Unlink account'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleLink}>
            <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-55)', marginTop: 8, marginBottom: 14, lineHeight: 1.6 }}>
              Link your GW2 API key to verify account ownership and attribute uploaded logs to your account name
              across all your characters. Create a key at{' '}
              <a href="https://account.arena.net/applications" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>
                account.arena.net/applications
              </a>{' '}
              with only the <strong>account</strong> permission checked — nothing else is needed, and we never
              request tradingpost, wallet, or character inventory access.
            </div>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                font: '400 12px var(--font-mono)',
                color: 'var(--text)',
              }}
            />
            <div style={{ marginTop: 12 }}>
              <GoldButton type="submit" disabled={linking || !apiKey.trim()}>
                {linking ? 'Verifying…' : 'Link account'}
              </GoldButton>
            </div>
          </form>
        )}

        {result && <div style={{ marginTop: 14, font: '500 12px var(--font-sans)', color: 'var(--good)' }}>{result}</div>}
        {error && <div style={{ marginTop: 14, font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{error}</div>}
      </Card>

      {user.gw2AccountName && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to={`/players/${encodeURIComponent(user.gw2AccountName)}`} style={{ font: '600 12px var(--font-sans)', color: 'var(--gold)' }}>
            View your player profile →
          </Link>
        </div>
      )}

      <Card style={{ padding: 22, marginTop: 16 }}>
        <div style={{ font: '700 14px var(--font-sans)', color: 'var(--text)', marginBottom: 4 }}>Import from dps.report</div>
        <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-55)', marginTop: 8, marginBottom: 14, lineHeight: 1.6 }}>
          Already have a history of logs on dps.report? Paste your user token below to import them here instead of
          re-uploading each file. Find your token at{' '}
          <a href="https://dps.report/" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>
            dps.report
          </a>{' '}
          — it's stored in your browser's cookies for that site, or shown on any log page you've uploaded. Treat it
          like a password: anyone with it can see everything ever uploaded under it.
        </div>
        <form onSubmit={handleImportDpsReport}>
          <input
            type="text"
            value={dpsToken}
            onChange={(e) => setDpsToken(e.target.value)}
            placeholder="dps.report user token"
            disabled={Boolean(dpsStatus && !dpsStatus.done)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              font: '400 12px var(--font-mono)',
              color: 'var(--text)',
            }}
          />
          <div style={{ marginTop: 12 }}>
            <GoldButton type="submit" disabled={dpsStarting || !dpsToken.trim() || Boolean(dpsStatus && !dpsStatus.done)}>
              {dpsStarting ? 'Starting…' : 'Import logs'}
            </GoldButton>
          </div>
        </form>

        {dpsStatus && (
          <div style={{ marginTop: 16 }}>
            <div style={{ height: 6, background: 'var(--bg-chip)', borderRadius: 3 }}>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: 'var(--gold)',
                  width: `${dpsStatus.total ? Math.round((dpsStatus.processed / dpsStatus.total) * 100) : 100}%`,
                }}
              />
            </div>
            <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-55)', marginTop: 8 }}>
              {dpsStatus.done ? (
                <>
                  Done — {dpsStatus.succeeded} imported, {dpsStatus.failed} skipped/failed of {dpsStatus.total}.
                </>
              ) : (
                <>
                  Importing… {dpsStatus.processed} / {dpsStatus.total} processed ({dpsStatus.succeeded} succeeded so
                  far).
                </>
              )}
            </div>
          </div>
        )}

        {dpsError && <div style={{ marginTop: 14, font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{dpsError}</div>}
      </Card>

      <div style={{ textAlign: 'center', marginTop: 22 }}>
        <button
          onClick={() => {
            navigate('/');
            window.dispatchEvent(new CustomEvent(REPLAY_TOUR_EVENT));
          }}
          className="u-btn-ghost"
          style={{ font: '600 12px var(--font-sans)', color: 'var(--text-55)', padding: '8px 14px', borderRadius: 8 }}
        >
          Replay the site tour
        </button>
      </div>
    </div>
  );
}
