import { prisma } from '../db.js';
import { decrypt } from './crypto.js';

// ---------------------------------------------------------------------------
// Timezone resolution. The schedule's raidTimezone is free text ("EST",
// "Europe/Paris", "utc") — try it as an IANA zone first, then fall back to
// a map of the abbreviations raiders actually type, then UTC. All time math
// below happens in the resolved zone's local clock, so we never need to
// convert a zone-local wall time back into an instant.
// ---------------------------------------------------------------------------

const TZ_ABBREVIATIONS: Record<string, string> = {
  EST: 'America/New_York',
  EDT: 'America/New_York',
  ET: 'America/New_York',
  CST: 'America/Chicago',
  CDT: 'America/Chicago',
  CT: 'America/Chicago',
  MST: 'America/Denver',
  MDT: 'America/Denver',
  MT: 'America/Denver',
  PST: 'America/Los_Angeles',
  PDT: 'America/Los_Angeles',
  PT: 'America/Los_Angeles',
  GMT: 'UTC',
  UTC: 'UTC',
  BST: 'Europe/London',
  CET: 'Europe/Paris',
  CEST: 'Europe/Paris',
  AEST: 'Australia/Sydney',
  AEDT: 'Australia/Sydney',
};

export function resolveTimezone(raw: string | null): string {
  if (raw) {
    const trimmed = raw.trim();
    // Abbreviation map FIRST: Intl accepts bare "EST" as a fixed UTC-5
    // zone with no daylight saving, which would silently shift a New York
    // group's reminders by an hour all summer. The map points at the real
    // DST-observing region instead.
    const mapped = TZ_ABBREVIATIONS[trimmed.toUpperCase()];
    if (mapped) return mapped;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: trimmed });
      return trimmed;
    } catch {
      // fall through to UTC
    }
  }
  return 'UTC';
}

interface ZonedNow {
  date: string; // YYYY-MM-DD
  weekday: string; // Mon..Sun
  minutes: number; // minutes since local midnight
}

export function zonedNow(timeZone: string, now = new Date()): ZonedNow {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  // Intl can render midnight as "24" with hour12:false — normalize.
  const hour = Number(get('hour')) % 24;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    weekday: get('weekday'),
    minutes: hour * 60 + Number(get('minute')),
  };
}

function addDays(date: string, days: number): { date: string; weekday: string } {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return {
    date: dt.toISOString().slice(0, 10),
    weekday: dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
  };
}

export interface ReminderGroup {
  raidDays: string[];
  raidStartTime: string | null; // HH:MM
  raidTimezone: string | null;
  raidReminderMins: number;
}

// Which raid night (if any) is this group due a reminder for right now?
// Same-day case: fire from (start - lead) until start. If the lead time
// reaches back across midnight, the reminder day is the day BEFORE the
// raid day, so also check whether tomorrow is a raid night whose reminder
// window has opened today.
export function dueRaidDate(group: ReminderGroup, now = new Date()): string | null {
  if (!group.raidStartTime || group.raidDays.length === 0) return null;
  const [sh, sm] = group.raidStartTime.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const z = zonedNow(resolveTimezone(group.raidTimezone), now);
  const reminderMins = startMins - group.raidReminderMins;

  if (group.raidDays.includes(z.weekday) && reminderMins >= 0 && z.minutes >= reminderMins && z.minutes < startMins) {
    return z.date;
  }
  if (reminderMins < 0) {
    const tomorrow = addDays(z.date, 1);
    if (group.raidDays.includes(tomorrow.weekday) && z.minutes >= reminderMins + 1440) {
      return tomorrow.date;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Message + delivery
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = { in: 'In', late: 'Late', out: 'Out' };

function siteBaseUrl(): string | null {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  // The Discord OAuth redirect already points at this deployment's public
  // origin — reuse it rather than demanding one more env var.
  try {
    return new URL(process.env.DISCORD_REDIRECT_URI ?? '').origin;
  } catch {
    return null;
  }
}

export async function buildReminderPayload(groupId: string, raidDate: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      name: true,
      raidStartTime: true,
      raidTimezone: true,
      members: { select: { userId: true, user: { select: { gw2AccountName: true, discordUsername: true } } } },
      signups: { where: { date: raidDate }, select: { userId: true, status: true } },
    },
  });
  if (!group) return null;

  const statusByUser = new Map(group.signups.map((s) => [s.userId, s.status]));
  const buckets: Record<string, string[]> = { in: [], late: [], out: [] };
  const noReply: string[] = [];
  for (const m of group.members) {
    const label = m.user.gw2AccountName ?? m.user.discordUsername;
    const status = statusByUser.get(m.userId);
    if (status && buckets[status]) buckets[status].push(label);
    else noReply.push(label);
  }

  const lines: string[] = [];
  for (const key of ['in', 'late', 'out'] as const) {
    if (buckets[key].length) lines.push(`**${STATUS_LABELS[key]} (${buckets[key].length}):** ${buckets[key].join(', ')}`);
  }
  if (noReply.length) lines.push(`**No reply (${noReply.length}):** ${noReply.join(', ')}`);

  const base = siteBaseUrl();
  const time = group.raidStartTime ? `${group.raidStartTime}${group.raidTimezone ? ` ${group.raidTimezone}` : ''}` : '';
  return {
    embeds: [
      {
        title: `⚔️ Raid night — ${group.name}`,
        description: `Raid starts at **${time}** (${raidDate}).\n\n${lines.join('\n') || 'No RSVPs yet — sign up on the group page!'}`,
        color: 0xd4a94a,
        ...(base ? { url: `${base}/groups/${groupId}` } : {}),
        footer: { text: 'RSVP on the group page' },
      },
    ],
  };
}

export async function sendWebhook(webhookUrl: string, payload: unknown): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Discord webhook responded ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
}

// ---------------------------------------------------------------------------
// Scheduler. One tick a minute; each tick looks at every group with a
// webhook configured, computes whether a reminder is currently due, and
// sends at most one per (group, raid night) — the RaidReminderLog unique
// constraint makes the dedupe race-safe even if two ticks overlap.
// ---------------------------------------------------------------------------

export async function tickReminders(now = new Date()): Promise<number> {
  const groups = await prisma.group.findMany({
    where: { discordWebhookEnc: { not: null } },
    select: {
      id: true,
      name: true,
      discordWebhookEnc: true,
      raidDays: true,
      raidStartTime: true,
      raidTimezone: true,
      raidReminderMins: true,
    },
  });

  let sent = 0;
  for (const g of groups) {
    const raidDate = dueRaidDate(g, now);
    if (!raidDate) continue;
    try {
      // Claim the (group, night) slot first — if this throws on the unique
      // constraint, another tick already sent it.
      await prisma.raidReminderLog.create({ data: { groupId: g.id, date: raidDate } });
    } catch {
      continue;
    }
    try {
      const payload = await buildReminderPayload(g.id, raidDate);
      if (payload) {
        await sendWebhook(decrypt(g.discordWebhookEnc!), payload);
        sent++;
      }
    } catch (err) {
      // Release the claim so a later tick retries a transient failure
      // (Discord hiccup, network) instead of silently skipping the night.
      await prisma.raidReminderLog.deleteMany({ where: { groupId: g.id, date: raidDate } });
      console.error(`raid reminder failed for group ${g.id} (${g.name}):`, err instanceof Error ? err.message : err);
    }
  }
  return sent;
}

export function startReminderScheduler(): void {
  const TICK_MS = 60_000;
  setInterval(() => {
    tickReminders().catch((err) => console.error('reminder tick failed:', err));
  }, TICK_MS).unref();
  console.log('raid reminder scheduler started (60s tick)');
}
