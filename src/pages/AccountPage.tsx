import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { LoadingState } from '../components/QueryStates';
import { Badge } from '../components/atoms';

export default function AccountPage() {
  const { user, loading, refresh } = useCurrentUser();
  const [apiKey, setApiKey] = useState('');
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

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
      setResult(
        res.guildsSynced && res.guilds.length > 0
          ? `Linked ${res.gw2AccountName} — synced ${res.guilds.length} guild${res.guilds.length === 1 ? '' : 's'}.`
          : `Linked ${res.gw2AccountName}.`,
      );
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

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        {user.discordAvatar && (
          <img src={user.discordAvatar} alt="" style={{ width: 44, height: 44, borderRadius: '50%' }} />
        )}
        <div>
          <div style={{ font: '800 18px var(--font-sans)', color: 'var(--text)' }}>{user.discordUsername}</div>
          <div style={{ font: '500 12px var(--font-sans)', color: 'var(--text-40)' }}>Signed in with Discord</div>
        </div>
        <button
          onClick={handleLogout}
          style={{ marginLeft: 'auto', font: '600 12px var(--font-sans)', color: 'var(--text-45)', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 6 }}
        >
          Sign out
        </button>
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 22 }}>
        <div style={{ font: '700 14px var(--font-sans)', color: 'var(--text)', marginBottom: 4 }}>Guild Wars 2 account</div>

        {user.gw2AccountName ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <span style={{ font: '700 14px var(--font-mono)', color: 'var(--gold)' }}>{user.gw2AccountName}</span>
              <Badge tone="good">Verified</Badge>
            </div>
            <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-40)', marginTop: 4 }}>
              Linked {user.gw2LinkedAt ? new Date(user.gw2LinkedAt).toLocaleDateString() : ''}. Logs uploaded from any
              character on this account are now attributed to your profile, and your guild memberships stay in sync.
            </div>
            <button
              onClick={handleUnlink}
              disabled={unlinking}
              style={{ marginTop: 14, font: '600 12px var(--font-sans)', color: 'var(--bad)', padding: '8px 14px', border: '1px solid rgba(245,93,78,.3)', borderRadius: 6 }}
            >
              {unlinking ? 'Unlinking…' : 'Unlink account'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleLink}>
            <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-45)', marginTop: 8, marginBottom: 14, lineHeight: 1.6 }}>
              Link your GW2 API key to verify account ownership, attribute uploaded logs to your account name across
              all your characters, and sync your guild roster. Create a key at{' '}
              <a href="https://account.arena.net/applications" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>
                account.arena.net/applications
              </a>{' '}
              with only the <strong>account</strong> and <strong>guilds</strong> permissions checked — nothing else is
              needed, and we never request tradingpost, wallet, or character inventory access.
            </div>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
              style={{
                width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 6, font: '400 12px var(--font-mono)', color: 'var(--text)',
              }}
            />
            <button
              type="submit"
              disabled={linking || !apiKey.trim()}
              style={{
                marginTop: 12, padding: '10px 16px', background: 'var(--gold)', borderRadius: 6,
                font: '700 12px var(--font-sans)', color: '#14120f', opacity: linking || !apiKey.trim() ? 0.6 : 1,
              }}
            >
              {linking ? 'Verifying…' : 'Link account'}
            </button>
          </form>
        )}

        {result && <div style={{ marginTop: 14, font: '500 12px var(--font-sans)', color: 'var(--good)' }}>{result}</div>}
        {error && <div style={{ marginTop: 14, font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{error}</div>}
      </div>

      {user.gw2AccountName && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to={`/players/${encodeURIComponent(user.gw2AccountName)}`} style={{ font: '600 12px var(--font-sans)', color: 'var(--gold)' }}>
            View your player profile →
          </Link>
        </div>
      )}
    </div>
  );
}
