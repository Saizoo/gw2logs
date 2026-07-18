import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { maskIdentity } from '../lib/privacy.js';

export const compareRouter = Router();

// Columns every compare needs, whichever way the parse was located.
const PARSE_SELECT = {
  logId: true,
  spec: true,
  profession: true,
  totalDps: true,
  powerDps: true,
  condiDps: true,
  damageTaken: true,
  downCount: true,
  deadCount: true,
  player: { select: { userId: true, user: { select: { hideName: true } } } },
  log: { select: { durationMs: true, fightName: true, isCm: true } },
} as const;

type ParseRow = NonNullable<Awaited<ReturnType<typeof loadByLog>>>;

function loadByLog(logId: string, account: string) {
  return prisma.logPlayer.findFirst({
    where: { logId, player: { account } },
    select: PARSE_SELECT,
  });
}

// The player's single best (highest-DPS) *successful* parse on an encounter —
// wipes are excluded so a comparison reflects real clears, same rule the
// leaderboard uses.
function loadBest(fightName: string, isCm: boolean, account: string) {
  return prisma.logPlayer.findFirst({
    where: { player: { account }, log: { fightName, isCm, success: true } },
    orderBy: { totalDps: 'desc' },
    select: PARSE_SELECT,
  });
}

// Where a parse ranks against the whole population for that encounter, as a
// 0–100 percentile ("beats N% of logged parses"). One grouped query.
async function percentileFor(fightName: string, isCm: boolean, dps: number): Promise<number> {
  const [row] = await prisma.$queryRaw<{ below: bigint; total: bigint }[]>`
    SELECT
      COUNT(*) FILTER (WHERE lp."totalDps" <= ${dps}) AS below,
      COUNT(*) AS total
    FROM "LogPlayer" lp
    JOIN "Log" l ON lp."logId" = l.id
    WHERE l."fightName" = ${fightName} AND l."isCm" = ${isCm} AND l.success = true
  `;
  const total = Number(row?.total ?? 0);
  if (total === 0) return 100;
  return Math.round((Number(row?.below ?? 0) / total) * 100);
}

async function serializeParse(account: string, row: ParseRow, viewerId: string | undefined) {
  const parsePct = await percentileFor(row.log.fightName, row.log.isCm, row.totalDps);
  const name = maskIdentity(account, account, row.player.user?.hideName ?? false, row.player.userId, viewerId).name;
  return {
    name,
    account,
    spec: row.spec,
    profession: row.profession,
    logId: row.logId,
    parsePct,
    dps: row.totalDps,
    powerDps: row.powerDps,
    condiDps: row.condiDps,
    duration: row.log.durationMs,
    downs: row.downCount,
    deaths: row.deadCount,
    damageTaken: row.damageTaken,
  };
}

type SerializedParse = Awaited<ReturnType<typeof serializeParse>>;

function buildRows(a: SerializedParse, b: SerializedParse) {
  const defs: { label: string; a: number; b: number; lowerIsBetter?: boolean }[] = [
    { label: 'Parse %', a: a.parsePct, b: b.parsePct },
    { label: 'DPS', a: a.dps, b: b.dps },
    { label: 'Power DPS', a: a.powerDps, b: b.powerDps },
    { label: 'Condi DPS', a: a.condiDps, b: b.condiDps },
    { label: 'Downstates', a: a.downs, b: b.downs, lowerIsBetter: true },
    { label: 'Deaths', a: a.deaths, b: b.deaths, lowerIsBetter: true },
    { label: 'Damage taken', a: a.damageTaken, b: b.damageTaken, lowerIsBetter: true },
    { label: 'Kill time', a: a.duration, b: b.duration, lowerIsBetter: true },
  ];
  return defs.map((row) => {
    const max = Math.max(row.a, row.b) || 1;
    // Fuller bar = better: for lower-is-better rows that means the smaller
    // value fills more, so scale each side against the best value.
    const better = row.lowerIsBetter ? Math.min(row.a, row.b) : Math.max(row.a, row.b);
    const aPct = row.lowerIsBetter ? Math.round((better / (row.a || 1)) * 100) : Math.round((row.a / max) * 100);
    const bPct = row.lowerIsBetter ? Math.round((better / (row.b || 1)) * 100) : Math.round((row.b / max) * 100);
    const winner = row.a === row.b ? 'tie' : (row.lowerIsBetter ? row.a < row.b : row.a > row.b) ? 'a' : 'b';
    return { label: row.label, a: row.a, b: row.b, aPct, bPct, lowerIsBetter: !!row.lowerIsBetter, winner };
  });
}

compareRouter.get('/', asyncHandler(async (req, res) => {
  const accountA = String(req.query.accountA ?? '');
  const accountB = String(req.query.accountB ?? '');
  const logIdA = req.query.logIdA ? String(req.query.logIdA) : '';
  const logIdB = req.query.logIdB ? String(req.query.logIdB) : '';
  const fightName = req.query.fightName ? String(req.query.fightName) : '';
  const isCm = req.query.cm === 'true';

  if (!accountA || !accountB) {
    res.status(400).json({ error: 'accountA and accountB are required' });
    return;
  }
  // Two ways to pick the parses: two explicit logs (the compare picker's
  // flow), or an encounter — in which case each player's best clear is used.
  const byLog = Boolean(logIdA && logIdB);
  if (!byLog && !fightName) {
    res.status(400).json({ error: 'Provide either logIdA+logIdB or fightName' });
    return;
  }

  const [rowA, rowB] = await Promise.all([
    byLog ? loadByLog(logIdA, accountA) : loadBest(fightName, isCm, accountA),
    byLog ? loadByLog(logIdB, accountB) : loadBest(fightName, isCm, accountB),
  ]);

  const boss = byLog
    ? { fightName: rowA?.log.fightName ?? rowB?.log.fightName ?? '', isCm: rowA?.log.isCm ?? false }
    : { fightName, isCm };

  const [playerA, playerB] = await Promise.all([
    rowA ? serializeParse(accountA, rowA, req.user?.id) : Promise.resolve(null),
    rowB ? serializeParse(accountB, rowB, req.user?.id) : Promise.resolve(null),
  ]);

  res.json({
    boss,
    playerA,
    playerB,
    rows: playerA && playerB ? buildRows(playerA, playerB) : [],
  });
}));
