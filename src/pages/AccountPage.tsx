import { useEffect, useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { REPLAY_TOUR_EVENT } from '../components/OnboardingTour';
import { api, ApiError, type ApiTokenSummary, type CurrentUser } from '../lib/api';

// Relative "3h" / "2d" ago from an ISO timestamp, for the auto-import status.
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
import { useCurrentUser } from '../hooks/useCurrentUser';
import { LoadingState } from '../components/QueryStates';
import { Badge, Card, GoldButton } from '../components/atoms';
import { toast } from '../lib/toast';
import { useTheme } from '../lib/theme';

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, loading, refresh } = useCurrentUser();
  const [apiKey, setApiKey] = useState('');
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const [dpsToken, setDpsToken] = useState('');
  const [dpsBusy, setDpsBusy] = useState(false);
  const [dpsError, setDpsError] = useState<string | null>(null);
  const [dpsNote, setDpsNote] = useState<string | null>(null);

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

  async function handleLinkDpsReport(e: React.FormEvent) {
    e.preventDefault();
    setDpsError(null);
    setDpsNote(null);
    setDpsBusy(true);
    try {
      await api.linkDpsReport(dpsToken.trim());
      setDpsToken('');
      setDpsNote('Linked — importing your recent history now. New logs will auto-import every 15 minutes.');
      refresh();
    } catch (err) {
      setDpsError(err instanceof ApiError ? err.message : 'Failed to link dps.report token');
    } finally {
      setDpsBusy(false);
    }
  }

  async function handleUnlinkDpsReport() {
    setDpsError(null);
    setDpsNote(null);
    setDpsBusy(true);
    try {
      await api.unlinkDpsReport();
      setDpsNote('Disconnected — new dps.report uploads will no longer import.');
      refresh();
    } catch (err) {
      setDpsError(err instanceof ApiError ? err.message : 'Failed to disconnect');
    } finally {
      setDpsBusy(false);
    }
  }

  async function handleSyncDpsReport() {
    setDpsError(null);
    setDpsNote(null);
    setDpsBusy(true);
    try {
      const res = await api.syncDpsReport();
      setDpsNote(res.imported > 0 ? `Imported ${res.imported} new log${res.imported === 1 ? '' : 's'}.` : 'Already up to date — no new logs.');
      refresh();
    } catch (err) {
      setDpsError(err instanceof ApiError ? err.message : 'Failed to sync');
    } finally {
      setDpsBusy(false);
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
            borderRadius: 'var(--radius-md)',
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
                borderRadius: 'var(--radius-md)',
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
                borderRadius: 'var(--radius-md)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ font: '700 14px var(--font-sans)', color: 'var(--text)' }}>dps.report auto-import</div>
          {user.dpsReportLinked && (
            <span style={{ font: '700 9.5px var(--font-sans)', letterSpacing: '.05em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 999, color: 'var(--good)', background: 'var(--good-dim, color-mix(in srgb, var(--good) 15%, transparent))', border: '1px solid color-mix(in srgb, var(--good) 40%, transparent)' }}>
              Connected
            </span>
          )}
        </div>

        {user.dpsReportLinked ? (
          <>
            <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-55)', marginTop: 8, marginBottom: 14, lineHeight: 1.6 }}>
              New logs you upload to dps.report import here automatically, about every 15 minutes — no re-uploading.
              {user.dpsReportLastImportAt && (
                <> Last new log seen <b style={{ color: 'var(--text-75)' }}>{timeAgo(user.dpsReportLastImportAt)}</b>.</>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <GoldButton type="button" onClick={handleSyncDpsReport} disabled={dpsBusy}>
                {dpsBusy ? 'Working…' : 'Import now'}
              </GoldButton>
              <button
                type="button"
                onClick={handleUnlinkDpsReport}
                disabled={dpsBusy}
                style={{ font: '650 12.5px var(--font-sans)', padding: '9px 15px', borderRadius: 'var(--radius-md)', background: 'var(--bad-dim)', color: 'var(--bad)', border: '1px solid color-mix(in srgb, var(--bad) 40%, transparent)', cursor: dpsBusy ? 'default' : 'pointer', opacity: dpsBusy ? 0.6 : 1 }}
              >
                Disconnect
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-55)', marginTop: 8, marginBottom: 14, lineHeight: 1.6 }}>
              Link your dps.report user token and every log you upload there imports here automatically. Find your token
              at{' '}
              <a href="https://dps.report/" target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>
                dps.report
              </a>{' '}
              — it's in that site's cookies, or shown on any log page you've uploaded. Treat it like a password: anyone
              with it can see everything ever uploaded under it.
            </div>
            <form onSubmit={handleLinkDpsReport}>
              <input
                type="text"
                value={dpsToken}
                onChange={(e) => setDpsToken(e.target.value)}
                placeholder="dps.report user token"
                disabled={dpsBusy}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  font: '400 12px var(--font-mono)',
                  color: 'var(--text)',
                }}
              />
              <div style={{ marginTop: 12 }}>
                <GoldButton type="submit" disabled={dpsBusy || !dpsToken.trim()}>
                  {dpsBusy ? 'Linking…' : 'Connect & import'}
                </GoldButton>
              </div>
            </form>
          </>
        )}

        {dpsNote && <div style={{ marginTop: 14, font: '500 12px var(--font-sans)', color: 'var(--text-70)' }}>{dpsNote}</div>}
        {dpsError && <div style={{ marginTop: 14, font: '500 12px var(--font-sans)', color: 'var(--bad)' }}>{dpsError}</div>}
      </Card>

      {user.gw2AccountName && <GuildCard />}

      <AppearanceCard />

      <PrivacyCard user={user} onSaved={refresh} />

      <ApiTokensCard />

      <DangerZoneCard />

      <div style={{ textAlign: 'center', marginTop: 22 }}>
        <button
          onClick={() => {
            navigate('/');
            window.dispatchEvent(new CustomEvent(REPLAY_TOUR_EVENT));
          }}
          className="u-btn-ghost"
          style={{ font: '600 12px var(--font-sans)', color: 'var(--text-55)', padding: '8px 14px', borderRadius: 'var(--radius-md)' }}
        >
          Replay the site tour
        </button>
      </div>
    </div>
  );
}

const tokenInputStyle = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontSize: 12.5,
  padding: '9px 12px',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-sans)',
} as const;

const tokenGhostSmall = {
  font: '600 12px var(--font-sans)',
  padding: '8px 14px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--bg-chip)',
  color: 'var(--text-80)',
  border: '1px solid var(--border)',
} as const;

// Permanent account deletion + data wipe. Type-to-confirm so it can't be a
// stray click; the server does the actual wipe (see routes/account.ts).
function DangerZoneCard() {
  const navigate = useNavigate();
  const { refresh } = useCurrentUser();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const phrase = 'delete my account';
  const armed = confirm.trim().toLowerCase() === phrase;

  async function handleDelete() {
    if (!armed || busy) return;
    setBusy(true);
    try {
      await api.deleteAccount();
      toast.success('Your account and data have been deleted');
      await refresh();
      navigate('/');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete account');
      setBusy(false);
    }
  }

  return (
    <Card style={{ padding: 22, marginTop: 16, border: '1px solid color-mix(in srgb, var(--bad) 45%, transparent)' }}>
      <div style={{ font: '800 15px var(--font-sans)', color: 'var(--bad)', marginBottom: 4 }}>Delete account</div>
      <div style={{ font: '400 12px/1.65 var(--font-sans)', color: 'var(--text-58)', marginBottom: 14 }}>
        Permanently deletes your account and wipes your data. Your Discord sign-in, linked GW2 API key, settings,
        sessions and addon tokens are removed, and your account and character names are erased from every log — the
        anonymised numbers stay so shared squad logs aren&apos;t broken. Logs you uploaded become anonymous, and any
        group you lead is handed to another member.{' '}
        <strong style={{ color: 'var(--text-80)' }}>This can&apos;t be undone.</strong>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={`Type "${phrase}" to confirm`}
          aria-label="Type to confirm account deletion"
          style={{ ...tokenInputStyle, flex: 1, minWidth: 260 }}
        />
        <button
          onClick={handleDelete}
          disabled={!armed || busy}
          style={{
            font: '700 12.5px var(--font-sans)',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            background: armed ? 'var(--bad)' : 'var(--bg-chip)',
            color: armed ? 'var(--on-art)' : 'var(--text-50)',
            border: `1px solid ${armed ? 'var(--bad)' : 'var(--border)'}`,
            cursor: armed && !busy ? 'pointer' : 'default',
            opacity: busy ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {busy ? 'Deleting…' : 'Delete my account'}
        </button>
      </div>
    </Card>
  );
}

// Personal access tokens for the desktop / Nexus addon. The raw token is shown
// once, right after creation, then only ever listed by name + usage.
function ApiTokensCard() {
  const [tokens, setTokens] = useState<ApiTokenSummary[] | null>(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState<{ name: string; token: string } | null>(null);

  function load() {
    api.listApiTokens().then(setTokens).catch(() => setTokens([]));
  }
  useEffect(() => {
    load();
  }, []);

  async function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const res = await api.createApiToken(trimmed);
      setFresh({ name: res.name, token: res.token });
      setName('');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create token');
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string, tokenName: string) {
    if (!window.confirm(`Revoke "${tokenName}"? Any device using it will stop working immediately.`)) return;
    try {
      await api.revokeApiToken(id);
      toast.success('Token revoked');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to revoke token');
    }
  }

  return (
    <Card style={{ padding: 22, marginTop: 16 }}>
      <div style={{ font: '800 15px var(--font-sans)', marginBottom: 4 }}>Desktop &amp; addon access</div>
      <div style={{ font: '400 12px/1.6 var(--font-sans)', color: 'var(--text-58)', marginBottom: 16 }}>
        Create a personal access token to connect the Nexus addon for automatic log uploads and in-game raid
        reminders. Paste it into the addon once. Treat it like a password — it can upload logs and read your groups
        on your behalf.
      </div>

      {fresh && (
        <div style={{ padding: 14, marginBottom: 16, background: 'var(--gold-dim)', border: '1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)' }}>
          <div style={{ font: '700 11px var(--font-sans)', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
            Copy your token now — you won&apos;t be able to see it again
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{ font: '600 12.5px var(--font-mono)', color: 'var(--text)', background: 'var(--bg-input)', border: '1px solid var(--border)', padding: '9px 11px', wordBreak: 'break-all', flex: 1, minWidth: 220 }}>
              {fresh.token}
            </code>
            <button className="u-btn-ghost" style={tokenGhostSmall} onClick={() => { void navigator.clipboard?.writeText(fresh.token); toast.success('Copied to clipboard'); }}>
              Copy
            </button>
            <button className="u-btn-ghost" style={tokenGhostSmall} onClick={() => setFresh(null)}>
              Done
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: tokens && tokens.length ? 16 : 0 }}>
        <input
          placeholder="Token name (e.g. My desktop)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
          maxLength={60}
          style={{ ...tokenInputStyle, flex: 1, minWidth: 200 }}
        />
        <GoldButton onClick={create} disabled={creating || !name.trim()}>
          {creating ? 'Creating…' : 'Create token'}
        </GoldButton>
      </div>

      {tokens && tokens.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tokens.map((t) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-chip)', border: '1px solid var(--border-faint)', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '700 13px var(--font-sans)' }}>{t.name}</div>
                <div style={{ font: '400 11px var(--font-sans)', color: 'var(--text-55)', marginTop: 2 }}>
                  Created {new Date(t.createdAt).toLocaleDateString()} ·{' '}
                  {t.lastUsedAt ? `last used ${new Date(t.lastUsedAt).toLocaleDateString()}` : 'never used'}
                </div>
              </div>
              <button className="u-btn-ghost" style={{ ...tokenGhostSmall, color: 'var(--bad)' }} onClick={() => revoke(t.id, t.name)}>
                Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// Light / dark theme. Applies instantly and is saved to this browser (not
// the account), so it works signed out too.
function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const dark = theme === 'dark';
  return (
    <Card style={{ padding: 22, marginTop: 16 }}>
      <div style={{ font: '800 15px var(--font-sans)', marginBottom: 4 }}>Appearance</div>
      <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-58)', marginBottom: 16 }}>
        Switch between the light and dark theme. Saved to this browser; defaults to your system preference.
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ font: '700 13px var(--font-sans)' }}>Dark theme</div>
            {dark && <Badge tone="gold">On</Badge>}
          </div>
          <div style={{ font: '400 11.5px/1.55 var(--font-sans)', color: 'var(--text-55)', marginTop: 3 }}>
            Use a dark background across the whole app.
          </div>
        </div>
        <button
          role="switch"
          aria-checked={dark}
          aria-label="Dark theme"
          onClick={() => setTheme(dark ? 'light' : 'dark')}
          style={{
            position: 'relative',
            width: 46,
            height: 25,
            borderRadius: 'var(--radius-md)',
            flexShrink: 0,
            marginTop: 2,
            background: dark ? 'var(--gold-grad)' : 'color-mix(in srgb, var(--color-text) 14%, transparent)',
            border: '1px solid ' + (dark ? 'transparent' : 'var(--border)'),
            cursor: 'pointer',
            transition: 'background .15s ease',
          }}
        >
          <span aria-hidden style={{ position: 'absolute', top: 2, left: dark ? 23 : 2, width: 19, height: 19, borderRadius: '50%', background: dark ? 'var(--gold-fg)' : 'var(--text-85)', transition: 'left .15s ease' }} />
        </button>
      </div>
    </Card>
  );
}

// Privacy toggles: hide my name from shared log displays, and/or make my
// profile page private. Saves each toggle immediately.
function PrivacyCard({ user, onSaved }: { user: CurrentUser; onSaved: () => void }) {
  const [saving, setSaving] = useState<string | null>(null);

  async function set(key: 'hideName' | 'privateProfile', value: boolean, message: string) {
    setSaving(key);
    try {
      await api.updatePrivacy({ [key]: value });
      toast.success(message);
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card style={{ padding: 22, marginTop: 16 }}>
      <div style={{ font: '800 15px var(--font-sans)', marginBottom: 4 }}>Privacy</div>
      <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-58)', marginBottom: 16 }}>
        Control how your name and profile appear to other people. Your own parses always stay visible.
      </div>
      <PrivacyToggle
        title="Hide my name"
        description="Show your parses as “Anonymous” on leaderboards, benchmarks and log squad tables. Your DPS still counts and ranks — only your account and character names are hidden. You always see your own name."
        on={user.hideName}
        busy={saving === 'hideName'}
        onToggle={() => set('hideName', !user.hideName, user.hideName ? 'Your name is now visible' : 'Your name is now hidden')}
      />
      <div style={{ height: 12 }} />
      <PrivacyToggle
        title="Private profile"
        description="Only you can view your player profile page. Others who open it see a “this profile is private” notice."
        on={user.privateProfile}
        busy={saving === 'privateProfile'}
        onToggle={() => set('privateProfile', !user.privateProfile, user.privateProfile ? 'Your profile is now public' : 'Your profile is now private')}
      />
    </Card>
  );
}

function PrivacyToggle({ title, description, on, busy, onToggle }: { title: string; description: string; on: boolean; busy: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ font: '700 13px var(--font-sans)' }}>{title}</div>
          {on && <Badge tone="gold">On</Badge>}
        </div>
        <div style={{ font: '400 11.5px/1.55 var(--font-sans)', color: 'var(--text-55)', marginTop: 3 }}>{description}</div>
      </div>
      <button
        role="switch"
        aria-checked={on}
        aria-label={title}
        onClick={onToggle}
        disabled={busy}
        style={{
          position: 'relative',
          width: 46,
          height: 25,
          borderRadius: 'var(--radius-md)',
          flexShrink: 0,
          marginTop: 2,
          background: on ? 'var(--gold-grad)' : 'color-mix(in srgb, var(--color-text) 14%, transparent)',
          border: '1px solid ' + (on ? 'transparent' : 'var(--border)'),
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.6 : 1,
          transition: 'background .15s ease',
        }}
      >
        <span aria-hidden style={{ position: 'absolute', top: 2, left: on ? 23 : 2, width: 19, height: 19, borderRadius: '50%', background: on ? 'var(--gold-fg)' : 'var(--text-85)', transition: 'left .15s ease' }} />
      </button>
    </div>
  );
}

// "Which guild do you represent?" — lists the guilds on the linked GW2
// account (live from the API). Picking one joins that guild's auto-created
// group; picking None (or switching) leaves it.
function GuildCard() {
  const [nonce, setNonce] = useState(0);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.accountGuilds>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .accountGuilds()
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : 'Failed to load guilds from the GW2 API'));
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  async function choose(guildId: string | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await api.setDisplayGuild(guildId);
      setGroupId(res.displayedGuild?.groupId ?? null);
      setNonce((n) => n + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update guild');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ padding: 22, marginTop: 20 }}>
      <div style={{ font: '700 14px var(--font-sans)', color: 'var(--text)', marginBottom: 4 }}>Guild</div>
      <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-60)', marginBottom: 14, lineHeight: 1.5 }}>
        Pick the guild you represent. You'll join its guild group automatically — schedules, signups, clears and
        attendance for the whole guild — and switching or choosing None leaves it again.
      </div>

      {!data && !error && <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-55)' }}>Loading guilds from the GW2 API…</div>}
      {error && <div style={{ font: '500 12px var(--font-sans)', color: 'var(--bad)', marginBottom: 10 }}>{error}</div>}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.guilds.map((g) => {
            const active = data.displayedGuildId === g.id;
            return (
              <button
                key={g.id}
                disabled={busy || active}
                onClick={() => choose(g.id)}
                className={active ? undefined : 'u-chip'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: active ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'color-mix(in srgb, var(--color-text) 4%, transparent)',
                  border: `1px solid ${active ? 'color-mix(in srgb, var(--color-accent) 40%, transparent)' : 'var(--border)'}`,
                  cursor: active ? 'default' : 'pointer',
                }}
              >
                <span style={{ font: '800 12px var(--font-mono)', color: 'var(--gold)', flex: 'none' }}>[{g.tag}]</span>
                <span style={{ font: '600 13px var(--font-sans)', color: 'var(--text-88)' }}>{g.name}</span>
                {g.isLeader && (
                  <span style={{ font: '700 9px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 'var(--radius-md)', background: 'var(--gold-dim)', color: 'var(--gold)' }}>
                    Leader
                  </span>
                )}
                {active && <span style={{ marginLeft: 'auto', font: '600 11px var(--font-sans)', color: 'var(--gold)' }}>✓ Displayed</span>}
              </button>
            );
          })}
          {data.guilds.length === 0 && (
            <div style={{ font: '400 12px var(--font-sans)', color: 'var(--text-55)' }}>No guilds found on this GW2 account.</div>
          )}
          {data.displayedGuildId && (
            <button
              disabled={busy}
              onClick={() => choose(null)}
              className="u-btn-ghost"
              style={{ alignSelf: 'flex-start', font: '600 11.5px var(--font-sans)', color: 'var(--text-55)', padding: '7px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
            >
              Display no guild
            </button>
          )}
          {groupId && (
            <div style={{ font: '500 12px var(--font-sans)', color: 'var(--good)' }}>
              Joined the guild group — <Link to={`/groups/${groupId}`} style={{ color: 'var(--gold)', fontWeight: 600 }}>open it</Link>.
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
