import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { RAID_BOSSES, FRACTAL_CM_BOSSES, categorizeFight } from '../lib/bossMeta.js';

export const logsRouter = Router();

logsRouter.get('/', asyncHandler(async (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const killsOnly = req.query.killsOnly === 'true';
  const mine = req.query.mine === 'true';
  const groupId = typeof req.query.groupId === 'string' ? req.query.groupId : undefined;
  // Exact fightName filter — the Encounters page links each boss card here.
  const boss = typeof req.query.boss === 'string' && req.query.boss ? req.query.boss : undefined;
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
    ...(boss ? { fightName: boss } : {}),
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
      boss: l.fightName,
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
          player: { select: { account: true } },
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

  // Same convention as the leaderboard/list routes: each player's parse
  // badge is their percentile against the global population for this exact
  // boss+CM, computed via one window-function query rather than N lookups.
  // Scoped by logId (not just characterName) so a character that has
  // played this same boss in other logs doesn't leak its best-ever
  // percentile onto this specific log's row. Single-row populations are
  // forced to the 100th percentile (see the /:id list route above for why
  // PERCENT_RANK() alone would wrongly give the only performer a 0).
  const playerPercentiles = await prisma.$queryRaw<{ characterName: string; pct: number }[]>`
    WITH ranked AS (
      SELECT lp."logId", lp."characterName",
        CASE WHEN COUNT(*) OVER (PARTITION BY l."fightName", l."isCm") <= 1 THEN 1.0
             ELSE PERCENT_RANK() OVER (PARTITION BY l."fightName", l."isCm" ORDER BY lp."totalDps")
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
    group: log.groupId && log.group ? { id: log.groupId, name: log.group.name } : null,
    // The raw Elite Insights JSON this was ever derived from is no longer
    // persisted (see Log.rawJson's old spot in schema.prisma) — nothing to
    // extract a per-second breakdown from anymore.
    dpsChart: null,
    players: log.players.map((p) => ({
      name: p.characterName,
      account: p.player.account,
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
    })),
    mechanicEvents: log.mechanicEvents.map((e) => ({
      timeMs: e.timeMs,
      name: e.name,
      actor: e.actor,
      severity: e.severity,
    })),
    deathEvents: log.deathEvents.map((e) => ({
      timeMs: e.timeMs,
      actor: e.actor,
      killedBy: e.killedBy,
    })),
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
