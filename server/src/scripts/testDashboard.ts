import '../loadEnv.js';
import { prisma } from '../db.js';
import { createSession } from '../lib/session.js';

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

// --- unauthenticated is rejected ---
const anonRes = await fetch(`${base}/api/dashboard`);
check('unauthenticated request rejected with 401', anonRes.status === 401);

// --- fixtures: two users, one with a linked player, one without ---
const userA = await prisma.user.create({ data: { discordId: 'dash-user-a', discordUsername: 'DashUserA' } });
const userNoPlayer = await prisma.user.create({ data: { discordId: 'dash-user-noplayer', discordUsername: 'DashNoPlayer' } });
const playerA = await prisma.player.create({ data: { account: 'DashA.1234', displayName: 'DashA', userId: userA.id } });

const userB = await prisma.user.create({ data: { discordId: 'dash-user-b', discordUsername: 'DashUserB' } });
const playerB = await prisma.player.create({ data: { account: 'DashB.1234', displayName: 'DashB', userId: userB.id } });

const now = new Date();
async function makeLog(hash: string, squadDps: number, success: boolean, playerId: string, characterName: string, daysAgo: number) {
  const uploadedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const log = await prisma.log.create({
    data: {
      fightName: 'Dashboard Test Boss', isCm: false, wing: null, success,
      durationMs: 90000, squadDps, encounterTime: uploadedAt, uploadedAt,
      contentHash: hash,
    },
  });
  await prisma.logPlayer.create({
    data: {
      logId: log.id, playerId, characterName, profession: 'Guardian', spec: 'Firebrand',
      subgroup: 1, totalDps: squadDps, powerDps: squadDps, condiDps: 0, damageTaken: 0, downCount: 0, deadCount: 0, boons: {}, mechanics: {},
    },
  });
  return log;
}

// playerA: 3 logs this week (2 kills, 1 wipe), 1 log last week (for delta)
await makeLog('dash-a-1', 10000, true, playerA.id, 'DashAChar', 1);
await makeLog('dash-a-2', 20000, true, playerA.id, 'DashAChar', 2);
await makeLog('dash-a-3', 15000, false, playerA.id, 'DashAChar', 3);
await makeLog('dash-a-prev', 12000, true, playerA.id, 'DashAChar', 10);

// playerB: 1 log this week
await makeLog('dash-b-1', 25000, true, playerB.id, 'DashBChar', 1);

const memberACookie = `gw2logs_session=${await createSession(userA.id)}`;
const noPlayerCookie = `gw2logs_session=${await createSession(userNoPlayer.id)}`;

// --- signed-in user with no linked player gets a valid degraded response ---
const noPlayerRes = await fetch(`${base}/api/dashboard`, { headers: { cookie: noPlayerCookie } });
const noPlayerBody = (await noPlayerRes.json()) as any;
check('no-linked-player request still returns 200', noPlayerRes.status === 200);
check('no-linked-player response has zeroed stats, not an error', noPlayerBody.stats.logsThisWeek === 0 && noPlayerBody.gw2AccountName === null);

// --- userA sees correct dashboard data ---
const dashRes = await fetch(`${base}/api/dashboard`, { headers: { cookie: memberACookie } });
const dash = (await dashRes.json()) as any;

check('dashboard request succeeds', dashRes.status === 200);
check('displayName is the linked player\'s GW2 account name', dash.displayName === 'DashA.1234');
check('logsThisWeek counts only this-week logs (3)', dash.stats.logsThisWeek === 3);
check('logsThisWeekDelta vs last week (3 - 1 = 2)', dash.stats.logsThisWeekDelta === 2);
check('clearsThisWeek counts only successes (2 of 3)', dash.stats.clearsThisWeek === 2);
check('avgSquadDps is the average of this week\'s 3 logs ((10000+20000+15000)/3=15000)', dash.stats.avgSquadDps === 15000);
check('weeklyActivity has 7 day-buckets', Array.isArray(dash.weeklyActivity) && dash.weeklyActivity.length === 7);
check('weeklyActivity buckets sum to logsThisWeek (3)', dash.weeklyActivity.reduce((s: number, b: any) => s + b.count, 0) === 3);
check('recentLogs includes all 4 of this player\'s logs, most recent first', dash.recentLogs.length === 4 && dash.recentLogs[0].dps === 10000);

// --- cleanup ---
await prisma.logPlayer.deleteMany({ where: { player: { account: { in: ['DashA.1234', 'DashB.1234'] } } } });
await prisma.log.deleteMany({ where: { fightName: 'Dashboard Test Boss' } });
await prisma.session.deleteMany({ where: { userId: { in: [userA.id, userB.id, userNoPlayer.id] } } });
await prisma.player.deleteMany({ where: { account: { in: ['DashA.1234', 'DashB.1234'] } } });
await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id, userNoPlayer.id] } } });

server.close();
await prisma.$disconnect();

const failed = assertions.filter(([, ok]) => !ok).length;
if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed.`);
  process.exit(1);
}
console.log('\nAll assertions passed.');
