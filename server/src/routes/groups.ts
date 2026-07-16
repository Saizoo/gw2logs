import { Router } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { getGroupRole as getRole, canManageGroup as canManage } from '../lib/groupAccess.js';
import { BOSS_WING } from '../lib/bossMeta.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { buildReminderPayload, dueRaidDate, sendWebhook, zonedNow, resolveTimezone } from '../lib/raidReminders.js';

export const groupsRouter = Router();

const MEMBER_SELECT = {
  role: true,
  joinedAt: true,
  user: { select: { id: true, discordUsername: true, discordAvatar: true, gw2AccountName: true } },
} as const;

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const SCHEDULE_SELECT = {
  raidDays: true,
  raidStartTime: true,
  raidDurationMins: true,
  raidTimezone: true,
} as const;

groupsRouter.get('/', asyncHandler(async (req, res) => {
  // ?mine=true is the only thing that switches this into "groups I've
  // joined" mode (requires auth) — everything else is the public
  // browse/search mode, search text and filters both optional so leaving
  // the search box empty and just picking a day still returns results.
  if (req.query.mine === 'true') {
    if (!req.user) {
      res.status(401).json({ error: 'Not signed in' });
      return;
    }

    const memberships = await prisma.groupMember.findMany({
      where: { userId: req.user.id },
      select: {
        role: true,
        group: { select: { id: true, name: true, icon: true, background: true, ...SCHEDULE_SELECT, _count: { select: { members: true, requests: true } } } },
      },
    });
    res.json(
      memberships.map((m) => ({
        id: m.group.id,
        name: m.group.name,
        icon: m.group.icon,
        background: m.group.background,
        memberCount: m.group._count.members,
        raidDays: m.group.raidDays,
        raidStartTime: m.group.raidStartTime,
        raidDurationMins: m.group.raidDurationMins,
        raidTimezone: m.group.raidTimezone,
        // Only meaningful for a leader/subleader — pending join requests
        // aren't visible to a plain member, matching the 403 the
        // join-requests endpoint itself already enforces.
        pendingRequestCount: m.role === 'leader' || m.role === 'subleader' ? m.group._count.requests : 0,
      })),
    );
    return;
  }

  const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
  const days = (typeof req.query.day === 'string' ? req.query.day.split(',') : [])
    .map((d) => d.trim())
    .filter((d): d is (typeof WEEKDAYS)[number] => (WEEKDAYS as readonly string[]).includes(d));
  const sort = req.query.sort === 'newest' ? 'newest' : req.query.sort === 'name' ? 'name' : 'members';

  const groups = await prisma.group.findMany({
    where: {
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(days.length ? { raidDays: { hasSome: days } } : {}),
    },
    take: 30,
    orderBy:
      sort === 'newest' ? { createdAt: 'desc' } : sort === 'name' ? { name: 'asc' } : { members: { _count: 'desc' } },
    select: {
      id: true,
      name: true,
      icon: true,
      leader: { select: { discordUsername: true, gw2AccountName: true } },
      ...SCHEDULE_SELECT,
      _count: { select: { members: true } },
    },
  });
  res.json(
    groups.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      leader: g.leader.gw2AccountName ?? g.leader.discordUsername,
      memberCount: g._count.members,
      raidDays: g.raidDays,
      raidStartTime: g.raidStartTime,
      raidDurationMins: g.raidDurationMins,
      raidTimezone: g.raidTimezone,
    })),
  );
}));

groupsRouter.post('/', requireAuth, asyncHandler(async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const group = await prisma.group.create({
    data: {
      name,
      leaderId: req.user!.id,
      members: { create: { userId: req.user!.id, role: 'leader' } },
    },
  });

  res.status(201).json({ id: group.id });
}));

groupsRouter.get('/:id', asyncHandler(async (req, res) => {
  const group = await prisma.group.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      name: true,
      icon: true,
      background: true,
      leader: { select: { discordUsername: true, gw2AccountName: true } },
      members: { select: MEMBER_SELECT, orderBy: { joinedAt: 'asc' } },
      ...SCHEDULE_SELECT,
    },
  });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  const myRole = req.user ? await getRole(group.id, req.user.id) : null;

  res.json({
    id: group.id,
    name: group.name,
    icon: group.icon,
    background: group.background,
    leader: group.leader.gw2AccountName ?? group.leader.discordUsername,
    members: group.members.map((m) => ({
      userId: m.user.id,
      username: m.user.discordUsername,
      // GW2 account name is the primary display identity everywhere else in
      // the app; null when the member hasn't linked their API key yet, and
      // the frontend falls back to the Discord username in that case.
      account: m.user.gw2AccountName,
      avatar: m.user.discordAvatar,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    raidDays: group.raidDays,
    raidStartTime: group.raidStartTime,
    raidDurationMins: group.raidDurationMins,
    raidTimezone: group.raidTimezone,
    myRole,
    canManage: canManage(myRole),
  });
}));

groupsRouter.put('/:id', requireAuth, asyncHandler(async (req, res) => {
  const role = await getRole(req.params.id, req.user!.id);
  if (!canManage(role)) {
    res.status(403).json({ error: 'Only leaders and subleaders can edit this group' });
    return;
  }

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() || undefined : undefined;
  // Icon/background become image filenames client-side — restrict to a safe
  // charset rather than trusting the client, same as the old app did.
  const icon = typeof req.body?.icon === 'string' ? req.body.icon.toLowerCase().replace(/[^a-z0-9]/g, '') || null : undefined;
  const background = typeof req.body?.background === 'string' ? req.body.background.toLowerCase().replace(/[^a-z0-9]/g, '') || null : undefined;

  let raidDays: (typeof WEEKDAYS)[number][] | undefined;
  if (Array.isArray(req.body?.raidDays)) {
    const invalid = req.body.raidDays.filter((d: unknown) => !(WEEKDAYS as readonly string[]).includes(d as string));
    if (invalid.length) {
      res.status(400).json({ error: `Invalid day(s): ${invalid.join(', ')}. Expected one of ${WEEKDAYS.join(', ')}.` });
      return;
    }
    raidDays = [...new Set(req.body.raidDays as (typeof WEEKDAYS)[number][])];
  }

  let raidStartTime: string | null | undefined;
  if (req.body?.raidStartTime === null) {
    raidStartTime = null;
  } else if (typeof req.body?.raidStartTime === 'string') {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(req.body.raidStartTime)) {
      res.status(400).json({ error: 'raidStartTime must be 24-hour HH:MM' });
      return;
    }
    raidStartTime = req.body.raidStartTime;
  }

  let raidDurationMins: number | null | undefined;
  if (req.body?.raidDurationMins === null) {
    raidDurationMins = null;
  } else if (typeof req.body?.raidDurationMins === 'number') {
    if (!Number.isInteger(req.body.raidDurationMins) || req.body.raidDurationMins <= 0 || req.body.raidDurationMins > 1440) {
      res.status(400).json({ error: 'raidDurationMins must be a positive integer (minutes, max 1440)' });
      return;
    }
    raidDurationMins = req.body.raidDurationMins;
  }

  let raidTimezone: string | null | undefined;
  if (req.body?.raidTimezone === null) {
    raidTimezone = null;
  } else if (typeof req.body?.raidTimezone === 'string') {
    raidTimezone = req.body.raidTimezone.trim().slice(0, 40) || null;
  }

  await prisma.group.update({
    where: { id: req.params.id },
    data: {
      ...(name ? { name } : {}),
      ...(icon !== undefined ? { icon } : {}),
      ...(background !== undefined ? { background } : {}),
      ...(raidDays !== undefined ? { raidDays } : {}),
      ...(raidStartTime !== undefined ? { raidStartTime } : {}),
      ...(raidDurationMins !== undefined ? { raidDurationMins } : {}),
      ...(raidTimezone !== undefined ? { raidTimezone } : {}),
    },
  });

  res.json({ ok: true });
}));

groupsRouter.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  if (group.leaderId !== req.user!.id) {
    res.status(403).json({ error: 'Only the leader can delete this group' });
    return;
  }

  await prisma.group.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

groupsRouter.get('/:id/roster', requireAuth, asyncHandler(async (req, res) => {
  const role = await getRole(req.params.id, req.user!.id);
  if (!role) {
    res.status(403).json({ error: 'You must be a member of this group to view its roster' });
    return;
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId: req.params.id },
    select: {
      user: {
        select: {
          discordUsername: true,
          gw2AccountName: true,
          characters: {
            select: {
              id: true,
              name: true,
              profession: true,
              race: true,
              source: true,
              templates: { select: { id: true, tab: true, name: true, spec: true, isActive: true, assignedBuildId: true } },
            },
          },
        },
      },
    },
  });

  res.json(
    members.flatMap((m) =>
      m.user.characters.map((c) => ({
        id: c.id,
        name: c.name,
        profession: c.profession,
        race: c.race,
        source: c.source,
        owner: m.user.gw2AccountName ?? m.user.discordUsername,
        templates: c.templates,
      })),
    ),
  );
}));

// GW2's weekly raid reset: Monday 07:30 UTC. Returns the most recent one.
function currentWeeklyReset(now = new Date()): Date {
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 7, 30));
  const daysSinceMonday = (reset.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  reset.setUTCDate(reset.getUTCDate() - daysSinceMonday);
  if (reset > now) reset.setUTCDate(reset.getUTCDate() - 7);
  return reset;
}

// Weekly clear matrix, built from logs attached to this group. Every raid
// wing from the canonical catalog is always present (an empty week should
// show as unchecked boxes, not a missing wing); former-strike maps only
// appear once the group has actually logged them, so a pure raid static
// isn't padded with a dozen permanently-empty strike rows.
groupsRouter.get('/:id/clears', requireAuth, asyncHandler(async (req, res) => {
  const role = await getRole(req.params.id, req.user!.id);
  if (!role) {
    res.status(403).json({ error: 'You must be a member of this group to view its clears' });
    return;
  }

  const weekStart = currentWeeklyReset();
  const kills = await prisma.log.findMany({
    where: { groupId: req.params.id, success: true },
    select: { id: true, fightName: true, isCm: true, encounterTime: true },
    orderBy: { encounterTime: 'desc' },
  });

  const thisWeek = new Set<string>();
  const cmThisWeek = new Set<string>();
  const lastKill = new Map<string, { logId: string; date: Date; isCm: boolean }>();
  for (const k of kills) {
    if (!lastKill.has(k.fightName)) lastKill.set(k.fightName, { logId: k.id, date: k.encounterTime, isCm: k.isCm });
    if (k.encounterTime >= weekStart) {
      thisWeek.add(k.fightName);
      if (k.isCm) cmThisWeek.add(k.fightName);
    }
  }

  const isRaidWing = (wing: string) => wing.startsWith('Wing ') || wing === "Guardian's Glade";
  const wings = new Map<string, string[]>();
  for (const [boss, wing] of Object.entries(BOSS_WING)) {
    if (!isRaidWing(wing) && !lastKill.has(boss)) continue;
    const bosses = wings.get(wing) ?? [];
    bosses.push(boss);
    wings.set(wing, bosses);
  }

  res.json({
    weekStart,
    wings: [...wings.entries()].map(([wing, bosses]) => ({
      wing,
      encounters: bosses.map((fightName) => ({
        fightName,
        killedThisWeek: thisWeek.has(fightName),
        cmThisWeek: cmThisWeek.has(fightName),
        lastKill: lastKill.get(fightName) ?? null,
      })),
    })),
  });
}));

const WEBHOOK_URL_RE = /^https:\/\/(discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)\/api\/webhooks\/\d+\/[\w-]+$/;

// Reminder settings, leader/subleader-only in both directions: the raw
// webhook URL is a channel-posting credential, so reads return only a
// configured/not-configured flag and the URL itself never leaves the
// server after being stored.
groupsRouter.get('/:id/reminders', requireAuth, asyncHandler(async (req, res) => {
  const role = await getRole(req.params.id, req.user!.id);
  if (!canManage(role)) {
    res.status(403).json({ error: 'Only leaders and subleaders can view reminder settings' });
    return;
  }
  const group = await prisma.group.findUnique({
    where: { id: req.params.id },
    select: { discordWebhookEnc: true, raidReminderMins: true },
  });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  res.json({ webhookConfigured: group.discordWebhookEnc !== null, reminderMins: group.raidReminderMins });
}));

groupsRouter.put('/:id/reminders', requireAuth, asyncHandler(async (req, res) => {
  const role = await getRole(req.params.id, req.user!.id);
  if (!canManage(role)) {
    res.status(403).json({ error: 'Only leaders and subleaders can change reminder settings' });
    return;
  }

  const data: { discordWebhookEnc?: string | null; raidReminderMins?: number } = {};

  if (req.body?.webhookUrl === null) {
    data.discordWebhookEnc = null;
  } else if (typeof req.body?.webhookUrl === 'string') {
    const url = req.body.webhookUrl.trim();
    if (!WEBHOOK_URL_RE.test(url)) {
      res.status(400).json({ error: 'That does not look like a Discord webhook URL (https://discord.com/api/webhooks/…)' });
      return;
    }
    data.discordWebhookEnc = encrypt(url);
  }

  if (typeof req.body?.reminderMins === 'number') {
    if (!Number.isInteger(req.body.reminderMins) || req.body.reminderMins < 5 || req.body.reminderMins > 1440) {
      res.status(400).json({ error: 'reminderMins must be between 5 and 1440' });
      return;
    }
    data.raidReminderMins = req.body.reminderMins;
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }

  await prisma.group.update({ where: { id: req.params.id }, data });
  res.json({ ok: true });
}));

// Fire the reminder right now, for whichever raid night is nearest —
// lets a leader confirm the webhook lands in the right channel without
// waiting for the real window.
groupsRouter.post('/:id/reminders/test', requireAuth, asyncHandler(async (req, res) => {
  const role = await getRole(req.params.id, req.user!.id);
  if (!canManage(role)) {
    res.status(403).json({ error: 'Only leaders and subleaders can send a test reminder' });
    return;
  }
  const group = await prisma.group.findUnique({
    where: { id: req.params.id },
    select: { discordWebhookEnc: true, raidDays: true, raidStartTime: true, raidTimezone: true, raidReminderMins: true },
  });
  if (!group?.discordWebhookEnc) {
    res.status(400).json({ error: 'Set a Discord webhook URL first' });
    return;
  }

  const due = dueRaidDate(group, new Date());
  const raidDate = due ?? zonedNow(resolveTimezone(group.raidTimezone)).date;
  const payload = await buildReminderPayload(req.params.id, raidDate);
  try {
    await sendWebhook(decrypt(group.discordWebhookEnc), payload);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Webhook delivery failed' });
    return;
  }
  res.json({ ok: true });
}));

const SIGNUP_STATUSES = new Set(['in', 'late', 'out']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// Upcoming RSVPs for every member, all raid nights from today forward.
// Past nights are history the page doesn't show, so they're filtered here
// (kept in the table, though — they're the raw material for a future
// attendance view).
groupsRouter.get('/:id/signups', requireAuth, asyncHandler(async (req, res) => {
  const role = await getRole(req.params.id, req.user!.id);
  if (!role) {
    res.status(403).json({ error: 'You must be a member of this group to view signups' });
    return;
  }

  const signups = await prisma.raidSignup.findMany({
    where: { groupId: req.params.id, date: { gte: todayUtcDate() } },
    select: { userId: true, date: true, status: true },
    orderBy: { date: 'asc' },
  });
  res.json(signups);
}));

// Set (or clear, with status: null) the caller's own RSVP for one night.
// Anyone can only ever write their own row — there's deliberately no
// "leader marks people" path; an RSVP is a personal statement.
groupsRouter.put('/:id/signups', requireAuth, asyncHandler(async (req, res) => {
  const role = await getRole(req.params.id, req.user!.id);
  if (!role) {
    res.status(403).json({ error: 'You must be a member of this group to sign up' });
    return;
  }

  const date = typeof req.body?.date === 'string' ? req.body.date : '';
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date))) {
    res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    return;
  }
  if (date < todayUtcDate()) {
    res.status(400).json({ error: 'Cannot RSVP for a past date' });
    return;
  }
  // Bound how far ahead rows can be created — an unbounded date would let
  // a stray client fill the table with signups for the year 9999.
  const horizon = new Date();
  horizon.setUTCDate(horizon.getUTCDate() + 60);
  if (date > horizon.toISOString().slice(0, 10)) {
    res.status(400).json({ error: 'Cannot RSVP more than 60 days ahead' });
    return;
  }

  const status = req.body?.status;
  if (status === null) {
    await prisma.raidSignup.deleteMany({ where: { groupId: req.params.id, userId: req.user!.id, date } });
    res.json({ ok: true });
    return;
  }
  if (typeof status !== 'string' || !SIGNUP_STATUSES.has(status)) {
    res.status(400).json({ error: 'status must be "in", "late", "out", or null to clear' });
    return;
  }

  await prisma.raidSignup.upsert({
    where: { groupId_userId_date: { groupId: req.params.id, userId: req.user!.id, date } },
    update: { status },
    create: { groupId: req.params.id, userId: req.user!.id, date, status },
  });
  res.json({ ok: true });
}));

groupsRouter.post('/:id/join-requests', requireAuth, asyncHandler(async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  const existingRole = await getRole(group.id, req.user!.id);
  if (existingRole) {
    res.status(400).json({ error: 'You are already a member of this group' });
    return;
  }

  await prisma.groupRequest.upsert({
    where: { groupId_userId: { groupId: group.id, userId: req.user!.id } },
    update: {},
    create: { groupId: group.id, userId: req.user!.id },
  });

  res.status(201).json({ ok: true });
}));

groupsRouter.get('/:id/join-requests', requireAuth, asyncHandler(async (req, res) => {
  const role = await getRole(req.params.id, req.user!.id);
  if (!canManage(role)) {
    res.status(403).json({ error: 'Only leaders and subleaders can view join requests' });
    return;
  }

  const requests = await prisma.groupRequest.findMany({
    where: { groupId: req.params.id },
    select: { userId: true, createdAt: true, user: { select: { discordUsername: true, discordAvatar: true, gw2AccountName: true } } },
    orderBy: { createdAt: 'asc' },
  });

  res.json(
    requests.map((r) => ({ userId: r.userId, username: r.user.discordUsername, account: r.user.gw2AccountName, avatar: r.user.discordAvatar, createdAt: r.createdAt })),
  );
}));

groupsRouter.post('/:id/join-requests/:userId/approve', requireAuth, asyncHandler(async (req, res) => {
  const role = await getRole(req.params.id, req.user!.id);
  if (!canManage(role)) {
    res.status(403).json({ error: 'Only leaders and subleaders can approve join requests' });
    return;
  }

  await prisma.$transaction([
    prisma.groupRequest.deleteMany({ where: { groupId: req.params.id, userId: req.params.userId } }),
    prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: req.params.id, userId: req.params.userId } },
      update: {},
      create: { groupId: req.params.id, userId: req.params.userId, role: 'member' },
    }),
  ]);

  res.json({ ok: true });
}));

groupsRouter.post('/:id/join-requests/:userId/deny', requireAuth, asyncHandler(async (req, res) => {
  const role = await getRole(req.params.id, req.user!.id);
  if (!canManage(role)) {
    res.status(403).json({ error: 'Only leaders and subleaders can deny join requests' });
    return;
  }

  await prisma.groupRequest.deleteMany({ where: { groupId: req.params.id, userId: req.params.userId } });
  res.json({ ok: true });
}));

groupsRouter.post('/:id/members', requireAuth, asyncHandler(async (req, res) => {
  const role = await getRole(req.params.id, req.user!.id);
  if (!canManage(role)) {
    res.status(403).json({ error: 'Only leaders and subleaders can invite members' });
    return;
  }

  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  if (!username) {
    res.status(400).json({ error: 'username is required' });
    return;
  }

  // One input, matched against either identity — Discord username or GW2
  // account name (Name.1234). Case-insensitive on both: Discord usernames
  // are lowercase-only anyway, and GW2 account names are shown with mixed
  // case but unique regardless of it.
  const target = await prisma.user.findFirst({
    where: {
      OR: [
        { discordUsername: { equals: username, mode: 'insensitive' } },
        { gw2AccountName: { equals: username, mode: 'insensitive' } },
      ],
    },
  });
  if (!target) {
    res.status(404).json({ error: `No user found with Discord username or GW2 account name "${username}"` });
    return;
  }

  await prisma.$transaction([
    prisma.groupRequest.deleteMany({ where: { groupId: req.params.id, userId: target.id } }),
    prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: req.params.id, userId: target.id } },
      update: {},
      create: { groupId: req.params.id, userId: target.id, role: 'member' },
    }),
  ]);

  res.json({ ok: true });
}));

// Role changes (promote to subleader, demote, or hand off leadership) are
// all leader-only, matching the old app — a subleader may manage requests
// and remove plain members, but not touch roles.
groupsRouter.put('/:id/members/:userId', requireAuth, asyncHandler(async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }
  if (group.leaderId !== req.user!.id) {
    res.status(403).json({ error: 'Only the leader can change member roles' });
    return;
  }

  const targetRole = await getRole(group.id, req.params.userId);
  if (!targetRole) {
    res.status(404).json({ error: 'That user is not a member of this group' });
    return;
  }

  const action = req.body?.action;
  if (action === 'promote') {
    await prisma.$transaction([
      prisma.groupMember.updateMany({ where: { groupId: group.id, role: 'subleader' }, data: { role: 'member' } }),
      prisma.groupMember.update({ where: { groupId_userId: { groupId: group.id, userId: req.params.userId } }, data: { role: 'subleader' } }),
    ]);
  } else if (action === 'demote') {
    await prisma.groupMember.update({ where: { groupId_userId: { groupId: group.id, userId: req.params.userId } }, data: { role: 'member' } });
  } else if (action === 'makeleader') {
    await prisma.$transaction([
      prisma.groupMember.updateMany({ where: { groupId: group.id, role: 'subleader' }, data: { role: 'member' } }),
      prisma.groupMember.update({ where: { groupId_userId: { groupId: group.id, userId: req.params.userId } }, data: { role: 'leader' } }),
      prisma.groupMember.update({ where: { groupId_userId: { groupId: group.id, userId: req.user!.id } }, data: { role: 'subleader' } }),
      prisma.group.update({ where: { id: group.id }, data: { leaderId: req.params.userId } }),
    ]);
  } else {
    res.status(400).json({ error: 'action must be one of: promote, demote, makeleader' });
    return;
  }

  res.json({ ok: true });
}));

groupsRouter.delete('/:id/members/:userId', requireAuth, asyncHandler(async (req, res) => {
  const group = await prisma.group.findUnique({ where: { id: req.params.id } });
  if (!group) {
    res.status(404).json({ error: 'Group not found' });
    return;
  }

  const isSelf = req.params.userId === req.user!.id;
  const myRole = await getRole(group.id, req.user!.id);

  if (group.leaderId === req.params.userId) {
    res.status(400).json({ error: 'The leader cannot be removed — delete the group or hand off leadership first' });
    return;
  }
  if (!isSelf && !canManage(myRole)) {
    res.status(403).json({ error: 'Only leaders and subleaders can remove other members' });
    return;
  }
  const targetRole = await getRole(group.id, req.params.userId);
  if (!isSelf && targetRole === 'subleader' && myRole !== 'leader') {
    res.status(403).json({ error: 'Only the leader can remove a subleader' });
    return;
  }

  await prisma.groupMember.deleteMany({ where: { groupId: group.id, userId: req.params.userId } });
  res.json({ ok: true });
}));
