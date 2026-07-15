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

// --- fixtures: a group with a leader, a plain member, and an outsider ---
const leader = await prisma.user.create({ data: { discordId: 'comp-test-leader', discordUsername: 'CompLeader' } });
const plainMember = await prisma.user.create({ data: { discordId: 'comp-test-member', discordUsername: 'CompMember' } });
const outsider = await prisma.user.create({ data: { discordId: 'comp-test-outsider', discordUsername: 'CompOutsider' } });

const group = await prisma.group.create({
  data: {
    name: 'Composition Test Group',
    leaderId: leader.id,
    members: {
      create: [
        { userId: leader.id, role: 'leader' },
        { userId: plainMember.id, role: 'member' },
      ],
    },
  },
});

const leaderCookie = `gw2logs_session=${await createSession(leader.id)}`;
const memberCookie = `gw2logs_session=${await createSession(plainMember.id)}`;
const outsiderCookie = `gw2logs_session=${await createSession(outsider.id)}`;

// --- unauthenticated create is rejected ---
const anonRes = await fetch(`${base}/api/compositions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ groupId: group.id, name: 'Should fail' }),
});
check('anonymous create rejected with 401', anonRes.status === 401);

// --- plain member (not leader/subleader) cannot create ---
const memberCreateRes = await fetch(`${base}/api/compositions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: memberCookie },
  body: JSON.stringify({ groupId: group.id, name: 'Should also fail' }),
});
check('plain member create rejected with 403', memberCreateRes.status === 403);

// --- outsider cannot create either ---
const outsiderRes = await fetch(`${base}/api/compositions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: outsiderCookie },
  body: JSON.stringify({ groupId: group.id, name: 'Should fail too' }),
});
check('non-member create rejected with 403', outsiderRes.status === 403);

// --- leader creates a composition ---
const createRes = await fetch(`${base}/api/compositions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: leaderCookie },
  body: JSON.stringify({ groupId: group.id, name: 'Sunday Night Comp', fightName: 'Vale Guardian' }),
});
const createBody = (await createRes.json()) as any;
check('leader create succeeds with 201', createRes.status === 201 && Boolean(createBody.id));
const compId = createBody.id;

// --- list shows it ---
const listRes = await fetch(`${base}/api/compositions?groupId=${group.id}`);
const listBody = (await listRes.json()) as any[];
check('list includes the new composition', listBody.some((c) => c.id === compId));
check('list entry has correct name', listBody.find((c) => c.id === compId)?.name === 'Sunday Night Comp');

// --- detail shows empty slots ---
const detailRes1 = await fetch(`${base}/api/compositions/${compId}`);
const detailBody1 = (await detailRes1.json()) as any;
check('detail has correct groupId', detailBody1.groupId === group.id);
check('detail starts with no slots', Array.isArray(detailBody1.slots) && detailBody1.slots.length === 0);

// --- fill a slot with free-text fields (no catalog build) ---
const fillRes = await fetch(`${base}/api/compositions/${compId}/slots/1/0`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', cookie: leaderCookie },
  body: JSON.stringify({
    role: 'Alacrity Heal', profession: 'Guardian', spec: 'Firebrand',
    buildName: 'Heal Alacrity Firebrand', buildDetails: 'Axe/Shield · Staff',
  }),
});
check('filling a slot succeeds', fillRes.status === 200);

// --- plain member cannot fill a slot ---
const fillMemberRes = await fetch(`${base}/api/compositions/${compId}/slots/1/1`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', cookie: memberCookie },
  body: JSON.stringify({ role: 'Power DPS', profession: 'Warrior' }),
});
check('plain member filling a slot rejected with 403', fillMemberRes.status === 403);

// --- fill a slot with a structured buildId (catalog pick) ---
const fillStructuredRes = await fetch(`${base}/api/compositions/${compId}/slots/1/1`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', cookie: leaderCookie },
  body: JSON.stringify({
    role: 'Power DPS', profession: 'Warrior', spec: 'Berserker',
    buildId: 'warrior/power-berserker-tactics-spear-greatsword',
  }),
});
check('filling a slot with a catalog buildId succeeds', fillStructuredRes.status === 200);

const detailRes2 = await fetch(`${base}/api/compositions/${compId}`);
const detailBody2 = (await detailRes2.json()) as any;
check('detail now has exactly 2 slots', detailBody2.slots.length === 2);
const slot0 = detailBody2.slots.find((s: any) => s.subgroup === 1 && s.slotIndex === 0);
const slot1 = detailBody2.slots.find((s: any) => s.subgroup === 1 && s.slotIndex === 1);
check('free-text slot has correct role/profession/spec', slot0?.role === 'Alacrity Heal' && slot0?.profession === 'Guardian' && slot0?.spec === 'Firebrand');
check('structured slot has correct buildId', slot1?.buildId === 'warrior/power-berserker-tactics-spear-greatsword');

// --- re-filling the same slot updates rather than duplicates ---
await fetch(`${base}/api/compositions/${compId}/slots/1/0`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', cookie: leaderCookie },
  body: JSON.stringify({ role: 'Power Quickness', profession: 'Warrior', spec: 'Berserker' }),
});
const detailRes3 = await fetch(`${base}/api/compositions/${compId}`);
const detailBody3 = (await detailRes3.json()) as any;
check('re-filling the same slot updates in place (still 2 slots)', detailBody3.slots.length === 2);
check('updated slot reflects new values', detailBody3.slots.find((s: any) => s.subgroup === 1 && s.slotIndex === 0)?.profession === 'Warrior');

// --- rename the composition ---
const renameRes = await fetch(`${base}/api/compositions/${compId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', cookie: leaderCookie },
  body: JSON.stringify({ name: 'Renamed Comp' }),
});
check('rename succeeds', renameRes.status === 200);
const detailRes4 = await fetch(`${base}/api/compositions/${compId}`);
const detailBody4 = (await detailRes4.json()) as any;
check('name actually changed', detailBody4.name === 'Renamed Comp');

// --- clear a slot ---
const clearRes = await fetch(`${base}/api/compositions/${compId}/slots/1/0`, {
  method: 'DELETE',
  headers: { cookie: leaderCookie },
});
check('clearing a slot succeeds', clearRes.status === 200);
const detailRes5 = await fetch(`${base}/api/compositions/${compId}`);
const detailBody5 = (await detailRes5.json()) as any;
check('slot is gone after clearing (1 left)', detailBody5.slots.length === 1);

// --- plain member cannot delete the composition ---
const deleteMemberRes = await fetch(`${base}/api/compositions/${compId}`, {
  method: 'DELETE',
  headers: { cookie: memberCookie },
});
check('plain member delete rejected with 403', deleteMemberRes.status === 403);

// --- leader deletes the composition ---
const deleteRes = await fetch(`${base}/api/compositions/${compId}`, {
  method: 'DELETE',
  headers: { cookie: leaderCookie },
});
check('leader delete succeeds', deleteRes.status === 200);
const detailRes6 = await fetch(`${base}/api/compositions/${compId}`);
check('composition is gone after delete (404)', detailRes6.status === 404);

// --- cleanup ---
await prisma.groupMember.deleteMany({ where: { groupId: group.id } });
await prisma.group.delete({ where: { id: group.id } });
await prisma.session.deleteMany({ where: { userId: { in: [leader.id, plainMember.id, outsider.id] } } });
await prisma.user.deleteMany({ where: { id: { in: [leader.id, plainMember.id, outsider.id] } } });

server.close();
await prisma.$disconnect();

const failed = assertions.filter(([, ok]) => !ok).length;
if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed.`);
  process.exit(1);
}
console.log('\nAll assertions passed.');
