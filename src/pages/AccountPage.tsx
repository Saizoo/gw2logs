import { useEffect, useRef, useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { REPLAY_TOUR_EVENT } from '../components/OnboardingTour';
import { api, ApiError, type CurrentUser, type DpsReportImportStatus } from '../lib/api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { LoadingState } from '../components/QueryStates';
import { Badge, Card, GoldButton } from '../components/atoms';
import { toast } from '../lib/toast';

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
            borderRadius: 0,
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
                borderRadius: 0,
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
                borderRadius: 0,
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
              borderRadius: 0,
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
            <div style={{ height: 6, background: 'var(--bg-chip)', borderRadius: 0 }}>
              <div
                style={{
                  height: 6,
                  borderRadius: 0,
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

      {user.gw2AccountName && <GuildCard />}

      <PrivacyCard user={user} onSaved={refresh} />

      <div style={{ textAlign: 'center', marginTop: 22 }}>
        <button
          onClick={() => {
            navigate('/');
            window.dispatchEvent(new CustomEvent(REPLAY_TOUR_EVENT));
          }}
          className="u-btn-ghost"
          style={{ font: '600 12px var(--font-sans)', color: 'var(--text-55)', padding: '8px 14px', borderRadius: 0 }}
        >
          Replay the site tour
        </button>
      </div>
    </div>
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
          borderRadius: 0,
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
                  borderRadius: 0,
                  background: active ? 'color-mix(in srgb, var(--color-accent) 12%, transparent)' : 'color-mix(in srgb, var(--color-text) 4%, transparent)',
                  border: `1px solid ${active ? 'color-mix(in srgb, var(--color-accent) 40%, transparent)' : 'var(--border)'}`,
                  cursor: active ? 'default' : 'pointer',
                }}
              >
                <span style={{ font: '800 12px var(--font-mono)', color: 'var(--gold)', flex: 'none' }}>[{g.tag}]</span>
                <span style={{ font: '600 13px var(--font-sans)', color: 'var(--text-88)' }}>{g.name}</span>
                {g.isLeader && (
                  <span style={{ font: '700 9px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 0, background: 'var(--gold-dim)', color: 'var(--gold)' }}>
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
              style={{ alignSelf: 'flex-start', font: '600 11.5px var(--font-sans)', color: 'var(--text-55)', padding: '7px 12px', borderRadius: 0, border: '1px solid var(--border)' }}
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
