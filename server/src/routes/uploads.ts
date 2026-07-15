import { createHash } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../db.js';
import { parseWithEliteInsights } from '../lib/eliteInsights.js';
import { normalizeEiJson } from '../lib/ingest.js';
import { persistLog } from '../lib/persist.js';
import { getGroupRole } from '../lib/groupAccess.js';

// Raw .evtc/.zevtc uploads from big raid squads run 100-160MB — this needs
// real headroom above that, not just above today's average. Must stay in
// lockstep with nginx's client_max_body_size (deploy/nginx.conf.template),
// which rejects oversized request bodies before they ever reach this limit.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

export const uploadsRouter = Router();

uploadsRouter.post('/', upload.single('file'), async (req, res) => {
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

    res.json({ jobId: job.id, logId: log.id, status: 'success' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown ingestion error';
    await prisma.uploadJob.update({
      where: { id: job.id },
      data: { status: 'failed', errorMessage: message },
    });
    res.status(502).json({ jobId: job.id, status: 'failed', error: message });
  }
});

uploadsRouter.get('/', async (_req, res) => {
  const jobs = await prisma.uploadJob.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  res.json(jobs);
});
