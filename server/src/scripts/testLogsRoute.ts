import '../loadEnv.js';
import { prisma } from '../db.js';

const { createApp } = await import('../app.js');
const app = createApp();
const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const { port } = server.address() as { port: number };
const base = `http://127.0.0.1:${port}`;

const assertions: [string, boolean][] = [];
function check(label: string, ok: boolean) {
  assertions.push([label, ok]);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`);
}

// --- fixtures: two logs of the same boss+CM so percentiles are meaningful ---
const playerHigh = await prisma.player.create({ data: { account: 'LogsRouteHigh.1234', displayName: 'HighDps' } });
const playerLow = await prisma.player.create({ data: { account: 'LogsRouteLow.1234', displayName: 'LowDps' } });

async function makeLog(
  hash: string,
  squadDps: number,
  players: { playerId: string; name: string; total: number; power: number; condi: number; subgroup: number }[],
  fightName = 'Logs Route Test Boss',
) {
  const log = await prisma.log.create({
    data: {
      fightName, isCm: false, wing: null, success: true,
      durationMs: 90000, squadDps, encounterTime: new Date(), uploadedAt: new Date(),
      contentHash: hash, rawJson: {},
    },
  });
  for (const p of players) {
    await prisma.logPlayer.create({
      data: {
        logId: log.id, playerId: p.playerId, characterName: p.name, profession: 'Guardian', spec: 'Firebrand',
        subgroup: p.subgroup, totalDps: p.total, powerDps: p.power, condiDps: p.condi,
        damageTaken: 0, downCount: 0, deadCount: 0, boons: {}, mechanics: {},
      },
    });
  }
  return log;
}

const logA = await makeLog('logsroute-a', 30000, [
  { playerId: playerHigh.id, name: 'HighChar', total: 20000, power: 15000, condi: 5000, subgroup: 1 },
  { playerId: playerLow.id, name: 'LowChar', total: 10000, power: 2000, condi: 8000, subgroup: 2 },
]);
await makeLog('logsroute-b', 25000, [
  { playerId: playerHigh.id, name: 'HighChar', total: 5000, power: 4000, condi: 1000, subgroup: 1 },
]);

// --- list route ---
const listRes = await fetch(`${base}/api/logs?limit=10`);
const listBody = (await listRes.json()) as any[];
check('list route succeeds', listRes.status === 200);
const listedA = listBody.find((l) => l.id === logA.id);
check('list includes our fixture log', Boolean(listedA));
check('list log has category "other" (no wing)', listedA?.category === 'other');
check('list log has a numeric parsePct', typeof listedA?.parsePct === 'number');

const raidListRes = await fetch(`${base}/api/logs?category=raid`);
const raidListBody = (await raidListRes.json()) as any[];
check('category=raid filter excludes our wingless fixture logs', !raidListBody.some((l) => l.id === logA.id));

// --- detail route ---
const detailRes = await fetch(`${base}/api/logs/${logA.id}`);
const detail = (await detailRes.json()) as any;
check('detail route succeeds', detailRes.status === 200);
check('detail has both players', detail.players.length === 2);
const highRow = detail.players.find((p: any) => p.name === 'HighChar');
const lowRow = detail.players.find((p: any) => p.name === 'LowChar');
// Population for this boss+CM is 3 rows total (HighChar appears in both
// logA and logB): 5000, 10000, 20000. logA's HighChar row is the top
// (20000 -> 100th pct); logA's LowChar row (10000) sits mid-pack (50th).
// This also confirms percentile is scoped per logId, not per character
// across all their logs — otherwise HighChar's 5000-dps logB row would
// drag this down or MAX() would leak the wrong log's percentile in.
check('high performer has parsePct 100 (top of 3 for this boss)', highRow?.parsePct === 100);
check('low performer has parsePct 50 (middle of 3 for this boss)', lowRow?.parsePct === 50);
check('high performer role is power (15000 >= 5000)', highRow?.role === 'power');
check('low performer role is condi (2000 < 8000)', lowRow?.role === 'condi');
check('dpsChart is null (no combat-replay data in fixture rawJson)', detail.dpsChart === null);

const notFoundRes = await fetch(`${base}/api/logs/does-not-exist`);
check('unknown log id returns 404', notFoundRes.status === 404);

// --- single-row population: the only performer must be 100th pct, not 0th ---
const soloPlayer = await prisma.player.create({ data: { account: 'LogsRouteSolo.1234', displayName: 'SoloDps' } });
const soloLog = await makeLog(
  'logsroute-solo',
  15000,
  [{ playerId: soloPlayer.id, name: 'SoloChar', total: 15000, power: 15000, condi: 0, subgroup: 1 }],
  'Logs Route Solo Boss',
);
const soloListRes = await fetch(`${base}/api/logs?limit=10`);
const soloListBody = (await soloListRes.json()) as any[];
check('solo-performer log gets parsePct 100 in the list route, not 0', soloListBody.find((l) => l.id === soloLog.id)?.parsePct === 100);
const soloDetailRes = await fetch(`${base}/api/logs/${soloLog.id}`);
const soloDetail = (await soloDetailRes.json()) as any;
check('solo-performer gets parsePct 100 in the detail route, not 0', soloDetail.players[0]?.parsePct === 100);
await prisma.logPlayer.deleteMany({ where: { player: { account: 'LogsRouteSolo.1234' } } });
await prisma.log.deleteMany({ where: { contentHash: 'logsroute-solo' } });
await prisma.player.deleteMany({ where: { account: 'LogsRouteSolo.1234' } });

// --- cleanup ---
await prisma.logPlayer.deleteMany({ where: { player: { account: { in: ['LogsRouteHigh.1234', 'LogsRouteLow.1234'] } } } });
await prisma.log.deleteMany({ where: { fightName: 'Logs Route Test Boss' } });
await prisma.player.deleteMany({ where: { account: { in: ['LogsRouteHigh.1234', 'LogsRouteLow.1234'] } } });

server.close();
await prisma.$disconnect();

const failed = assertions.filter(([, ok]) => !ok).length;
if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed.`);
  process.exit(1);
}
console.log('\nAll assertions passed.');
