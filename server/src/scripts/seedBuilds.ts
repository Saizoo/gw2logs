import '../loadEnv.js';
import { prisma } from '../db.js';
import buildsSeed from '../data/buildsSeed.json' with { type: 'json' };

// One-time (but safe to re-run — upserts by id) seed of the raid-planner
// build catalog into the DB, replacing the static src/data/builds.ts array.
// buildsSeed.json is a snapshot of that array taken when the Build model
// was introduced; the DB is the source of truth from here on, editable via
// the admin panel.
async function main() {
  for (const b of buildsSeed) {
    await prisma.build.upsert({
      where: { id: b.id },
      update: { profession: b.profession, category: b.category, name: b.name, weapons: b.weapons, url: b.url, sortOrder: b.sortOrder },
      create: b,
    });
  }
  console.log(`Seeded ${buildsSeed.length} builds.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
