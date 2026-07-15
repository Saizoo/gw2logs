import { createHash } from 'node:crypto';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../db.js';
import { parseWithEliteInsights } from '../lib/eliteInsights.js';
import { normalizeEiJson } from '../lib/ingest.js';
import { persistLog } from '../lib/persist.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 64 * 1024 * 1024 } });

export const uploadsRouter = Router();

uploadsRouter.post('/', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No file uploaded (expected multipart field "file")' });
    return;
  }

  const job = await prisma.uploadJob.create({
    data: { status: 'parsing', fileName: file.originalname, fileSizeByte: file.size },
  });

  try {
    const contentHash = createHash('sha256').update(file.buffer).digest('hex');

    const alreadyIngested = await prisma.log.findUnique({ where: { contentHash } });
    if (alreadyIngested) {
      await prisma.uploadJob.update({
        where: { id: job.id },
        data: { status: 'success', logId: alreadyIngested.id },
      });
      res.json({ jobId: job.id, logId: alreadyIngested.id, status: 'success', duplicate: true });
      return;
    }

    const { json: rawJson } = await parseWithEliteInsights(file.buffer, file.originalname);
    const normalized = normalizeEiJson(rawJson);

    const log = await persistLog({
      contentHash,
      sourceFileName: file.originalname,
      rawJson,
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
