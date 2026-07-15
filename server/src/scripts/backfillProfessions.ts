// One-time fix for LogPlayer rows persisted before SPEC_TO_PROFESSION knew
// about each profession's 4th elite specialization (Luminary, Conduit,
// Paragon, Amalgam, Galeshot, Antiquary, Evoker, Troubadour, Ritualist).
// Those rows got `profession` set to the elite spec name itself as a
// fallback instead of the correct base profession. Safe to re-run — only
// touches rows where profession doesn't already match.
import '../loadEnv.js';
import { prisma } from '../db.js';
import { SPEC_TO_PROFESSION } from '../lib/ingest.js';

async function main() {
  let totalUpdated = 0;
  for (const [spec, profession] of Object.entries(SPEC_TO_PROFESSION)) {
    const result = await prisma.logPlayer.updateMany({
      where: { spec, profession: { not: profession } },
      data: { profession },
    });
    if (result.count > 0) {
      console.log(`${spec} -> ${profession}: fixed ${result.count} row(s)`);
      totalUpdated += result.count;
    }
  }
  console.log(`\nDone. ${totalUpdated} row(s) corrected.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
