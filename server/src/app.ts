import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { prisma } from './db.js';
import { attachUser } from './middleware/auth.js';
import { asyncHandler } from './lib/asyncHandler.js';
import { uploadsRouter } from './routes/uploads.js';
import { encountersRouter } from './routes/encounters.js';
import { playersRouter } from './routes/players.js';
import { logsRouter } from './routes/logs.js';
import { searchRouter } from './routes/search.js';
import { compareRouter } from './routes/compare.js';
import { authRouter } from './routes/auth.js';
import { accountRouter } from './routes/account.js';
import { guildsRouter } from './routes/guilds.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json());
  app.use(attachUser);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.get('/api/stats', asyncHandler(async (_req, res) => {
    const [totalLogs, totalPlayers] = await Promise.all([
      prisma.log.count(),
      prisma.player.count(),
    ]);
    res.json({ totalLogs, totalPlayers });
  }));

  app.use('/api/uploads', uploadsRouter);
  app.use('/api/encounters', encountersRouter);
  app.use('/api/players', playersRouter);
  app.use('/api/logs', logsRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/compare', compareRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/guilds', guildsRouter);

  // Last-resort safety net: without this, any error thrown by an async
  // route handler that isn't individually try/caught (e.g. a Prisma error
  // on malformed data) propagates as an unhandled rejection and crashes
  // the whole process, taking down every other in-flight request too.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
