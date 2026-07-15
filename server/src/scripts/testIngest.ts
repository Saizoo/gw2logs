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
    rawJson: sampleEiJson,
    normalized,
  });

  const reloaded = await prisma.log.findUnique({
    where: { id: log.id },
    include: { players: true, mechanicEvents: true },
  });

  console.log('--- reloaded from db ---');
  console.log(JSON.stringify(reloaded, null, 2));

  const assertions: [string, boolean][] = [
    ['fightName is Dhuum', reloaded?.fightName === 'Dhuum'],
    ['isCm is true', reloaded?.isCm === true],
    ['wing enriched from bossMeta', reloaded?.wing === 'Wing 4 — Bastion of the Penitent'],
    ['squadDps is sum of both players', reloaded?.squadDps === 26800 + 21200],
    ['2 players persisted', reloaded?.players.length === 2],
    ['Sai Zu profession resolved to Mesmer', reloaded?.players.find((p) => p.characterName === 'Sai Zu')?.profession === 'Mesmer'],
    ['Sai Zu quickness uptime is 95', (reloaded?.players.find((p) => p.characterName === 'Sai Zu')?.boons as any)?.quickness === 95],
    ['Sai Zu (alac gen, no healing data) classified boon_dps', reloaded?.players.find((p) => p.characterName === 'Sai Zu')?.squadRole === 'boon_dps'],
    ['Moira (quick gen, high healing) classified boon_heal', reloaded?.players.find((p) => p.characterName === 'Moira Ashfall')?.squadRole === 'boon_heal'],
    ['2 mechanic events persisted', reloaded?.mechanicEvents.length === 2],
  ];

  let failed = 0;
  for (const [label, ok] of assertions) {
    console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}`);
    if (!ok) failed++;
  }

  await prisma.log.delete({ where: { id: log.id } });
  await prisma.player.deleteMany({ where: { account: { in: ['SaiZu.1234', 'Moira.5678'] } } });

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
