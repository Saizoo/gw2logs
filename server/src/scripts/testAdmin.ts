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

const admin = await prisma.user.create({ data: { discordId: 'admin-test-user', discordUsername: 'AdminTest', isAdmin: true } });
const nonAdmin = await prisma.user.create({ data: { discordId: 'nonadmin-test-user', discordUsername: 'NonAdminTest' } });
const adminCookie = `gw2logs_session=${await createSession(admin.id)}`;
const nonAdminCookie = `gw2logs_session=${await createSession(nonAdmin.id)}`;

// --- access control ---
const anonRes = await fetch(`${base}/api/admin/overview`);
check('anonymous request rejected with 401', anonRes.status === 401);

const nonAdminRes = await fetch(`${base}/api/admin/overview`, { headers: { cookie: nonAdminCookie } });
check('non-admin request rejected with 403', nonAdminRes.status === 403);

const overviewRes = await fetch(`${base}/api/admin/overview`, { headers: { cookie: adminCookie } });
check('admin overview request succeeds', overviewRes.status === 200);
const overview = ((await overviewRes.json()) as any);
check('overview reports totalBuilds >= 225 (seeded catalog)', overview.totalBuilds >= 225);

// --- public builds endpoint (no auth required) ---
const publicBuildsRes = await fetch(`${base}/api/builds`);
check('public builds endpoint succeeds unauthenticated', publicBuildsRes.status === 200);
const publicBuilds = ((await publicBuildsRes.json()) as any);
check('public builds list is non-empty', publicBuilds.length >= 225);
check('public build row has no createdAt/updatedAt (trimmed shape)', publicBuilds[0].createdAt === undefined);

// --- admin builds CRUD ---
const createRes = await fetch(`${base}/api/admin/builds`, {
  method: 'POST',
  headers: { cookie: adminCookie, 'content-type': 'application/json' },
  body: JSON.stringify({
    profession: 'guard',
    category: 'qdps',
    name: 'Test Admin Build',
    weapons: 'Greatsword',
    url: 'https://snowcrows.com/builds/raids/guardian/test-admin-build',
  }),
});
check('admin create build succeeds (201)', createRes.status === 201);
const created = ((await createRes.json()) as any);
check('created build has derived id', created.id === 'guardian/test-admin-build');

const dupRes = await fetch(`${base}/api/admin/builds`, {
  method: 'POST',
  headers: { cookie: adminCookie, 'content-type': 'application/json' },
  body: JSON.stringify({
    profession: 'guard',
    category: 'qdps',
    name: 'Duplicate URL Build',
    weapons: 'Sword',
    url: 'https://snowcrows.com/builds/raids/guardian/test-admin-build',
  }),
});
check('duplicate-url create is rejected with 409', dupRes.status === 409);

const invalidRes = await fetch(`${base}/api/admin/builds`, {
  method: 'POST',
  headers: { cookie: adminCookie, 'content-type': 'application/json' },
  body: JSON.stringify({ profession: 'not-a-real-profession', category: 'qdps', name: 'X', weapons: 'X', url: 'https://x.com/x' }),
});
check('invalid profession create is rejected with 400', invalidRes.status === 400);

const updateRes = await fetch(`${base}/api/admin/builds/${encodeURIComponent(created.id)}`, {
  method: 'PUT',
  headers: { cookie: adminCookie, 'content-type': 'application/json' },
  body: JSON.stringify({ profession: 'guard', category: 'qdps', name: 'Test Admin Build (renamed)', weapons: 'Greatsword', url: created.url }),
});
check('admin update build succeeds', updateRes.status === 200);
const updated = ((await updateRes.json()) as any);
check('update actually changed the name', updated.name === 'Test Admin Build (renamed)');

const nonAdminCreateRes = await fetch(`${base}/api/admin/builds`, {
  method: 'POST',
  headers: { cookie: nonAdminCookie, 'content-type': 'application/json' },
  body: JSON.stringify({ profession: 'guard', category: 'qdps', name: 'Should Fail', weapons: 'X', url: 'https://x.com/y' }),
});
check('non-admin cannot create a build (403)', nonAdminCreateRes.status === 403);

const deleteRes = await fetch(`${base}/api/admin/builds/${encodeURIComponent(created.id)}`, {
  method: 'DELETE',
  headers: { cookie: adminCookie },
});
check('admin delete build succeeds', deleteRes.status === 200);

const afterDelete = await prisma.build.findUnique({ where: { id: created.id } });
check('build actually removed from DB', afterDelete === null);

// --- user management ---
const usersRes = await fetch(`${base}/api/admin/users`, { headers: { cookie: adminCookie } });
check('admin users list succeeds', usersRes.status === 200);
const usersBody = ((await usersRes.json()) as any);
check('users list includes the non-admin test user', usersBody.users.some((u: any) => u.id === nonAdmin.id));

const promoteRes = await fetch(`${base}/api/admin/users/${nonAdmin.id}/admin`, {
  method: 'PUT',
  headers: { cookie: adminCookie, 'content-type': 'application/json' },
  body: JSON.stringify({ isAdmin: true }),
});
check('promote user to admin succeeds', promoteRes.status === 200);
const promoted = await prisma.user.findUnique({ where: { id: nonAdmin.id } });
check('promoted user is actually isAdmin in DB', promoted?.isAdmin === true);

const selfDemoteRes = await fetch(`${base}/api/admin/users/${admin.id}/admin`, {
  method: 'PUT',
  headers: { cookie: adminCookie, 'content-type': 'application/json' },
  body: JSON.stringify({ isAdmin: false }),
});
check('admin cannot demote themselves (400)', selfDemoteRes.status === 400);

const logoutRes = await fetch(`${base}/api/admin/users/${nonAdmin.id}/logout`, {
  method: 'POST',
  headers: { cookie: adminCookie },
});
check('force-logout succeeds', logoutRes.status === 200);
const remainingSessions = await prisma.session.count({ where: { userId: nonAdmin.id } });
check('force-logout actually revoked the session', remainingSessions === 0);

// --- logs management ---
const logsListRes = await fetch(`${base}/api/admin/logs`, { headers: { cookie: adminCookie } });
check('admin logs list succeeds', logsListRes.status === 200);

// --- guilds/groups oversight ---
const guildsRes = await fetch(`${base}/api/admin/guilds`, { headers: { cookie: adminCookie } });
check('admin guilds list succeeds', guildsRes.status === 200);
const groupsRes = await fetch(`${base}/api/admin/groups`, { headers: { cookie: adminCookie } });
check('admin groups list succeeds', groupsRes.status === 200);

// --- upload jobs ---
const uploadsRes = await fetch(`${base}/api/admin/uploads`, { headers: { cookie: adminCookie } });
check('admin uploads list succeeds', uploadsRes.status === 200);

// --- cleanup ---
await prisma.user.deleteMany({ where: { id: { in: [admin.id, nonAdmin.id] } } });
server.close();

let failed = 0;
for (const [, ok] of assertions) if (!ok) failed++;
console.log(failed > 0 ? `\n${failed} assertion(s) failed.` : '\nAll assertions passed.');
if (failed > 0) process.exit(1);
