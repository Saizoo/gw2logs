import '../loadEnv.js';
import { normalizeEiJson } from '../lib/ingest.js';
import { persistLog } from '../lib/persist.js';
import { prisma } from '../db.js';
import { sampleEiJson } from './fixtures/sampleEiJson.js';

async function main() {
  const normalized = normalizeEiJson(sampleEiJson);

  console.log('--- normalized ---');
  console.log(JSON.stringify(normalized, null, 2));

  const log = await persistLog({
    contentHash: `test-hash-${Date.now()}`,
    sourceFileName: 'fixture.zevtc',
    normalized,
  });

  const reloaded = await prisma.log.findUnique({
    where: { id: log.id },
    include: { players: true, mechanicEvents: true, deathEvents: true },
  });

  console.log('--- reloaded from db ---');
  console.log(JSON.stringify(reloaded, null, 2));

  const assertions: [string, boolean][] = [
    ['fightName is Dhuum', reloaded?.fightName === 'Dhuum'],
    ['isCm is true', reloaded?.isCm === true],
    ['wing enriched from bossMeta', reloaded?.wing === 'Wing 4 — Bastion of the Penitent'],
    ['squadDps is sum of all three players', reloaded?.squadDps === 26800 + 21200 + 8100],
    ['3 players persisted', reloaded?.players.length === 3],
    ['Sai Zu profession resolved to Mesmer', reloaded?.players.find((p) => p.characterName === 'Sai Zu')?.profession === 'Mesmer'],
    ['Sai Zu quickness uptime is 95', (reloaded?.players.find((p) => p.characterName === 'Sai Zu')?.boons as any)?.quickness === 95],
    ['Sai Zu (alac gen, no healing data) classified boon_dps', reloaded?.players.find((p) => p.characterName === 'Sai Zu')?.squadRole === 'boon_dps'],
    ['Moira (quick gen, high healing) classified boon_heal', reloaded?.players.find((p) => p.characterName === 'Moira Ashfall')?.squadRole === 'boon_heal'],
    [
      'Torvald (alac gen, near-zero measured healing but a healer gear score) classified boon_heal',
      reloaded?.players.find((p) => p.characterName === 'Torvald Rune')?.squadRole === 'boon_heal',
    ],
    ['2 mechanic events persisted', reloaded?.mechanicEvents.length === 2],
    ['Shackled mechanic carries severity Sev4', reloaded?.mechanicEvents.find((e) => e.name === 'Shackled')?.severity === 'Sev4'],
    ['1 death event persisted', reloaded?.deathEvents.length === 1],
    ['Moira death event has correct actor/time', reloaded?.deathEvents[0]?.actor === 'Moira Ashfall' && reloaded?.deathEvents[0]?.timeMs === 120500],
    ['Death killedBy resolves to the last ToKill hit\'s Src', reloaded?.deathEvents[0]?.killedBy === 'Dhuum'],
  ];

  let failed = 0;
  for (const [label, ok] of assertions) {
    console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`);
    if (!ok) failed++;
  }

  await prisma.log.delete({ where: { id: log.id } });
  await prisma.player.deleteMany({ where: { account: { in: ['SaiZu.1234', 'Moira.5678', 'Torvald.4321'] } } });

  if (failed > 0) {
    console.error(`\n${failed} assertion(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll assertions passed.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
