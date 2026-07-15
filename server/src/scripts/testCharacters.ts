import '../loadEnv.js';
import { prisma } from '../db.js';

const realFetch = globalThis.fetch;

const MOCK_TOKENINFO = { id: 'key-id', name: 'gw2logs key', permissions: ['account', 'guilds', 'characters', 'builds'] };
const MOCK_ACCOUNT = { id: 'acct-uuid', name: 'CharTest.1234', world: 1001 };
const MOCK_CHARACTERS = [
  { name: 'Sai Zu', race: 'Sylvari', gender: 'Female', profession: 'Mesmer', level: 80, age: 1000, created: '2020-01-01T00:00:00Z', deaths: 5, active_build_tab: 2 },
];
// Spec 40 is flagged elite — resolving it is how the sync determines
// "Chronomancer" for tab 2 without a hardcoded id table.
const MOCK_SPECIALIZATIONS = [
  { id: 10, name: 'Domination', elite: false },
  { id: 20, name: 'Dueling', elite: false },
  { id: 30, name: 'Illusions', elite: false },
  { id: 40, name: 'Chronomancer', elite: true },
];
const MOCK_BUILDTABS: Record<string, any[]> = {
  'Sai Zu': [
    { tab: 1, is_active: false, build: { name: 'Roaming', specializations: [{ id: 10 }, { id: 20 }, { id: 30 }] } },
    { tab: 2, is_active: true, build: { name: 'Raid DPS', specializations: [{ id: 10 }, { id: 20 }, { id: 40 }] } },
  ],
};

let syncCallCount = 0;

globalThis.fetch = (async (input: string | URL) => {
  const url = typeof input === 'string' ? input : input.toString();
  if (url.includes('api.guildwars2.com/v2/tokeninfo')) {
    return new Response(JSON.stringify(MOCK_TOKENINFO), { status: 200 });
  }
  if (url.includes('api.guildwars2.com/v2/account')) {
    return new Response(JSON.stringify(MOCK_ACCOUNT), { status: 200 });
  }
  if (url.includes('api.guildwars2.com/v2/characters?ids=all')) {
    syncCallCount++;
    return new Response(JSON.stringify(MOCK_CHARACTERS), { status: 200 });
  }
  if (url.includes('/buildtabs')) {
    const name = decodeURIComponent(url.split('/characters/')[1].split('/buildtabs')[0]);
    return new Response(JSON.stringify(MOCK_BUILDTABS[name] ?? []), { status: 200 });
  }
  if (url.includes('api.guildwars2.com/v2/specializations')) {
    return new Response(JSON.stringify(MOCK_SPECIALIZATIONS), { status: 200 });
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

const { createSession } = await import('../lib/session.js');
const user = await prisma.user.create({ data: { discordId: 'char-test-user', discordUsername: 'CharTester' } });
const cookie = `gw2logs_session=${await createSession(user.id)}`;

// --- unauthenticated rejected ---
const anonRes = await realFetch(`${base}/api/characters`);
check('unauthenticated list rejected with 401', anonRes.status === 401);

// --- sync before linking a GW2 key is rejected ---
const syncBeforeLinkRes = await realFetch(`${base}/api/characters/sync`, { method: 'POST', headers: { cookie } });
check('sync without a linked GW2 key rejected with 400', syncBeforeLinkRes.status === 400);

// --- manual character add ---
const manualRes = await realFetch(`${base}/api/characters`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie },
  body: JSON.stringify({ name: 'Manual Toon', profession: 'Warrior' }),
});
const manualBody = (await manualRes.json()) as any;
check('manual character create succeeds with 201', manualRes.status === 201 && Boolean(manualBody.id));

const listAfterManual = (await (await realFetch(`${base}/api/characters`, { headers: { cookie } })).json()) as any[];
check('manual character appears in list', listAfterManual.some((c) => c.name === 'Manual Toon'));
check('manual character seeded with 3 blank templates', listAfterManual.find((c) => c.name === 'Manual Toon')?.templates.length === 3);

// --- assign a catalog build to a template tab ---
const manualId = manualBody.id;
const assignRes = await realFetch(`${base}/api/characters/${manualId}/templates/1`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', cookie },
  body: JSON.stringify({ assignedBuildId: 'warrior/power-berserker-tactics-spear-greatsword' }),
});
check('assigning a build to a template succeeds', assignRes.status === 200);
const listAfterAssign = (await (await realFetch(`${base}/api/characters`, { headers: { cookie } })).json()) as any[];
const assignedTemplate = listAfterAssign.find((c) => c.name === 'Manual Toon')?.templates.find((t: any) => t.tab === 1);
check('template reflects the assigned build id', assignedTemplate?.assignedBuildId === 'warrior/power-berserker-tactics-spear-greatsword');

// --- link a GW2 API key (reusing the real account route) ---
const linkRes = await realFetch(`${base}/api/account/link-gw2`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie },
  body: JSON.stringify({ apiKey: 'fake-gw2-key-for-char-test' }),
});
check('linking a GW2 key succeeds', linkRes.status === 200);

// --- sync pulls real characters + resolves elite specs ---
const syncRes = await realFetch(`${base}/api/characters/sync`, { method: 'POST', headers: { cookie } });
const syncBody = (await syncRes.json()) as any;
check('sync succeeds', syncRes.status === 200 && syncBody.ok === true);
check('sync reports 1 character pulled', syncBody.count === 1);

const listAfterSync = (await (await realFetch(`${base}/api/characters`, { headers: { cookie } })).json()) as any[];
check('manual character survives the sync', listAfterSync.some((c) => c.name === 'Manual Toon'));
const synced = listAfterSync.find((c) => c.name === 'Sai Zu');
check('synced character exists with source=gw2', Boolean(synced) && synced.source === 'gw2');
check('synced character has correct profession', synced?.profession === 'Mesmer');
check('synced character activeTab matches the API-flagged active tab (2)', synced?.activeTab === 2);
check('synced character has 2 templates', synced?.templates.length === 2);
const tab1 = synced?.templates.find((t: any) => t.tab === 1);
const tab2 = synced?.templates.find((t: any) => t.tab === 2);
check('tab 1 has no elite spec resolved (no elite line equipped)', tab1?.spec === null);
check('tab 2 elite spec resolved to Chronomancer via /v2/specializations', tab2?.spec === 'Chronomancer');
check('tab 2 is flagged active', tab2?.isActive === true);

// --- re-sync replaces gw2-sourced characters cleanly, no duplicates ---
const resyncRes = await realFetch(`${base}/api/characters/sync`, { method: 'POST', headers: { cookie } });
check('re-sync succeeds', resyncRes.status === 200);
const listAfterResync = (await (await realFetch(`${base}/api/characters`, { headers: { cookie } })).json()) as any[];
check('re-sync does not duplicate the character', listAfterResync.filter((c) => c.name === 'Sai Zu').length === 1);

// --- delete the manual character ---
const deleteRes = await realFetch(`${base}/api/characters/${manualId}`, { method: 'DELETE', headers: { cookie } });
check('deleting a manual character succeeds', deleteRes.status === 200);
const listAfterDelete = (await (await realFetch(`${base}/api/characters`, { headers: { cookie } })).json()) as any[];
check('deleted character is gone', !listAfterDelete.some((c) => c.name === 'Manual Toon'));

check('GW2 API was actually invoked (mock engaged)', syncCallCount > 0);

// --- cleanup ---
await prisma.characterTemplate.deleteMany({ where: { character: { userId: user.id } } });
await prisma.character.deleteMany({ where: { userId: user.id } });
await prisma.session.deleteMany({ where: { userId: user.id } });
await prisma.user.delete({ where: { id: user.id } });

server.close();
await prisma.$disconnect();
globalThis.fetch = realFetch;

const failed = assertions.filter(([, ok]) => !ok).length;
if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed.`);
  process.exit(1);
}
console.log('\nAll assertions passed.');
