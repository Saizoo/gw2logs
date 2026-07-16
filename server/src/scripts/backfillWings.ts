// One-off backfill: re-derive Log.wing from the corrected BOSS_WING map.
// The original map shipped with mis-numbered wings (e.g. Dhuum tagged
// "Wing 4 — Bastion of the Penitent"), and wing is stamped at ingest, so
// old rows keep whatever label was current when they were uploaded.
// Safe to re-run; only touches rows whose label differs. Run with:
//   npx tsx src/scripts/backfillWings.ts
import { prisma } from '../db.js';
import { resolveWing } from '../lib/bossMeta.js';

async function main() {
  const logs = await prisma.log.findMany({
    select: { id: true, fightName: true, wing: true, _count: { select: { players: true } } },
  });
  let updated = 0;
  for (const log of logs) {
    const wing = resolveWing(log.fightName, log._count.players);
    if (wing !== log.wing) {
      await prisma.log.update({ where: { id: log.id }, data: { wing } });
      updated += 1;
    }
  }
  console.log(`checked ${logs.length} logs, updated ${updated}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
