import { useState } from 'react';
import { api, type Announcement } from '../lib/api';
import { useApiQuery } from '../hooks/useApiQuery';

// Site-wide announcement banner, shown under the nav on every page until
// the announcement expires (or the admin pulls it). Dismissals are
// per-announcement and local to this browser — a new announcement always
// shows, a dismissed one stays gone even across reloads.

const DISMISSED_KEY = 'gw2logs:dismissed-announcements';

function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

const SEVERITY_STYLE: Record<Announcement['severity'], { color: string; bg: string; border: string; icon: string }> = {
  info: {
    color: 'var(--gold)',
    bg: 'oklch(0.78 0.14 85 / 8%)',
    border: 'oklch(0.78 0.14 85 / 30%)',
    icon: 'ℹ',
  },
  warning: {
    color: 'oklch(0.8 0.15 70)',
    bg: 'oklch(0.8 0.15 70 / 10%)',
    border: 'oklch(0.8 0.15 70 / 35%)',
    icon: '⚠',
  },
  critical: {
    color: 'var(--bad)',
    bg: 'oklch(0.6 0.2 25 / 12%)',
    border: 'oklch(0.6 0.2 25 / 40%)',
    icon: '⚠',
  },
};

export function AnnouncementBanner() {
  const { data: announcements } = useApiQuery(() => api.activeAnnouncements(), []);
  const [dismissed, setDismissed] = useState<Set<string>>(readDismissed);

  if (!announcements) return null;
  const visible = announcements.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
    } catch {
      // Storage full/blocked — banner just reappears next load.
    }
  };

  return (
    <div style={{ maxWidth: 1280, margin: '14px auto 0', padding: '0 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {visible.map((a) => {
        const s = SEVERITY_STYLE[a.severity] ?? SEVERITY_STYLE.info;
        return (
          <div
            key={a.id}
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              borderRadius: 12,
              background: s.bg,
              border: `1px solid ${s.border}`,
            }}
          >
            <span aria-hidden style={{ font: '700 13px var(--font-sans)', color: s.color, flexShrink: 0 }}>{s.icon}</span>
            <span style={{ font: '500 12.5px/1.5 var(--font-sans)', color: 'var(--text-85)' }}>{a.message}</span>
            {a.expiresAt && (
              <span style={{ font: '400 11px var(--font-sans)', color: 'var(--text-50)', marginLeft: 4, flexShrink: 0 }}>
                until {new Date(a.expiresAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => dismiss(a.id)}
              aria-label="Dismiss announcement"
              className="u-btn-ghost"
              style={{ marginLeft: 'auto', flexShrink: 0, font: '600 12px var(--font-sans)', color: 'var(--text-55)', background: 'none', border: 'none', padding: '2px 6px', borderRadius: 6, cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
