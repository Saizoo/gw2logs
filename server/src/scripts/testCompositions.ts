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

// --- fixtures: a guild, a member, and a non-member ---
const guild = await prisma.guild.create({
  data: { gw2GuildId: 'test-guild-comp', name: 'Composition Test Guild', tag: 'CTST' },
});
const member = await prisma.user.create({
  data: { discordId: 'comp-test-member', discordUsername: 'CompMember' },
});
await prisma.guildMembership.create({ data: { userId: member.id, guildId: guild.id } });
const outsider = await prisma.user.create({
  data: { discordId: 'comp-test-outsider', discordUsername: 'CompOutsider' },
});

const memberCookie = `gw2logs_session=${await createSession(member.id)}`;
const outsiderCookie = `gw2logs_session=${await createSession(outsider.id)}`;

// --- unauthenticated create is rejected ---
const anonRes = await fetch(`${base}/api/compositions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ guildTag: 'CTST', name: 'Should fail' }),
});
check('anonymous create rejected with 401', anonRes.status === 401);

// --- non-member create is rejected ---
const outsiderRes = await fetch(`${base}/api/compositions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: outsiderCookie },
  body: JSON.stringify({ guildTag: 'CTST', name: 'Should also fail' }),
});
check('non-member create rejected with 403', outsiderRes.status === 403);

// --- member creates a composition ---
const createRes = await fetch(`${base}/api/compositions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: memberCookie },
  body: JSON.stringify({ guildTag: 'CTST', name: 'Sunday Night Comp', fightName: 'Vale Guardian' }),
});
const createBody = (await createRes.json()) as any;
check('member create succeeds with 201', createRes.status === 201 && Boolean(createBody.id));
const compId = createBody.id;

// --- list shows it ---
const listRes = await fetch(`${base}/api/compositions?guildTag=CTST`);
const listBody = (await listRes.json()) as any[];
check('list includes the new composition', listBody.some((c) => c.id === compId));
check('list entry has correct name and fightName', listBody.find((c) => c.id === compId)?.name === 'Sunday Night Comp');

// --- detail shows empty slots ---
const detailRes1 = await fetch(`${base}/api/compositions/${compId}`);
const detailBody1 = (await detailRes1.json()) as any;
check('detail has correct guildTag', detailBody1.guildTag === 'CTST');
check('detail starts with no slots', Array.isArray(detailBody1.slots) && detailBody1.slots.length === 0);

// --- fill a slot ---
const fillRes = await fetch(`${base}/api/compositions/${compId}/slots/1/0`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', cookie: memberCookie },
  body: JSON.stringify({
    role: 'Alacrity Heal', profession: 'Guardian', spec: 'Firebrand',
    buildName: 'Heal Alacrity Firebrand', buildDetails: 'Axe/Shield · Staff',
  }),
});
check('filling a slot succeeds', fillRes.status === 200);

// --- non-member cannot fill a slot ---
const fillOutsiderRes = await fetch(`${base}/api/compositions/${compId}/slots/1/1`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', cookie: outsiderCookie },
  body: JSON.stringify({ role: 'Power DPS', profession: 'Warrior' }),
});
check('non-member filling a slot rejected with 403', fillOutsiderRes.status === 403);

const detailRes2 = await fetch(`${base}/api/compositions/${compId}`);
const detailBody2 = (await detailRes2.json()) as any;
check('detail now has exactly 1 slot', detailBody2.slots.length === 1);
check('slot has correct role/profession/spec', detailBody2.slots[0].role === 'Alacrity Heal' && detailBody2.slots[0].profession === 'Guardian' && detailBody2.slots[0].spec === 'Firebrand');
check('slot has correct subgroup/slotIndex', detailBody2.slots[0].subgroup === 1 && detailBody2.slots[0].slotIndex === 0);

// --- re-filling the same slot updates rather than duplicates ---
await fetch(`${base}/api/compositions/${compId}/slots/1/0`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', cookie: memberCookie },
  body: JSON.stringify({ role: 'Power Quickness', profession: 'Warrior', spec: 'Berserker' }),
});
const detailRes3 = await fetch(`${base}/api/compositions/${compId}`);
const detailBody3 = (await detailRes3.json()) as any;
check('re-filling the same slot updates in place (still 1 slot)', detailBody3.slots.length === 1);
check('updated slot reflects new values', detailBody3.slots[0].profession === 'Warrior' && detailBody3.slots[0].role === 'Power Quickness');

// --- rename the composition ---
const renameRes = await fetch(`${base}/api/compositions/${compId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', cookie: memberCookie },
  body: JSON.stringify({ name: 'Renamed Comp' }),
});
check('rename succeeds', renameRes.status === 200);
const detailRes4 = await fetch(`${base}/api/compositions/${compId}`);
const detailBody4 = (await detailRes4.json()) as any;
check('name actually changed', detailBody4.name === 'Renamed Comp');

// --- clear the slot ---
const clearRes = await fetch(`${base}/api/compositions/${compId}/slots/1/0`, {
  method: 'DELETE',
  headers: { cookie: memberCookie },
});
check('clearing a slot succeeds', clearRes.status === 200);
const detailRes5 = await fetch(`${base}/api/compositions/${compId}`);
const detailBody5 = (await detailRes5.json()) as any;
check('slot is gone after clearing', detailBody5.slots.length === 0);

// --- non-member cannot delete the composition ---
const deleteOutsiderRes = await fetch(`${base}/api/compositions/${compId}`, {
  method: 'DELETE',
  headers: { cookie: outsiderCookie },
});
check('non-member delete rejected with 403', deleteOutsiderRes.status === 403);

// --- member deletes the composition ---
const deleteRes = await fetch(`${base}/api/compositions/${compId}`, {
  method: 'DELETE',
  headers: { cookie: memberCookie },
});
check('member delete succeeds', deleteRes.status === 200);
const detailRes6 = await fetch(`${base}/api/compositions/${compId}`);
check('composition is gone after delete (404)', detailRes6.status === 404);

// --- cleanup ---
await prisma.guildMembership.deleteMany({ where: { guildId: guild.id } });
await prisma.session.deleteMany({ where: { userId: { in: [member.id, outsider.id] } } });
await prisma.user.deleteMany({ where: { id: { in: [member.id, outsider.id] } } });
await prisma.guild.delete({ where: { id: guild.id } });

server.close();
await prisma.$disconnect();

const failed = assertions.filter(([, ok]) => !ok).length;
if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed.`);
  process.exit(1);
}
console.log('\nAll assertions passed.');
