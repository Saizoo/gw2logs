import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../db.js';
import { uploadToDpsReport, fetchEiJson, withRetry } from '../lib/dpsReport.js';
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
    const uploadResult = await withRetry(() => uploadToDpsReport(file.buffer, file.originalname));

    const alreadyIngested = await prisma.log.findUnique({
      where: { permalink: uploadResult.permalink },
    });
    if (alreadyIngested) {
      await prisma.uploadJob.update({
        where: { id: job.id },
        data: { status: 'success', logId: alreadyIngested.id },
      });
      res.json({ jobId: job.id, logId: alreadyIngested.id, status: 'success', duplicate: true });
      return;
    }

    const rawJson = await withRetry(() => fetchEiJson(uploadResult.permalink), 6, 3000);
    const normalized = normalizeEiJson(rawJson);

    const log = await persistLog({
      permalink: uploadResult.permalink,
      dpsReportId: uploadResult.id,
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
