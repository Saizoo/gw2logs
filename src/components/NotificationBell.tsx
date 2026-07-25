import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { api, type AppNotification } from '../lib/api';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Small accent per notification kind so the feed scans quickly.
const TYPE_ICON: Record<string, string> = {
  schedule_change: '📅',
  raid_plan: '📋',
  raid_reminder: '⚔️',
  group_invite: '✉️',
  invite_accepted: '✅',
};

export function NotificationBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.notifications();
      setItems(res.items);
      setUnread(res.unreadCount);
    } catch { /* signed out or offline — leave the bell quiet */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 45_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  async function openItem(n: AppNotification) {
    setOpen(false);
    if (!n.readAt) {
      setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, readAt: new Date().toISOString() } : i)));
      setUnread((u) => Math.max(0, u - 1));
      api.markNotificationRead(n.id).catch(() => {});
    }
    if (n.link) navigate(n.link);
  }

  async function markAll() {
    setItems((prev) => prev.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })));
    setUnread(0);
    api.markAllNotificationsRead().catch(() => {});
  }

  return (
    <div ref={boxRef} style={{ position: 'relative', flex: 'none' }}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) load(); }}
        aria-label="Notifications"
        style={{
          position: 'relative',
          width: 38,
          height: 38,
          borderRadius: 'var(--radius-md)',
          background: 'color-mix(in srgb, var(--color-surface) 65%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-text) 12%, transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flex: 'none',
        }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" stroke="var(--text-70)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" stroke="var(--text-70)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: '0 4px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bad)',
              color: '#fff',
              font: '800 10px var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--color-surface)',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 46,
            right: 0,
            width: 340,
            maxWidth: '90vw',
            zIndex: 80,
            background: 'var(--color-surface)',
            border: '1px solid color-mix(in srgb, var(--color-text) 16%, transparent)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 22px 50px -16px rgba(0,0,0,.7)',
            overflow: 'hidden',
            animation: 'fadeIn .16s ease both',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border-soft)' }}>
            <div style={{ font: '800 13px var(--font-sans)' }}>Notifications</div>
            {unread > 0 && (
              <button type="button" onClick={markAll} style={{ font: '600 11px var(--font-sans)', color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {items.length === 0 && (
              <div style={{ padding: '28px 16px', textAlign: 'center', font: '500 12px var(--font-sans)', color: 'var(--text-50)' }}>
                No notifications yet.
              </div>
            )}
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openItem(n)}
                style={{
                  display: 'flex',
                  gap: 10,
                  width: '100%',
                  textAlign: 'left',
                  padding: '11px 14px',
                  borderBottom: '1px solid var(--border-faint)',
                  background: n.readAt ? 'transparent' : 'color-mix(in srgb, var(--color-accent) 7%, transparent)',
                  border: 'none',
                  borderLeft: n.readAt ? '3px solid transparent' : '3px solid var(--gold)',
                  cursor: 'pointer',
                }}
              >
                <span aria-hidden style={{ fontSize: 15, flex: 'none', lineHeight: 1.3 }}>{TYPE_ICON[n.type] ?? '🔔'}</span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', font: `${n.readAt ? 600 : 700} 12px var(--font-sans)`, color: 'var(--text)', marginBottom: 2 }}>{n.title}</span>
                  {n.body && <span style={{ display: 'block', font: '400 11px var(--font-sans)', color: 'var(--text-60)', lineHeight: 1.4 }}>{n.body}</span>}
                  <span style={{ display: 'block', font: '400 10px var(--font-sans)', color: 'var(--text-45)', marginTop: 3 }}>{relativeTime(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
