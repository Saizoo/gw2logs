// Recurring group raid-schedule constants/formatters, shared between the
// Group Detail edit form and group search/browse results.
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const DURATION_OPTIONS_MINS = [60, 90, 120, 150, 180, 210, 240] as const;

export function formatDurationMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}

// "20:00" -> "8:00 PM"
export function formatTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${mStr} ${period}`;
}

export function formatSchedule(schedule: {
  raidDays?: string[];
  raidStartTime?: string | null;
  raidDurationMins?: number | null;
  raidTimezone?: string | null;
}): string | null {
  if (!schedule.raidDays?.length) return null;
  const days = schedule.raidDays.join(', ');
  const parts = [days];
  if (schedule.raidStartTime) {
    let time = formatTime(schedule.raidStartTime);
    if (schedule.raidDurationMins) time += ` for ${formatDurationMins(schedule.raidDurationMins)}`;
    if (schedule.raidTimezone) time += ` ${schedule.raidTimezone}`;
    parts.push(time);
  }
  return parts.join(' · ');
}

// JS Date.getDay() is 0=Sun; our schedule abbreviations are Mon-first.
const DAY_ABBR_BY_INDEX = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const FULL_DAY: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

// Turns a recurring weekly schedule into the *next* occurrence relative to
// today, so a card can shout "Tonight" instead of listing static weekdays.
// `soon` is true only on a raid day itself (drives the accent treatment).
// Uses the viewer's local day — schedules carry a freeform tz string we
// can't reliably resolve, and local day is the right call for "is it today".
export function nextRaid(schedule: { raidDays?: string[]; raidStartTime?: string | null }):
  | { label: string; time: string | null; soon: boolean }
  | null {
  if (!schedule.raidDays?.length) return null;
  const set = new Set(schedule.raidDays);
  const today = new Date().getDay();
  const time = schedule.raidStartTime ? formatTime(schedule.raidStartTime) : null;

  if (set.has(DAY_ABBR_BY_INDEX[today])) return { label: 'Tonight', time, soon: true };
  for (let i = 1; i <= 6; i++) {
    const abbr = DAY_ABBR_BY_INDEX[(today + i) % 7];
    if (set.has(abbr)) return { label: FULL_DAY[abbr] ?? abbr, time, soon: false };
  }
  return null;
}
