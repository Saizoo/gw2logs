import '../loadEnv.js';
import { prisma } from '../db.js';
import { sampleEiJson } from './fixtures/sampleEiJson.js';

const realFetch = globalThis.fetch;
const USER_TOKEN = 'fake-user-token';

const MOCK_UPLOADS = [
  { id: 'upload-1', permalink: 'https://dps.report/upload-1', uploadTime: 1, encounterTime: 1, encounter: { success: true } },
  { id: 'upload-2', permalink: 'https://dps.report/upload-2', uploadTime: 2, encounterTime: 2, encounter: { success: false, error: 'Encounter did not start' } },
];

let getUploadsCalls = 0;
let getJsonCalls = 0;

globalThis.fetch = (async (input: string | URL) => {
  const url = typeof input === 'string' ? input : input.toString();
  if (url.startsWith('https://dps.report/getUploads')) {
    getUploadsCalls++;
    if (!url.includes(`userToken=${USER_TOKEN}`)) {
      return new Response(JSON.stringify({ error: 'invalid token' }), { status: 400 });
    }
    return new Response(
      JSON.stringify({ uploads: MOCK_UPLOADS, pages: 1, totalUploads: MOCK_UPLOADS.length }),
      { status: 200 },
    );
  }
  if (url.startsWith('https://dps.report/getJson')) {
    getJsonCalls++;
    return new Response(JSON.stringify(sampleEiJson), { status: 200 });
  }
  throw new Error(`Unexpected fetch in test: ${url}`);
}) as typeof fetch;

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

// --- set up a signed-in session directly (skip full Discord flow, already
// covered by testAuthFlow.ts — this test is about the import pipeline) ---
const user = await prisma.user.create({
  data: { discordId: 'dps-import-test-user', discordUsername: 'importer' },
});
const { createSession } = await import('../lib/session.js');
const token = await createSession(user.id);
const sessionCookie = `gw2logs_session=${token}`;

// --- reject a bad token before starting any background work ---
const badRes = await realFetch(`${base}/api/account/import-dpsreport`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: sessionCookie },
  body: JSON.stringify({ userToken: 'wrong-token' }),
});
check('bad userToken rejected with 400', badRes.status === 400);

// --- kick off a real import ---
const startRes = await realFetch(`${base}/api/account/import-dpsreport`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: sessionCookie },
  body: JSON.stringify({ userToken: USER_TOKEN }),
});
const startBody = (await startRes.json()) as any;
check('import starts and returns a batchId', startRes.status === 200 && Boolean(startBody.batchId));
check('reports the correct total (2 uploads)', startBody.total === 2);

// --- poll until done ---
let finalStatus: any = null;
for (let i = 0; i < 50; i++) {
  const statusRes = await realFetch(`${base}/api/account/import-dpsreport/${startBody.batchId}`, {
    headers: { cookie: sessionCookie },
  });
  finalStatus = await statusRes.json();
  if (finalStatus.done) break;
  await new Promise((r) => setTimeout(r, 100));
}
check('batch reaches done=true', finalStatus?.done === true);
check('1 succeeded (the valid encounter)', finalStatus?.succeeded === 1);
check('1 failed (the encounter with an error)', finalStatus?.failed === 1);
check('processed matches total', finalStatus?.processed === 2);

// --- verify the successful log was actually persisted with the right dedup key ---
const importedLog = await prisma.log.findUnique({ where: { contentHash: 'dpsreport:upload-1' } });
check('log persisted with dpsreport: contentHash', Boolean(importedLog));
check('persisted log has the fixture fight name', importedLog?.fightName === 'Dhuum');

const failedLog = await prisma.log.findUnique({ where: { contentHash: 'dpsreport:upload-2' } });
check('the errored encounter was NOT persisted', failedLog === null);

// --- re-run the import: already-imported upload-1 should be skipped, not duplicated ---
const rerunRes = await realFetch(`${base}/api/account/import-dpsreport`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: sessionCookie },
  body: JSON.stringify({ userToken: USER_TOKEN }),
});
const rerunBody = (await rerunRes.json()) as any;
let rerunStatus: any = null;
for (let i = 0; i < 50; i++) {
  const statusRes = await realFetch(`${base}/api/account/import-dpsreport/${rerunBody.batchId}`, {
    headers: { cookie: sessionCookie },
  });
  rerunStatus = await statusRes.json();
  if (rerunStatus.done) break;
  await new Promise((r) => setTimeout(r, 100));
}
const logCountAfterRerun = await prisma.log.count({ where: { contentHash: 'dpsreport:upload-1' } });
check('re-running the import does not duplicate the log', logCountAfterRerun === 1);
check('re-run still counts the dupe as succeeded (dedup, not a failure)', rerunStatus?.succeeded === 1);

check('getJson was only called once for upload-1 (not re-fetched on the dedup re-run)', getJsonCalls === 1);
check('getUploads was actually invoked (mock engaged)', getUploadsCalls > 0);

// --- cleanup ---
await prisma.mechanicEvent.deleteMany({ where: { logId: importedLog!.id } });
await prisma.logPlayer.deleteMany({ where: { logId: importedLog!.id } });
await prisma.log.delete({ where: { id: importedLog!.id } });
await prisma.player.deleteMany({ where: { account: { in: ['SaiZu.1234', 'Moira.5678'] } } });
await prisma.session.deleteMany({ where: { userId: user.id } });
await prisma.user.delete({ where: { id: user.id } });

server.close();
await prisma.$disconnect();

const failed = assertions.filter(([, ok]) => !ok).length;
if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed.`);
  process.exit(1);
}
console.log('\nAll assertions passed.');
