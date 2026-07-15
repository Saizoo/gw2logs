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
