import { useEffect, useState } from 'react';
import { api, ApiError, type PlayerProfile } from '../lib/api';
import { professionColor, professionIconPath } from '../data/gw2-data';

// The three squad roles, coloured to match the profile's Class & Role panel.
const ROLE_META: Record<string, { label: string; color: string }> = {
  dps: { label: 'DPS', color: 'oklch(0.65 0.19 25)' },
  boon_dps: { label: 'Boon DPS', color: 'var(--gold)' },
  boon_heal: { label: 'Healer', color: 'var(--good)' },
};

// Tiny cache so hovering the same member twice doesn't refetch. Keyed by
// account name; holds the resolved profile, a private marker, or an error.
type CacheEntry = { state: 'ok'; profile: PlayerProfile } | { state: 'private' } | { state: 'empty' } | { state: 'error' };
const cache = new Map<string, CacheEntry>();

// A compact echo of the profile's "Class & Role" section — the specs a member
// plays most and their role split — shown when hovering a roster row so the
// leader can size up the squad without leaving the group page.
export function MemberClassRoleCard({ account }: { account: string }) {
  const [entry, setEntry] = useState<CacheEntry | null>(cache.get(account) ?? null);
  const [loading, setLoading] = useState(!cache.has(account));

  useEffect(() => {
    if (cache.has(account)) {
      setEntry(cache.get(account)!);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    api
      .player(account)
      .then((res) => {
        const next: CacheEntry = res.private
          ? { state: 'private' }
          : (res as PlayerProfile).specBreakdown.length === 0
            ? { state: 'empty' }
            : { state: 'ok', profile: res as PlayerProfile };
        cache.set(account, next);
        if (alive) setEntry(next);
      })
      .catch((err) => {
        // A 404 just means this account has no player profile / no logs yet —
        // that's the "empty" state, not a failure worth alarming about.
        const next: CacheEntry = err instanceof ApiError && err.status === 404 ? { state: 'empty' } : { state: 'error' };
        cache.set(account, next);
        if (alive) setEntry(next);
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [account]);

  return (
    <div
      style={{
        width: 260,
        padding: '14px 15px',
        background: 'oklch(0.16 0.014 250 / 99%)',
        border: '1px solid oklch(1 0 0 / 12%)',
        borderRadius: 12,
        boxShadow: '0 20px 46px -16px rgba(0,0,0,.7)',
      }}
    >
      <div style={{ font: '700 12.5px var(--font-sans)', marginBottom: 2 }}>{account}</div>
      <div style={{ font: '700 9px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-45)', marginBottom: 11 }}>
        Class &amp; Role
      </div>

      {loading && <SkeletonRows />}

      {!loading && entry?.state === 'ok' && <ClassRoleBody profile={entry.profile} />}

      {!loading && entry && entry.state !== 'ok' && (
        <div style={{ font: '400 11.5px var(--font-sans)', color: 'var(--text-55)', lineHeight: 1.5 }}>
          {entry.state === 'private'
            ? 'This profile is private.'
            : entry.state === 'empty'
              ? 'No logged encounters yet.'
              : "Couldn't load this profile."}
        </div>
      )}
    </div>
  );
}

function ClassRoleBody({ profile }: { profile: PlayerProfile }) {
  const topSpecs = profile.specBreakdown.slice(0, 4);
  return (
    <>
      <div style={{ font: '700 9px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-45)', marginBottom: 7 }}>
        Top specs
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {topSpecs.map((s) => {
          const color = professionColor(s.profession);
          return (
            <div key={s.spec} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img
                src={professionIconPath(s.profession, s.spec !== s.profession ? s.spec : null)}
                alt=""
                width={17}
                height={17}
                style={{ objectFit: 'contain', flex: 'none' }}
                onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 2 }}>
                  <span style={{ font: '600 11px var(--font-sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.spec}</span>
                  <span style={{ font: '600 10px var(--font-mono)', color: 'var(--text-50)', flex: 'none' }}>{s.pct}%</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'oklch(1 0 0 / 6%)', overflow: 'hidden' }}>
                  <div style={{ width: `${s.pct}%`, height: '100%', borderRadius: 3, background: color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {profile.roleBreakdown.length > 0 && (
        <>
          <div style={{ font: '700 9px var(--font-sans)', letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--text-45)', margin: '13px 0 7px' }}>
            Role split
          </div>
          <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2, background: 'oklch(1 0 0 / 4%)' }}>
            {profile.roleBreakdown.map((r) => (
              <div key={r.role} title={`${ROLE_META[r.role]?.label ?? r.role} · ${r.pct}%`} style={{ width: `${r.pct}%`, background: ROLE_META[r.role]?.color ?? 'var(--text-40)' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            {profile.roleBreakdown.map((r) => (
              <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: ROLE_META[r.role]?.color ?? 'var(--text-40)', flex: 'none' }} />
                <span style={{ font: '600 10.5px var(--font-sans)', color: 'var(--text-70)' }}>{ROLE_META[r.role]?.label ?? r.role}</span>
                <span style={{ font: '600 10px var(--font-mono)', color: 'var(--text-45)' }}>{r.pct}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function SkeletonRows() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="u-skeleton" style={{ height: 12, width: `${90 - i * 12}%`, borderRadius: 5 }} />
      ))}
    </div>
  );
}
