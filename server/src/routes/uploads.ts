import { createHash } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../db.js';
import { parseWithEliteInsights, ParseQueueFullError } from '../lib/eliteInsights.js';
import { normalizeEiJson } from '../lib/ingest.js';
import { persistLog } from '../lib/persist.js';
import { getGroupRole } from '../lib/groupAccess.js';
import { getConfigBool } from '../lib/appConfig.js';
import { postGroupWebhookEvent, logUploadedEmbed } from '../lib/raidReminders.js';

// Raw .evtc/.zevtc uploads from big raid squads run 100-160MB — this needs
// real headroom above that, not just above today's average. Must stay in
// lockstep with nginx's client_max_body_size (deploy/nginx.conf.template),
// which rejects oversized request bodies before they ever reach this limit.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

export const uploadsRouter = Router();

// Fire the "new log uploaded" webhook for a log now attached to a group.
// Fully self-contained and fire-and-forget: it fetches the group name, the
// uploader's display name, and the log's players (for the top-DPS podium),
// then hands off to postGroupWebhookEvent, which itself no-ops unless the
// group has a webhook configured with the 'log' event enabled.
async function postLogUploadedWebhook(logId: string, groupId: string): Promise<void> {
  try {
    const [group, log] = await Promise.all([
      prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
      prisma.log.findUnique({
        where: { id: logId },
        select: {
          id: true,
          fightName: true,
          isCm: true,
          success: true,
          durationMs: true,
          squadDps: true,
          uploader: { select: { gw2AccountName: true, discordUsername: true } },
          players: {
            orderBy: { totalDps: 'desc' },
            take: 10,
            select: {
              characterName: true,
              profession: true,
              spec: true,
              totalDps: true,
              player: { select: { account: true } },
            },
          },
        },
      }),
    ]);
    if (!group || !log) return;
    await postGroupWebhookEvent(
      groupId,
      'log',
      logUploadedEmbed(groupId, group.name, {
        id: log.id,
        fightName: log.fightName,
        isCm: log.isCm,
        success: log.success,
        durationMs: log.durationMs,
        squadDps: log.squadDps,
        uploaderName: log.uploader?.gw2AccountName ?? log.uploader?.discordUsername ?? null,
        players: log.players.map((p) => ({
          account: p.player.account,
          characterName: p.characterName,
          profession: p.profession,
          spec: p.spec,
          totalDps: p.totalDps ?? 0,
        })),
      }),
    );
  } catch (err) {
    console.error(`log-uploaded webhook failed for log ${logId}:`, err instanceof Error ? err.message : err);
  }
}

uploadsRouter.post('/', upload.single('file'), async (req, res) => {
  // Maintenance switch, flipped from the admin Settings tab. Checked before
  // anything else so a paused site never buffers a 160MB body into a parse
  // it won't run.
  if (await getConfigBool('uploadsPaused')) {
    res.status(503).json({ error: 'Uploads are paused for maintenance — check the site banner for details and try again later.' });
    return;
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No file uploaded (expected multipart field "file")' });
    return;
  }

  // Attaching to a group is opt-in and requires actually being a member of
  // it — not gated to leader/subleader, any member can bring a log in.
  // Rejected outright rather than silently dropped: the frontend only ever
  // offers groups from the signed-in user's own membership list, so a
  // mismatch here means something bypassed that UI.
  const requestedGroupId = typeof req.body?.groupId === 'string' && req.body.groupId ? req.body.groupId : undefined;
  let groupId: string | undefined;
  if (requestedGroupId) {
    if (!req.user) {
      res.status(401).json({ error: 'Sign in to attach an upload to a group' });
      return;
    }
    const role = await getGroupRole(requestedGroupId, req.user.id);
    if (!role) {
      res.status(403).json({ error: 'You must be a member of that group to attach a log to it' });
      return;
    }
    groupId = requestedGroupId;
  }

  const job = await prisma.uploadJob.create({
    data: { status: 'parsing', fileName: file.originalname, fileSizeByte: file.size },
  });

  try {
    const contentHash = createHash('sha256').update(file.buffer).digest('hex');

    const alreadyIngested = await prisma.log.findUnique({ where: { contentHash } });
    if (alreadyIngested) {
      // Same bytes uploaded again — no re-parse, but if this uploader is
      // attaching to a group and nobody's claimed that slot yet, still
      // honor it rather than silently no-op'ing (the log itself doesn't
      // change, only who it's attributed/attached to).
      if (groupId && !alreadyIngested.groupId) {
        await prisma.log.update({ where: { id: alreadyIngested.id }, data: { groupId } });
        // Newly landed in this group (re-upload that claimed the slot) — the
        // channel hasn't seen it yet, so announce it just like a fresh log.
        void postLogUploadedWebhook(alreadyIngested.id, groupId);
      }
      await prisma.uploadJob.update({
        where: { id: job.id },
        data: { status: 'success', logId: alreadyIngested.id },
      });
      res.json({ jobId: job.id, logId: alreadyIngested.id, status: 'success', duplicate: true });
      return;
    }

    // The parsed JSON only lives in this local variable — normalizeEiJson()
    // extracts everything the app needs into `normalized`, and the raw dump
    // itself is never persisted (see the comment above Log.rawJson's old
    // spot in schema.prisma for why).
    const { json: rawJson } = await parseWithEliteInsights(file.buffer, file.originalname);
    const normalized = normalizeEiJson(rawJson);

    const log = await persistLog({
      contentHash,
      sourceFileName: file.originalname,
      uploadedBy: req.user?.id,
      groupId,
      normalized,
    });

    await prisma.uploadJob.update({
      where: { id: job.id },
      data: { status: 'success', logId: log.id },
    });

    // Fire-and-forget the "new log uploaded" Discord post — never let a
    // webhook hiccup delay or fail the upload response.
    if (groupId) void postLogUploadedWebhook(log.id, groupId);

    res.json({ jobId: job.id, logId: log.id, status: 'success' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown ingestion error';
    await prisma.uploadJob.update({
      where: { id: job.id },
      data: { status: 'failed', errorMessage: message },
    });
    // Queue saturation is a transient "try again", not a parse failure — 503
    // (with the job marked failed so it doesn't dangle) tells the client to
    // retry rather than treating the log as broken.
    const status = err instanceof ParseQueueFullError ? 503 : 502;
    res.status(status).json({ jobId: job.id, status: 'failed', error: message });
  }
});

uploadsRouter.get('/', async (_req, res) => {
  const jobs = await prisma.uploadJob.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  res.json(jobs);
});
