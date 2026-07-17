import type { SignupStatus } from '../../lib/api';

export function formatLogDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Weekday + YYYY-MM-DD of an instant on the group's calendar. Falls back
// to the browser's zone when the group hasn't set one (timeZone
// undefined) or set garbage Intl rejects.
function calendarDay(instant: Date, timeZone?: string): { weekday: string; date: string } {
  let opts: Intl.DateTimeFormatOptions = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', timeZone };
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', opts).formatToParts(instant);
  } catch {
    parts = new Intl.DateTimeFormat('en-US', { ...opts, timeZone: undefined }).formatToParts(instant);
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { weekday: get('weekday'), date: `${get('year')}-${get('month')}-${get('day')}` };
}

// Next `count` raid-night dates (YYYY-MM-DD on the GROUP's calendar)
// derived from the group's recurring raidDays. Nights are identified by
// calendar day rather than an exact instant — "Tuesday's raid" is
// unambiguous to the people signing up for it — but the day must be read
// off the group's clock, not the viewer's: a browser a timezone-day away
// from the group would otherwise generate dates the server (which
// validates in group time) rejects as past.
export function upcomingRaidDates(raidDays: string[], count: number, timeZone?: string): string[] {
  if (raidDays.length === 0) return [];
  const dates: string[] = [];
  const DAY_MS = 24 * 60 * 60 * 1000;
  const start = Date.now();
  for (let i = 0; i < 21 && dates.length < count; i++) {
    const { weekday, date } = calendarDay(new Date(start + i * DAY_MS), timeZone);
    // 24h steps can land on a repeated calendar day across a DST fall-back;
    // skip the duplicate rather than listing the same night twice.
    if (raidDays.includes(weekday) && dates[dates.length - 1] !== date) dates.push(date);
  }
  return dates;
}

export function signupDateLabel(date: string, timeZone?: string): string {
  // Parse as local calendar day — new Date('YYYY-MM-DD') would read it as
  // UTC midnight and shift the weekday for anyone west of Greenwich.
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  // "Tonight" means today on the group's calendar, matching the dates
  // upcomingRaidDates generates.
  const isToday = date === calendarDay(new Date(), timeZone).date;
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
