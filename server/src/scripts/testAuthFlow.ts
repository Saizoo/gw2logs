import '../loadEnv.js';
import { prisma } from '../db.js';

const realFetch = globalThis.fetch;

const MOCK_DISCORD_USER = { id: 'discord-test-123', username: 'saizu', avatar: 'avatarhash' };
const MOCK_GW2_TOKENINFO = { id: 'key-id', name: 'gw2logs key', permissions: ['account'] };
const MOCK_GW2_ACCOUNT = { id: 'acct-uuid', name: 'SaiZu.1234', world: 1001 };

globalThis.fetch = (async (input: string | URL) => {
  const url = typeof input === 'string' ? input : input.toString();
  if (url.startsWith('https://discord.com/api/oauth2/token')) {
    return new Response(JSON.stringify({ access_token: 'fake-discord-token' }), { status: 200 });
  }
  if (url.startsWith('https://discord.com/api/users/@me')) {
    return new Response(JSON.stringify(MOCK_DISCORD_USER), { status: 200 });
  }
  if (url.includes('api.guildwars2.com/v2/tokeninfo')) {
    return new Response(JSON.stringify(MOCK_GW2_TOKENINFO), { status: 200 });
  }
  if (url.includes('api.guildwars2.com/v2/account')) {
    return new Response(JSON.stringify(MOCK_GW2_ACCOUNT), { status: 200 });
  }
  throw new Error(`Unexpected fetch in test: ${url}`);
}) as typeof fetch;

process.env.DISCORD_CLIENT_ID = 'test-client-id';
process.env.DISCORD_CLIENT_SECRET = 'test-client-secret';
process.env.DISCORD_REDIRECT_URI = 'http://localhost:0/api/auth/discord/callback';

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

// --- Step 1: hit /api/auth/discord, capture the state cookie ---
const discordStart = await realFetch(`${base}/api/auth/discord`, { redirect: 'manual' });
const stateCookie = discordStart.headers.get('set-cookie');
check('discord() sets an oauth state cookie', Boolean(stateCookie?.includes('gw2logs_oauth_state=')));
const location = discordStart.headers.get('location') ?? '';
check('discord() redirects to discord.com authorize URL', location.startsWith('https://discord.com/api/oauth2/authorize'));

const stateMatch = /gw2logs_oauth_state=([^;]+)/.exec(stateCookie ?? '');
const state = stateMatch?.[1] ?? '';

// --- Step 2: simulate the callback Discord would issue ---
const callbackRes = await realFetch(
  `${base}/api/auth/discord/callback?code=fake-code&state=${state}`,
  { redirect: 'manual', headers: { cookie: `gw2logs_oauth_state=${state}` } },
);
check('callback redirects to /account on success', callbackRes.status === 302 && callbackRes.headers.get('location') === '/account');
const sessionCookieHeader = callbackRes.headers.get('set-cookie') ?? '';
check('callback sets a session cookie', sessionCookieHeader.includes('gw2logs_session='));
const sessionMatch = /gw2logs_session=([^;]+)/.exec(sessionCookieHeader);
const sessionCookie = `gw2logs_session=${sessionMatch?.[1] ?? ''}`;

const userAfterLogin = await prisma.user.findUnique({ where: { discordId: MOCK_DISCORD_USER.id } });
check('User row created with correct Discord fields', userAfterLogin?.discordUsername === 'saizu');

// --- Step 3: /api/auth/me with the session cookie ---
const meRes = await realFetch(`${base}/api/auth/me`, { headers: { cookie: sessionCookie } });
const me = (await meRes.json()) as any;
check('/api/auth/me returns the signed-in user', meRes.status === 200 && me.discordUsername === 'saizu');
check('/api/auth/me never leaks gw2ApiKeyEnc', !('gw2ApiKeyEnc' in me));

// --- Step 4: link GW2 API key ---
const linkRes = await realFetch(`${base}/api/account/link-gw2`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: sessionCookie },
  body: JSON.stringify({ apiKey: 'FAKE-GW2-API-KEY' }),
});
const linkBody = (await linkRes.json()) as any;
check('link-gw2 succeeds', linkRes.status === 200);
check('link-gw2 returns the verified account name', linkBody.gw2AccountName === 'SaiZu.1234');

const userAfterLink = await prisma.user.findUnique({ where: { discordId: MOCK_DISCORD_USER.id } });
check('User.gw2AccountName stored', userAfterLink?.gw2AccountName === 'SaiZu.1234');
check('User.gw2ApiKeyEnc is encrypted (not the raw key)', Boolean(userAfterLink?.gw2ApiKeyEnc) && userAfterLink!.gw2ApiKeyEnc !== 'FAKE-GW2-API-KEY');

const linkedPlayer = await prisma.player.findUnique({ where: { account: 'SaiZu.1234' } });
check('Player row linked to the User', linkedPlayer?.userId === userAfterLink?.id);

// --- Step 5: unlink ---
const unlinkRes = await realFetch(`${base}/api/account/unlink-gw2`, { method: 'POST', headers: { cookie: sessionCookie } });
check('unlink-gw2 succeeds', unlinkRes.status === 200);
const userAfterUnlink = await prisma.user.findUnique({ where: { discordId: MOCK_DISCORD_USER.id } });
check('gw2AccountName cleared after unlink', userAfterUnlink?.gw2AccountName === null);

// --- Step 6: logout ---
const logoutRes = await realFetch(`${base}/api/auth/logout`, { method: 'POST', headers: { cookie: sessionCookie } });
check('logout succeeds', logoutRes.status === 200);
const meAfterLogout = await realFetch(`${base}/api/auth/me`, { headers: { cookie: sessionCookie } });
check('session is invalid after logout', meAfterLogout.status === 401);

// --- cleanup ---
await prisma.player.deleteMany({ where: { account: 'SaiZu.1234' } });
await prisma.user.deleteMany({ where: { discordId: MOCK_DISCORD_USER.id } });

server.close();
await prisma.$disconnect();

const failed = assertions.filter(([, ok]) => !ok).length;
if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed.`);
  process.exit(1);
}
console.log('\nAll assertions passed.');
