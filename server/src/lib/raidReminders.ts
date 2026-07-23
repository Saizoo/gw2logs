import { prisma } from '../db.js';
import { decrypt } from './crypto.js';
import { notifyUsers } from './notifications.js';
import { canonicalFightName } from './bossMeta.js';

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

// The zone's offset from UTC (ms, positive = ahead of UTC) at a given instant,
// derived from Intl — no tz library. Used to invert a wall-clock time back to
// an absolute instant.
function tzOffsetMs(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const m: Record<string, number> = {};
  for (const p of parts) if (p.type !== 'literal') m[p.type] = Number(p.value);
  const asIfUtc = Date.UTC(m.year, m.month - 1, m.day, m.hour % 24, m.minute, m.second);
  return asIfUtc - at.getTime();
}

// Convert a wall-clock time in `timeZone` to its absolute UTC instant. Standard
// offset-correction trick, refined once so instants near a DST transition land
// on the correct side.
function zonedWallTimeToUtc(y: number, mo: number, d: number, h: number, mi: number, timeZone: string): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offset = tzOffsetMs(timeZone, new Date(guess));
  let instant = guess - offset;
  const refined = tzOffsetMs(timeZone, new Date(instant));
  if (refined !== offset) instant = guess - refined;
  return new Date(instant);
}

// The next absolute UTC instant a recurring weekly schedule fires (as an ISO
// string), or null if it has no days/time. Scans today..+7 days in the group's
// own zone. Lets a client (the Nexus addon) show reminders by comparing to the
// system clock, with zero timezone logic of its own.
export function nextOccurrenceUtc(
  days: string[],
  startTime: string | null,
  rawTimezone: string | null,
  now = new Date(),
): string | null {
  if (!startTime || days.length === 0) return null;
  const [h, mi] = startTime.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(mi)) return null;
  const tz = resolveTimezone(rawTimezone);
  const today = zonedNow(tz, now).date;
  for (let offset = 0; offset <= 7; offset++) {
    const cand = addDays(today, offset);
    if (!days.includes(cand.weekday)) continue;
    const [y, mo, d] = cand.date.split('-').map(Number);
    const instant = zonedWallTimeToUtc(y, mo, d, h, mi, tz);
    if (instant.getTime() > now.getTime()) return instant.toISOString();
  }
  return null;
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

// ---------------------------------------------------------------------------
// General group-event webhook posts (beyond the pre-raid reminder). Each is
// gated by the group's webhookEvents list so a leader controls exactly what
// lands in their channel.
// ---------------------------------------------------------------------------

export type WebhookEvent = 'reminder' | 'schedule' | 'plan' | 'member' | 'log';
export const WEBHOOK_EVENT_KEYS: WebhookEvent[] = ['reminder', 'schedule', 'plan', 'member', 'log'];
const GOLD = 0xd4a94a;
const GREEN = 0x4caf6d;
const RED = 0xf55d4e;

function groupUrlField(groupId: string, path = ''): { url: string } | Record<string, never> {
  const base = siteBaseUrl();
  return base ? { url: `${base}/groups/${groupId}${path}` } : {};
}

// Post one embed to the group's webhook — but only when the webhook is set AND
// the group has that event enabled. Fire-and-forget: a webhook hiccup must
// never fail or block the request that triggered it.
export async function postGroupWebhookEvent(groupId: string, event: WebhookEvent, embed: Record<string, unknown>): Promise<void> {
  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { discordWebhookEnc: true, webhookEvents: true },
    });
    if (!group?.discordWebhookEnc || !group.webhookEvents.includes(event)) return;
    await sendWebhook(decrypt(group.discordWebhookEnc), { embeds: [embed] });
  } catch (err) {
    console.error(`group webhook (${event}) failed for ${groupId}:`, err instanceof Error ? err.message : err);
  }
}

export function scheduleChangedEmbed(groupId: string, name: string, days: string[], startTime: string | null, timezone: string | null) {
  const when = startTime
    ? `**${days.length ? days.join(', ') : 'No days set'}** at **${startTime}**${timezone ? ` ${timezone}` : ''}`
    : 'The recurring schedule was cleared.';
  return { title: `📅 ${name} — raid schedule updated`, description: when, color: GOLD, ...groupUrlField(groupId) };
}

export function planPublishedEmbed(
  groupId: string,
  name: string,
  items: { day: string | null; encounterName: string; note: string | null }[],
) {
  const byDay = new Map<string, string[]>();
  for (const it of items) {
    const key = it.day ?? 'Anytime';
    const line = `• ${it.encounterName}${it.note ? ` — _${it.note}_` : ''}`;
    (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(line);
  }
  const description = [...byDay.entries()].map(([day, lines]) => `**${day}**\n${lines.join('\n')}`).join('\n\n');
  return {
    title: `📋 ${name} — this week's raid plan`,
    description: description.slice(0, 3800) || 'No fights planned.',
    color: GOLD,
    footer: { text: 'Open the This Week tab to RSVP' },
    ...groupUrlField(groupId, '/week'),
  };
}

export function memberJoinedEmbed(groupId: string, name: string, memberName: string) {
  return { title: `👋 ${memberName} joined ${name}`, color: GREEN, ...groupUrlField(groupId) };
}

// ---------------------------------------------------------------------------
// New-log-uploaded embed. Turns a freshly ingested log into a rich Discord
// card: boss + result headline, the top of the DPS chart, and the fight's
// headline stats — enough for the channel to know how the pull went without
// opening the site, but the title still links straight to the full report.
// ---------------------------------------------------------------------------

export interface LogEmbedPlayer {
  account: string;
  characterName: string | null;
  profession: string;
  spec: string | null;
  totalDps: number;
}

export interface LogEmbedData {
  id: string;
  fightName: string;
  isCm: boolean;
  success: boolean;
  durationMs: number | null;
  squadDps: number | null;
  players: LogEmbedPlayer[]; // any order; top-by-DPS picked here
  uploaderName?: string | null;
}

function formatDuration(ms: number | null): string {
  if (!ms || ms <= 0) return '—';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function formatDps(dps: number | null): string {
  if (!dps || dps <= 0) return '—';
  if (dps >= 1000) return `${(dps / 1000).toFixed(1)}k`;
  return String(Math.round(dps));
}

// Discord doesn't fetch localhost art, but a real public deployment can serve
// the shipped profession icons — reuse them as the card thumbnail so each
// boss card leads with the top parser's spec.
function specIconUrl(profession: string, spec: string | null): string | null {
  const base = siteBaseUrl();
  if (!base) return null;
  const key = (spec && spec.trim() ? spec : profession).toLowerCase();
  return `${base}/professions/${encodeURIComponent(key)}.png`;
}

// groupId is accepted for call-site symmetry with the other embed builders,
// but this card links to the log report itself rather than the group page.
export function logUploadedEmbed(_groupId: string, groupName: string, log: LogEmbedData) {
  const boss = canonicalFightName(log.fightName);
  const result = log.success ? 'Kill ✅' : 'Wipe 💀';
  // Discord embed *titles* don't render markdown, so keep the CM marker plain.
  const cm = log.isCm ? ' CM' : '';

  const ranked = [...log.players].sort((a, b) => (b.totalDps ?? 0) - (a.totalDps ?? 0));
  const top = ranked.slice(0, 3);
  const medals = ['🥇', '🥈', '🥉'];
  const topLines = top
    .map((p, i) => {
      const who = p.characterName?.trim() || p.account;
      const build = p.spec?.trim() || p.profession;
      return `${medals[i]} **${who}** · ${build} — \`${formatDps(p.totalDps)}\` DPS`;
    })
    .join('\n');

  const thumb = top[0] ? specIconUrl(top[0].profession, top[0].spec) : null;

  const fields = [
    { name: 'Duration', value: formatDuration(log.durationMs), inline: true },
    { name: 'Squad DPS', value: formatDps(log.squadDps), inline: true },
    { name: 'Players', value: String(log.players.length || '—'), inline: true },
  ];

  return {
    author: { name: groupName },
    title: `${log.success ? '⚔️' : '💥'} ${boss}${cm} — ${result}`,
    description: topLines ? `**Top DPS**\n${topLines}` : 'Log uploaded.',
    color: log.success ? GREEN : RED,
    fields,
    ...(thumb ? { thumbnail: { url: thumb } } : {}),
    ...groupUrlEmbedUrl(log.id),
    footer: { text: log.uploaderName ? `Uploaded by ${log.uploaderName}` : 'New log uploaded' },
    timestamp: new Date().toISOString(),
  };
}

// The log embed's title should deep-link to the log report, not the group.
function groupUrlEmbedUrl(logId: string): { url: string } | Record<string, never> {
  const base = siteBaseUrl();
  return base ? { url: `${base}/logs/${logId}` } : {};
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
      await prisma.raidReminderLog.deleteMany({ where: { groupId: g.id, date: raidDate, kind: 'webhook' } });
      console.error(`raid reminder failed for group ${g.id} (${g.name}):`, err instanceof Error ? err.message : err);
    }
  }
  return sent;
}

// In-app pre-raid reminder — fans a notification out to every member of any
// group whose raid night is due, whether or not a Discord webhook is set.
// Deduped per (group, night) with a separate reminder-log kind so it can't
// collide with the webhook claim above.
export async function tickInAppRaidReminders(now = new Date()): Promise<number> {
  const groups = await prisma.group.findMany({
    where: { raidStartTime: { not: null }, NOT: { raidDays: { isEmpty: true } } },
    select: {
      id: true,
      name: true,
      raidDays: true,
      raidStartTime: true,
      raidTimezone: true,
      raidReminderMins: true,
      members: { select: { userId: true } },
    },
  });

  let sent = 0;
  for (const g of groups) {
    const raidDate = dueRaidDate(g, now);
    if (!raidDate) continue;
    try {
      await prisma.raidReminderLog.create({ data: { groupId: g.id, date: raidDate, kind: 'inapp' } });
    } catch {
      continue; // already notified for this night
    }
    const time = g.raidStartTime ? `${g.raidStartTime}${g.raidTimezone ? ` ${g.raidTimezone}` : ''}` : '';
    await notifyUsers(
      g.members.map((m) => m.userId),
      {
        type: 'raid_reminder',
        title: `⚔️ Raid night — ${g.name}`,
        body: `Starts at ${time}. RSVP on the group page if you haven't yet.`,
        link: `/groups/${g.id}`,
        groupId: g.id,
      },
    );
    sent++;
  }
  return sent;
}

export function startReminderScheduler(): void {
  const TICK_MS = 60_000;
  setInterval(() => {
    tickReminders().catch((err) => console.error('reminder tick failed:', err));
    tickInAppRaidReminders().catch((err) => console.error('in-app reminder tick failed:', err));
  }, TICK_MS).unref();
  console.log('raid reminder scheduler started (60s tick)');
}
