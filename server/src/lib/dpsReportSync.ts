import { prisma } from '../db.js';
import { decrypt } from './crypto.js';
import { fetchDpsReportUploads, fetchDpsReportJson } from './dpsReportImport.js';
import { normalizeEiJson } from './ingest.js';
import { persistLog } from './persist.js';

// Auto-import: pull the logs a user's linked dps.report token has uploaded into
// gw2logs. dps.report is itself an Elite Insights instance, so getJson returns
// the same JSON shape a direct upload produces — normalizeEiJson (health/phases
// and all) applies identically. Dedup is by the same contentHash column direct
// uploads use, keyed on the dps.report upload id, so re-runs never double-import.

export interface DpsReportImportResult {
  imported: number;
  failed: number;
  scanned: number;
  newestUploadTime: number | null;
}

// Import a token's uploads. `maxPages` bounds the walk (100 uploads/page);
// `stopWhenSeen` early-exits the moment it meets an upload already stored — the
// getUploads feed is newest-first, so for the incremental poll that means "stop
// as soon as we reach logs we've already got" instead of re-walking everything.
export async function importDpsReportForUser(
  userId: string,
  token: string,
  opts: { maxPages: number; stopWhenSeen: boolean },
): Promise<DpsReportImportResult> {
  let imported = 0;
  let failed = 0;
  let scanned = 0;
  let newest: number | null = null;

  for (let page = 1; page <= opts.maxPages; page++) {
    let pageData;
    try {
      pageData = await fetchDpsReportUploads(token, page);
    } catch {
      break;
    }
    if (pageData.uploads.length === 0) break;

    let hitSeen = false;
    for (const upload of pageData.uploads) {
      scanned++;
      if (newest === null || upload.uploadTime > newest) newest = upload.uploadTime;

      const contentHash = `dpsreport:${upload.id}`;
      const existing = await prisma.log.findUnique({ where: { contentHash }, select: { id: true } });
      if (existing) {
        if (opts.stopWhenSeen) {
          hitSeen = true;
          break;
        }
        continue;
      }

      if (upload.encounter?.error) {
        failed++;
        continue;
      }

      try {
        const rawJson = await fetchDpsReportJson(upload.permalink);
        const normalized = normalizeEiJson(rawJson);
        await persistLog({ contentHash, sourceFileName: `dps.report:${upload.id}`, uploadedBy: userId, normalized });
        imported++;
      } catch {
        failed++;
      }
    }

    if (hitSeen) break;
    if (page >= pageData.pages) break;
  }

  // Advance the watermark to the newest upload we saw so the status readout and
  // the early-exit stay meaningful. uploadTime is epoch seconds.
  if (newest !== null) {
    await prisma.user.update({ where: { id: userId }, data: { dpsReportLastImportAt: new Date(newest * 1000) } });
  }

  return { imported, failed, scanned, newestUploadTime: newest };
}

const SYNC_INTERVAL_MS = 15 * 60_000;
// Guard against a slow tick overlapping the next one — a backlog of getJson
// fetches must never pile ticks on top of each other.
let syncing = false;

export async function tickDpsReportSync(): Promise<void> {
  if (syncing) return;
  syncing = true;
  try {
    const users = await prisma.user.findMany({
      where: { dpsReportTokenEnc: { not: null }, suspendedAt: null },
      select: { id: true, dpsReportTokenEnc: true },
    });
    for (const u of users) {
      let token: string;
      try {
        token = decrypt(u.dpsReportTokenEnc!);
      } catch {
        continue;
      }
      try {
        // Incremental: only the newest page, stopping at the first already-seen
        // upload. A 15-minute window never accumulates more than a handful.
        await importDpsReportForUser(u.id, token, { maxPages: 1, stopWhenSeen: true });
      } catch (err) {
        console.error('dps.report sync failed for user', u.id, err);
      }
      // Be polite to a free community service — space work out between users.
      await new Promise((r) => setTimeout(r, 1500));
    }
  } finally {
    syncing = false;
  }
}

export function startDpsReportSync(): void {
  // A short delay after boot lets the app settle before the first pull, then
  // every 15 minutes. Both unref()'d so they never hold the process open.
  setTimeout(() => {
    tickDpsReportSync().catch((e) => console.error('dps.report sync tick failed:', e));
  }, 30_000).unref();
  setInterval(() => {
    tickDpsReportSync().catch((e) => console.error('dps.report sync tick failed:', e));
  }, SYNC_INTERVAL_MS).unref();
  console.log('dps.report auto-import scheduler started (15m tick)');
}
