// One-time backfill: rewrite existing Log.fightName values to their
// canonical spelling and recompute the wing label. Needed because logs
// uploaded before fight-name canonicalization landed still carry Elite
// Insights' raw names ("Cairn CM", "Aetherblade Hideout", "Siax the
// Unclean"), which the category/wing/art lookups don't recognize.
//
// Safe to run repeatedly — rows already canonical are skipped. Run with:
//   npx tsx scripts/backfill-fightnames.ts
// against the same DATABASE_URL the server uses.

import { prisma } from '../src/db.js';
import { canonicalFightName, resolveWing } from '../src/lib/bossMeta.js';

async function main() {
  const logs = await prisma.log.findMany({
    select: { id: true, fightName: true, wing: true, _count: { select: { players: true } } },
  });
  console.log(`Scanning ${logs.length} logs…`);

  let updated = 0;
  for (const log of logs) {
    const canonical = canonicalFightName(log.fightName);
    const wing = resolveWing(canonical, log._count.players);
    if (canonical === log.fightName && wing === log.wing) continue;
    await prisma.log.update({
      where: { id: log.id },
      data: { fightName: canonical, wing },
    });
    updated += 1;
    if (canonical !== log.fightName) console.log(`  ${log.fightName}  →  ${canonical}`);
  }

  console.log(`Done. Updated ${updated} log${updated === 1 ? '' : 's'}.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
