import { prisma } from '../db.js';
import { decrypt } from '../lib/crypto.js';
import { fetchDpsReportUploads, fetchDpsReportJson } from '../lib/dpsReportImport.js';
import { normalizeEiJson } from '../lib/ingest.js';

// Backfill fields that were added to the log pipeline AFTER a log was first
// imported — equipped weapons, the extended offensive/defensive/support stats,
// and the dps.report permalink — onto already-imported logs, in place.
//
// Normal auto-import dedups by contentHash (`dpsreport:<uploadId>`) and skips
// anything already stored, so re-running the import never repopulates new
// columns on old rows. This re-fetches each log's dps.report JSON and UPDATEs
// the existing LogPlayer/Log rows instead of creating new ones.
//
// Run (from the deploy host):
//   docker compose exec api npm run backfill:logdetails:prod
// It's safe to re-run; it only overwrites the derived fields it manages.

// Be polite to a free community service — space out getJson fetches.
const FETCH_DELAY_MS = 1200;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Re-fetch one log's source JSON and update its players' derived fields.
async function updateLogFromJson(logId: string, permalink: string): Promise<{ players: number; weapons: boolean }> {
  const raw = await fetchDpsReportJson(permalink);
  const norm = normalizeEiJson(raw);
  for (const p of norm.players) {
    await prisma.logPlayer.updateMany({
      where: { logId, characterName: p.characterName },
      data: {
        weapons: p.weapons as any,
        stats: p.stats as any,
        healingOutput: p.healingOutput,
        groupBoons: p.groupBoons as any,
      },
    });
  }
  return { players: norm.players.length, weapons: norm.players.some((p) => p.weapons.length > 0) };
}

async function main() {
  let updated = 0;
  let withWeapons = 0;
  let failed = 0;
  let permalinksSet = 0;

  // Phase 1 — logs that already carry a permalink: fetch + backfill directly.
  const withPermalink = await prisma.log.findMany({
    where: { permalink: { not: null } },
    select: { id: true, permalink: true, fightName: true },
  });
  console.log(`Phase 1: ${withPermalink.length} logs with a stored permalink.`);
  for (const log of withPermalink) {
    try {
      const r = await updateLogFromJson(log.id, log.permalink!);
      updated++;
      if (r.weapons) withWeapons++;
      console.log(`  ok  ${log.fightName}: ${r.players} players, weapons ${r.weapons ? 'YES' : 'no'}`);
    } catch (e) {
      failed++;
      console.warn(`  err ${log.fightName} (${log.id}): ${e instanceof Error ? e.message : String(e)}`);
    }
    await sleep(FETCH_DELAY_MS);
  }

  // Phase 2 — dps.report logs imported before the permalink column existed
  // (permalink is null). Rebuild the uploadId -> permalink map per user via
  // getUploads, set the permalink, then backfill.
  const users = await prisma.user.findMany({
    where: { dpsReportTokenEnc: { not: null } },
    select: { id: true, dpsReportTokenEnc: true },
  });
  for (const u of users) {
    let token: string;
    try {
      token = decrypt(u.dpsReportTokenEnc!);
    } catch {
      continue;
    }
    const orphan = await prisma.log.findMany({
      where: { uploadedBy: u.id, permalink: null, contentHash: { startsWith: 'dpsreport:' } },
      select: { id: true, contentHash: true, fightName: true },
    });
    if (orphan.length === 0) continue;
    const byUploadId = new Map(orphan.map((l) => [l.contentHash.replace(/^dpsreport:/, ''), l]));
    console.log(`Phase 2: user ${u.id} — ${orphan.length} logs missing a permalink.`);

    for (let page = 1; page <= 50 && byUploadId.size > 0; page++) {
      let pageData;
      try {
        pageData = await fetchDpsReportUploads(token, page);
      } catch {
        break;
      }
      if (pageData.uploads.length === 0) break;
      for (const up of pageData.uploads) {
        const log = byUploadId.get(up.id);
        if (!log) continue;
        byUploadId.delete(up.id);
        try {
          await prisma.log.update({ where: { id: log.id }, data: { permalink: up.permalink } });
          permalinksSet++;
          const r = await updateLogFromJson(log.id, up.permalink);
          updated++;
          if (r.weapons) withWeapons++;
          console.log(`  ok  ${log.fightName}: permalink set, ${r.players} players, weapons ${r.weapons ? 'YES' : 'no'}`);
        } catch (e) {
          failed++;
          console.warn(`  err ${log.fightName} (${log.id}): ${e instanceof Error ? e.message : String(e)}`);
        }
        await sleep(FETCH_DELAY_MS);
      }
      if (page >= pageData.pages) break;
    }
  }

  console.log(`Done. Updated ${updated} logs (${withWeapons} with weapon data), permalinks set ${permalinksSet}, failed ${failed}.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
