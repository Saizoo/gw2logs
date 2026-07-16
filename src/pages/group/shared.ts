import type { SignupStatus } from '../../lib/api';

export function formatLogDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Next `count` raid-night dates (YYYY-MM-DD, local calendar) derived from
// the group's recurring raidDays. The schedule's timezone is free text, so
// nights are identified by calendar day rather than an exact instant —
// "Tuesday's raid" is unambiguous to the people signing up for it.
export function upcomingRaidDates(raidDays: string[], count: number): string[] {
  if (raidDays.length === 0) return [];
  const dates: string[] = [];
  const cursor = new Date();
  for (let i = 0; i < 21 && dates.length < count; i++) {
    const weekday = cursor.toLocaleDateString('en-US', { weekday: 'short' });
    if (raidDays.includes(weekday)) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function signupDateLabel(date: string): string {
  // Parse as local calendar day — new Date('YYYY-MM-DD') would read it as
  // UTC midnight and shift the weekday for anyone west of Greenwich.
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const today = new Date();
  const isToday = dt.getFullYear() === today.getFullYear() && dt.getMonth() === today.getMonth() && dt.getDate() === today.getDate();
  const label = dt.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  return isToday ? `Tonight — ${label}` : label;
}

export const SIGNUP_META: Record<SignupStatus, { label: string; color: string; bg: string }> = {
  in: { label: 'In', color: 'var(--good)', bg: 'var(--good-dim)' },
  late: { label: 'Late', color: 'var(--gold)', bg: 'oklch(0.78 0.14 85 / 15%)' },
  out: { label: 'Out', color: 'var(--bad)', bg: 'var(--bad-dim)' },
};

export const inputStyle = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontSize: 12.5,
  padding: '8px 12px',
  borderRadius: 8,
  fontFamily: 'var(--font-sans)',
} as const;

export const ghostBtnStyle = {
  font: '600 12px var(--font-sans)',
  padding: '9px 14px',
  borderRadius: 10,
  background: 'var(--bg-chip)',
  color: 'var(--text-80)',
  border: '1px solid var(--border)',
} as const;

export const smallBtnStyle = {
  font: '600 11px var(--font-sans)',
  padding: '6px 10px',
  borderRadius: 8,
  background: 'var(--bg-chip)',
  color: 'var(--text-80)',
  border: '1px solid var(--border)',
} as const;
