import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { RAID_BOSSES, FRACTAL_CM_BOSSES, BOSS_WING, canonicalFightName, categorizeFight } from '../lib/bossMeta.js';
import { maskIdentity } from '../lib/privacy.js';
import { getGroupRole } from '../lib/groupAccess.js';

export const logsRouter = Router();

// A private log is manageable by its uploader (incl. anyone who claimed it)
// and by admins. Used to gate the privacy toggle, delete, and group reassign.
function canManageLog(log: { uploadedBy: string | null }, user: { id: string; isAdmin: boolean } | null | undefined): boolean {
  return !!user && (log.uploadedBy === user.id || user.isAdmin);
}

// Log.phaseData is a free-form JSON blob (the EncounterTelemetry shape written
// at ingest, or null on older logs). Read the boss health graph and phase list
// back out defensively so a malformed/absent blob just yields null/[] rather
// than throwing on the detail route.
function bossHealthOf(phaseData: unknown): { totalHealth: number | null; points: [number, number][] } | null {
  if (!phaseData || typeof phaseData !== 'object') return null;
  const pd = phaseData as Record<string, unknown>;
  const health = pd.health;
  if (!Array.isArray(health) || health.length === 0) return null;
  const points = health
    .filter((p): p is [number, number] => Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number')
    .map((p) => [p[0], p[1]] as [number, number]);
  if (points.length === 0) return null;
  const total = typeof pd.totalHealth === 'number' ? pd.totalHealth : null;
  return { totalHealth: total, points };
}

function phasesOf(phaseData: unknown): { name: string; startMs: number; endMs: number; breakbar: boolean; squadDps: number }[] {
  if (!phaseData || typeof phaseData !== 'object') return [];
  const pd = phaseData as Record<string, unknown>;
  if (!Array.isArray(pd.phases)) return [];
  return pd.phases
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .map((p) => ({
      name: typeof p.name === 'string' ? p.name : 'Phase',
      startMs: typeof p.startMs === 'number' ? p.startMs : 0,
      endMs: typeof p.endMs === 'number' ? p.endMs : 0,
      breakbar: Boolean(p.breakbar),
      squadDps: typeof p.squadDps === 'number' ? p.squadDps : 0,
    }))
    .filter((p) => p.endMs > p.startMs);
}

logsRouter.get('/', asyncHandler(async (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const killsOnly = req.query.killsOnly === 'true';
  const mine = req.query.mine === 'true';
  const groupId = typeof req.query.groupId === 'string' ? req.query.groupId : undefined;
  // fightName filter — the Encounters page links each boss card here. The
  // card name is canonical, but rows ingested before canonicalization landed
  // still carry raw EI spellings ("Cairn CM", "Icebrood Construct"), so an
  // exact match on the canonical name would miss them. Match every stored
  // spelling that canonicalizes to the requested boss instead, so a click
  // works whether or not the fightname backfill has run.
  const boss = typeof req.query.boss === 'string' && req.query.boss ? canonicalFightName(req.query.boss) : undefined;
  // Wing filter — the Raids overview / catalog menu link a whole wing here.
  // Resolve the wing to its boss set (BOSS_WING) and match every stored
  // spelling that canonicalizes into it, same as the boss filter. `boss`
  // wins when both are present (it's the more specific scope).
  const wing = typeof req.query.wing === 'string' && req.query.wing ? req.query.wing : undefined;
  let bossNames: string[] | undefined;
  if (boss || (wing && !boss)) {
    const distinct = await prisma.log.findMany({ distinct: ['fightName'], select: { fightName: true } });
    if (boss) {
      bossNames = distinct.map((d) => d.fightName).filter((n) => canonicalFightName(n) === boss);
      if (bossNames.length === 0) bossNames = [boss];
    } else {
      const wingBosses = new Set(Object.entries(BOSS_WING).filter(([, w]) => w === wing).map(([b]) => b));
      bossNames = distinct.map((d) => d.fightName).filter((n) => wingBosses.has(canonicalFightName(n)));
      // Requested a wing with no logs yet — match nothing rather than everything.
      if (bossNames.length === 0) bossNames = ['__none__'];
    }
  }
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Math.max(Number(req.query.offset ?? 0), 0);

  const where = {
    ...(category === 'raid'
      ? { fightName: { in: [...RAID_BOSSES] } }
      : category === 'fractal'
        ? { fightName: { in: [...FRACTAL_CM_BOSSES] } }
        : {}),
    ...(killsOnly ? { success: true } : {}),
    // req.user is undefined for a signed-out request — that's an empty
    // result set for ?mine=true rather than every anonymous log, since
    // there's no session to own them.
    ...(mine ? { uploadedBy: req.user?.id ?? '__none__' } : {}),
    ...(groupId ? { groupId } : {}),
    ...(bossNames ? { fightName: { in: bossNames } } : {}),
    // Private logs stay off the public browse list. The owner still sees their
    // own via ?mine, admins see everything, and a group's private logs surface
    // on that group's own (membership-gated) clears/attendance pages.
    ...(mine || req.user?.isAdmin ? {} : { private: false }),
  };

  let logs = await prisma.log.findMany({
    where,
    select: {
      id: true,
      fightName: true,
      wing: true,
      isCm: true,
      success: true,
      durationMs: true,
      squadDps: true,
      // Sorted and displayed by when the fight actually happened, not when
      // it was uploaded to our server — same convention the leaderboard and
      // log-detail routes already use. Sorting by uploadedAt instead breaks
      // down badly for anyone using the dps.report bulk-import feature: a
      // whole history of old logs all get uploadedAt ~= import time, so
      // they'd all cluster at "today" regardless of when they were played.
      encounterTime: true,
      _count: { select: { players: true } },
    },
    orderBy: { encounterTime: 'desc' },
    take: limit,
    skip: offset,
  });

  // The name-only `where` above can't tell 'Deimos'/'Cerus' the raid boss
  // from 'Deimos'/'Cerus' the Fractal CM boss — both fightName lists contain
  // them — so it over-fetches those two names under either filter. Drop
  // whichever ones don't actually belong once squad size can settle it (see
  // categorizeFight). Every other boss name is unaffected by this pass.
  if (category === 'raid' || category === 'fractal') {
    logs = logs.filter((l) => categorizeFight(l.fightName, l._count.players) === category);
  }

  const fightNames = [...new Set(logs.map((l) => l.fightName))];
  const logIds = logs.map((l) => l.id);

  // Each log's "parse" badge is its top performer's percentile against the
  // GLOBAL population for that exact boss+CM — same convention the
  // leaderboard uses. Computed for the whole page in one query (window
  // function scoped to just the fight names on this page) rather than one
  // query per row.
  // PERCENT_RANK() is 0 for a partition with only one row (there's nothing
  // below it to rank against) — without correcting for that, a boss+CM
  // with a single parse ever logged would show its only performer at the
  // 0th percentile instead of the 100th. Same fix as the leaderboard
  // route's `total <= 1 ? 100 : ...` special case, expressed in SQL here.
  const percentiles = logIds.length
    ? await prisma.$queryRaw<{ logId: string; pct: number }[]>`
        WITH ranked AS (
          SELECT lp."logId",
            CASE WHEN COUNT(*) OVER (PARTITION BY l."fightName", l."isCm") <= 1 THEN 1.0
                 ELSE PERCENT_RANK() OVER (PARTITION BY l."fightName", l."isCm" ORDER BY lp."totalDps")
            END AS pct_rank
          FROM "LogPlayer" lp
          JOIN "Log" l ON lp."logId" = l.id
          WHERE l."fightName" = ANY(${fightNames})
        )
        SELECT "logId", ROUND(MAX(pct_rank) * 100) AS pct
        FROM ranked
        WHERE "logId" = ANY(${logIds})
        GROUP BY "logId"
      `
    : [];
  const pctByLogId = new Map(percentiles.map((p) => [p.logId, Number(p.pct)]));

  res.json(
    logs.map((l) => ({
      id: l.id,
      boss: canonicalFightName(l.fightName),
      wing: l.wing,
      category: categorizeFight(l.fightName, l._count.players),
      isCm: l.isCm,
      success: l.success,
      durationMs: l.durationMs,
      squadDps: l.squadDps,
      playerCount: l._count.players,
      date: l.encounterTime,
      parsePct: pctByLogId.get(l.id) ?? null,
    })),
  );
}));

logsRouter.get('/:id', asyncHandler(async (req, res) => {
  const log = await prisma.log.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      fightName: true,
      wing: true,
      isCm: true,
      success: true,
      durationMs: true,
      squadDps: true,
      encounterTime: true,
      private: true,
      mechanicsMeta: true,
      phaseData: true,
      uploadedBy: true,
      uploader: { select: { discordUsername: true } },
      groupId: true,
      group: { select: { name: true } },
      players: {
        orderBy: { totalDps: 'desc' },
        select: {
          characterName: true,
          profession: true,
          spec: true,
          subgroup: true,
          totalDps: true,
          powerDps: true,
          condiDps: true,
          damageTaken: true,
          downCount: true,
          deadCount: true,
          boons: true,
          mechanics: true,
          squadRole: true,
          player: { select: { account: true, userId: true, user: { select: { hideName: true } } } },
        },
      },
      mechanicEvents: {
        orderBy: { timeMs: 'asc' },
        select: { timeMs: true, name: true, actor: true, severity: true },
      },
      deathEvents: {
        orderBy: { timeMs: 'asc' },
        select: { timeMs: true, actor: true, killedBy: true },
      },
    },
  });

  if (!log) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }

  // Private logs are viewable only by the uploader, admins, and — when the log
  // is attached to a group — that group's members. Everyone else gets a 404
  // (indistinguishable from "doesn't exist", so a private log's existence
  // isn't leaked).
  const manages = canManageLog(log, req.user);
  const inGroup = log.private && !manages && log.groupId && req.user ? (await getGroupRole(log.groupId, req.user.id)) !== null : false;
  if (log.private && !manages && !inGroup) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }

  // Each player's parse badge is their percentile against the population for
  // this exact boss+CM *within the same squad role* — a DPS parse ranked
  // against other DPS parses, a healer against other healers — so a support
  // build isn't shown a low badge for the damage its role trades away. Same
  // role-segmentation as the profile score. Computed via one window-function
  // query rather than N lookups; scoped by logId (not just characterName) so a
  // character that played this boss in other logs doesn't leak its best-ever
  // percentile onto this row. Single-row (role) populations are forced to the
  // 100th percentile (PERCENT_RANK() alone would wrongly give a lone performer
  // a 0).
  const playerPercentiles = await prisma.$queryRaw<{ characterName: string; pct: number }[]>`
    WITH ranked AS (
      SELECT lp."logId", lp."characterName",
        CASE WHEN COUNT(*) OVER (PARTITION BY l."fightName", l."isCm", lp."squadRole") <= 1 THEN 1.0
             ELSE PERCENT_RANK() OVER (PARTITION BY l."fightName", l."isCm", lp."squadRole" ORDER BY lp."totalDps")
        END AS pct_rank
      FROM "LogPlayer" lp
      JOIN "Log" l ON lp."logId" = l.id
      WHERE l."fightName" = ${log.fightName} AND l."isCm" = ${log.isCm}
    )
    SELECT "characterName", ROUND(pct_rank * 100) AS pct
    FROM ranked
    WHERE "logId" = ${log.id}
  `;
  const pctByName = new Map(playerPercentiles.map((p) => [p.characterName, Number(p.pct)]));

  // character name → its masked display, for any player whose linked user
  // hid their name (and isn't the viewer themselves). Used to scrub the
  // squad table, timeline and death log all from one place.
  const maskedActorName = new Map<string, string>();
  for (const p of log.players) {
    const masked = maskIdentity(p.characterName, p.player.account, p.player.user?.hideName ?? false, p.player.userId, req.user?.id);
    if (masked.hidden) maskedActorName.set(p.characterName, masked.name);
  }

  // Claimable if nobody's attributed to the upload yet and the signed-in
  // user's own linked GW2 account was actually a player in this log — i.e.
  // they can prove they were there, not just anyone passing by.
  const canClaim = Boolean(
    !log.uploadedBy && req.user?.gw2AccountName && log.players.some((p) => p.player.account === req.user!.gw2AccountName),
  );

  res.json({
    id: log.id,
    boss: log.fightName,
    wing: log.wing,
    isCm: log.isCm,
    success: log.success,
    durationMs: log.durationMs,
    squadDps: log.squadDps,
    date: log.encounterTime,
    uploadedBy: log.uploader ? { username: log.uploader.discordUsername } : null,
    canClaim,
    private: log.private,
    // Whether the viewer may toggle privacy / delete / reassign this log.
    canManage: manages,
    group: log.groupId && log.group ? { id: log.groupId, name: log.group.name } : null,
    // The raw Elite Insights JSON this was ever derived from is no longer
    // persisted (see Log.rawJson's old spot in schema.prisma) — nothing to
    // extract a per-second squad-DPS breakdown from anymore.
    dpsChart: null,
    // Boss health-over-time + phase breakdown, extracted at ingest into
    // Log.phaseData. Null on logs ingested before that existed (their raw JSON
    // is gone) — the detail page shows "coming soon" for those.
    bossHealth: bossHealthOf(log.phaseData),
    phases: phasesOf(log.phaseData),
    players: log.players.map((p) => {
      const masked = maskIdentity(p.characterName, p.player.account, p.player.user?.hideName ?? false, p.player.userId, req.user?.id);
      return {
      name: masked.name,
      account: masked.account,
      hidden: masked.hidden,
      profession: p.profession,
      spec: p.spec,
      subgroup: p.subgroup,
      role: p.powerDps >= p.condiDps ? 'power' : 'condi',
      // Boon-support/healer classification, distinct from the power/condi
      // damage-type split above — see LogPlayer.squadRole in the schema for
      // how this is computed (subgroup boon generation + real healing
      // output, never DPS magnitude).
      squadRole: p.squadRole,
      parsePct: pctByName.get(p.characterName) ?? null,
      total: p.totalDps,
      power: p.powerDps,
      condi: p.condiDps,
      powerPct: p.totalDps ? Math.round((p.powerDps / p.totalDps) * 100) : 0,
      condiPct: p.totalDps ? Math.round((p.condiDps / p.totalDps) * 100) : 0,
      damageTaken: p.damageTaken,
      downs: p.downCount,
      deaths: p.deadCount,
      boons: p.boons,
      mechanics: p.mechanics,
    };
    }),
    // Timeline/mechanics reference players by character name; mask the ones
    // whose linked user hid their name, or the name would leak here.
    mechanicEvents: log.mechanicEvents.map((e) => ({
      timeMs: e.timeMs,
      name: e.name,
      actor: e.actor ? maskedActorName.get(e.actor) ?? e.actor : e.actor,
      severity: e.severity,
    })),
    deathEvents: log.deathEvents.map((e) => ({
      timeMs: e.timeMs,
      actor: e.actor ? maskedActorName.get(e.actor) ?? e.actor : e.actor,
      killedBy: e.killedBy,
    })),
    // Per-mechanic FullName + Description from Elite Insights, keyed by short
    // name — powers the readable label + hover explainer on the Mechanics tab.
    mechanicsMeta: (log.mechanicsMeta as Record<string, { fullName: string | null; description: string | null }>) ?? {},
  });
}));

// Attributes an anonymous log to the signed-in user, retroactively — for
// logs uploaded before the uploader had linked (or even had) an account.
// Only allowed if nobody's claimed it yet and the requester's own linked
// GW2 account actually appears among the log's players (see canClaim above
// for the same check surfaced ahead of time on GET /:id).
logsRouter.post('/:id/claim', requireAuth, asyncHandler(async (req, res) => {
  const log = await prisma.log.findUnique({
    where: { id: req.params.id },
    select: { uploadedBy: true, players: { select: { player: { select: { account: true } } } } },
  });
  if (!log) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }
  if (log.uploadedBy) {
    res.status(400).json({ error: 'This log is already attributed to an uploader' });
    return;
  }
  const account = req.user!.gw2AccountName;
  if (!account || !log.players.some((p) => p.player.account === account)) {
    res.status(403).json({ error: 'Your linked GW2 account was not a player in this log' });
    return;
  }

  await prisma.log.update({ where: { id: req.params.id }, data: { uploadedBy: req.user!.id } });
  res.json({ ok: true });
}));

// Toggle a log's privacy — uploader or admin only.
logsRouter.patch('/:id/privacy', requireAuth, asyncHandler(async (req, res) => {
  const isPrivate = req.body?.private;
  if (typeof isPrivate !== 'boolean') {
    res.status(400).json({ error: 'private (boolean) is required' });
    return;
  }
  const log = await prisma.log.findUnique({ where: { id: req.params.id }, select: { uploadedBy: true } });
  if (!log) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }
  if (!canManageLog(log, req.user)) {
    res.status(403).json({ error: "You can't change this log's privacy" });
    return;
  }
  await prisma.log.update({ where: { id: req.params.id }, data: { private: isPrivate } });
  res.json({ ok: true, private: isPrivate });
}));

// Delete a log — uploader or admin only. LogPlayer/MechanicEvent/DeathEvent
// cascade on delete (schema). Same effect as the admin delete route.
logsRouter.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const log = await prisma.log.findUnique({ where: { id: req.params.id }, select: { uploadedBy: true } });
  if (!log) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }
  if (!canManageLog(log, req.user)) {
    res.status(403).json({ error: "You can't delete this log" });
    return;
  }
  await prisma.log.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
}));

// Assign / reassign / detach a log's group — uploader or admin only. When
// attaching to a group the caller must be a member of it. Pass groupId: null
// to detach.
logsRouter.put('/:id/group', requireAuth, asyncHandler(async (req, res) => {
  const raw = req.body?.groupId;
  const groupId = typeof raw === 'string' && raw ? raw : null;
  const log = await prisma.log.findUnique({ where: { id: req.params.id }, select: { uploadedBy: true } });
  if (!log) {
    res.status(404).json({ error: 'Log not found' });
    return;
  }
  if (!canManageLog(log, req.user)) {
    res.status(403).json({ error: "You can't change this log's group" });
    return;
  }
  if (groupId && !(await getGroupRole(groupId, req.user!.id))) {
    res.status(403).json({ error: 'You are not a member of that group' });
    return;
  }
  await prisma.log.update({ where: { id: req.params.id }, data: { groupId } });
  res.json({ ok: true, groupId });
}));
