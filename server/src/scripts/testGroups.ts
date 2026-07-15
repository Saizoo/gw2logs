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

async function postJson(path: string, body: unknown, cookie?: string) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}
async function putJson(path: string, body: unknown, cookie?: string) {
  return fetch(`${base}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

// --- fixtures: three users ---
const leader = await prisma.user.create({ data: { discordId: 'grp-test-leader', discordUsername: 'GrpLeader' } });
const joiner = await prisma.user.create({ data: { discordId: 'grp-test-joiner', discordUsername: 'GrpJoiner' } });
const outsider = await prisma.user.create({ data: { discordId: 'grp-test-outsider', discordUsername: 'GrpOutsider' } });

const leaderCookie = `gw2logs_session=${await createSession(leader.id)}`;
const joinerCookie = `gw2logs_session=${await createSession(joiner.id)}`;
const outsiderCookie = `gw2logs_session=${await createSession(outsider.id)}`;

// --- unauthenticated create rejected ---
const anonCreate = await postJson('/api/groups', { name: 'Should Fail' });
check('anonymous create rejected with 401', anonCreate.status === 401);

// --- leader creates a group ---
const createRes = await postJson('/api/groups', { name: 'Voidwalkers Statics' }, leaderCookie);
const createBody = (await createRes.json()) as any;
check('create succeeds with 201', createRes.status === 201 && Boolean(createBody.id));
const groupId = createBody.id;

// --- creator is auto-leader ---
const detail1 = (await (await fetch(`${base}/api/groups/${groupId}`)).json()) as any;
check('creator is the leader', detail1.leader === 'GrpLeader');
check('creator is in members list with role leader', detail1.members.some((m: any) => m.username === 'GrpLeader' && m.role === 'leader'));

// --- search finds it ---
const searchRes = await fetch(`${base}/api/groups?search=Voidwalkers`);
const searchBody = (await searchRes.json()) as any[];
check('public search finds the group', searchBody.some((g) => g.id === groupId));

// --- join request flow ---
const reqRes = await postJson(`/api/groups/${groupId}/join-requests`, {}, joinerCookie);
check('join request succeeds', reqRes.status === 201);

const reqDoubleRes = await postJson(`/api/groups/${groupId}/join-requests`, {}, joinerCookie);
check('duplicate join request is idempotent (not an error)', reqDoubleRes.status === 201);

const outsiderListReq = await fetch(`${base}/api/groups/${groupId}/join-requests`, { headers: { cookie: outsiderCookie } });
check('non-manager cannot list join requests (403)', outsiderListReq.status === 403);

const listReqRes = await fetch(`${base}/api/groups/${groupId}/join-requests`, { headers: { cookie: leaderCookie } });
const listReqBody = (await listReqRes.json()) as any[];
check('leader sees exactly 1 pending request', listReqBody.length === 1 && listReqBody[0].username === 'GrpJoiner');

// --- approve ---
const approveRes = await postJson(`/api/groups/${groupId}/join-requests/${joiner.id}/approve`, {}, leaderCookie);
check('approve succeeds', approveRes.status === 200);

const detail2 = (await (await fetch(`${base}/api/groups/${groupId}`)).json()) as any;
check('approved user is now a member', detail2.members.some((m: any) => m.username === 'GrpJoiner' && m.role === 'member'));

const listReqAfter = (await (await fetch(`${base}/api/groups/${groupId}/join-requests`, { headers: { cookie: leaderCookie } })).json()) as any[];
check('request is gone after approval', listReqAfter.length === 0);

// --- roster requires membership ---
const rosterOutsider = await fetch(`${base}/api/groups/${groupId}/roster`, { headers: { cookie: outsiderCookie } });
check('non-member roster access rejected with 403', rosterOutsider.status === 403);
const rosterMember = await fetch(`${base}/api/groups/${groupId}/roster`, { headers: { cookie: joinerCookie } });
check('member can view roster', rosterMember.status === 200);

// --- promote / demote / makeleader (leader-only) ---
const promoteByMemberRes = await putJson(`/api/groups/${groupId}/members/${joiner.id}`, { action: 'promote' }, joinerCookie);
check('non-leader cannot promote (403)', promoteByMemberRes.status === 403);

const promoteRes = await putJson(`/api/groups/${groupId}/members/${joiner.id}`, { action: 'promote' }, leaderCookie);
check('leader promotes joiner to subleader', promoteRes.status === 200);
const detail3 = (await (await fetch(`${base}/api/groups/${groupId}`)).json()) as any;
check('joiner is now subleader', detail3.members.find((m: any) => m.username === 'GrpJoiner')?.role === 'subleader');

// --- subleader can invite but not change roles ---
const inviteRes = await postJson(`/api/groups/${groupId}/members`, { username: 'GrpOutsider' }, joinerCookie);
check('subleader can invite a member directly', inviteRes.status === 200);
const detail4 = (await (await fetch(`${base}/api/groups/${groupId}`)).json()) as any;
check('invited user is now a member', detail4.members.some((m: any) => m.username === 'GrpOutsider' && m.role === 'member'));

const subleaderPromoteRes = await putJson(`/api/groups/${groupId}/members/${outsider.id}`, { action: 'promote' }, joinerCookie);
check('subleader cannot promote others (403)', subleaderPromoteRes.status === 403);

// --- subleader can remove plain members ---
const removeByOutsiderTry = await fetch(`${base}/api/groups/${groupId}/members/${outsider.id}`, { method: 'DELETE', headers: { cookie: joinerCookie } });
check('subleader can remove a plain member', removeByOutsiderTry.status === 200);

// --- leader cannot be removed ---
const removeLeaderRes = await fetch(`${base}/api/groups/${groupId}/members/${leader.id}`, { method: 'DELETE', headers: { cookie: leaderCookie } });
check('leader cannot be removed via members endpoint', removeLeaderRes.status === 400);

// --- makeleader handoff ---
const makeLeaderRes = await putJson(`/api/groups/${groupId}/members/${joiner.id}`, { action: 'makeleader' }, leaderCookie);
check('leader hands off leadership', makeLeaderRes.status === 200);
const detail5 = (await (await fetch(`${base}/api/groups/${groupId}`)).json()) as any;
check('joiner is now leader', detail5.leader === 'GrpJoiner');
check('old leader is now subleader', detail5.members.find((m: any) => m.username === 'GrpLeader')?.role === 'subleader');

// --- old leader (now subleader) can leave ---
const leaveRes = await fetch(`${base}/api/groups/${groupId}/members/${leader.id}`, { method: 'DELETE', headers: { cookie: leaderCookie } });
check('former leader can leave as subleader', leaveRes.status === 200);

// --- new leader deletes the group ---
const deleteByNonLeader = await fetch(`${base}/api/groups/${groupId}`, { method: 'DELETE', headers: { cookie: outsiderCookie } });
check('non-leader cannot delete group (403)', deleteByNonLeader.status === 403);
const deleteRes = await fetch(`${base}/api/groups/${groupId}`, { method: 'DELETE', headers: { cookie: joinerCookie } });
check('current leader deletes the group', deleteRes.status === 200);
const detailAfterDelete = await fetch(`${base}/api/groups/${groupId}`);
check('group is gone after delete (404)', detailAfterDelete.status === 404);

// --- cleanup ---
await prisma.session.deleteMany({ where: { userId: { in: [leader.id, joiner.id, outsider.id] } } });
await prisma.user.deleteMany({ where: { id: { in: [leader.id, joiner.id, outsider.id] } } });

server.close();
await prisma.$disconnect();

const failed = assertions.filter(([, ok]) => !ok).length;
if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed.`);
  process.exit(1);
}
console.log('\nAll assertions passed.');
