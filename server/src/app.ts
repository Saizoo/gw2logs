import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { prisma } from './db.js';
import { attachUser, requireAdmin, requireAuth } from './middleware/auth.js';
import { asyncHandler } from './lib/asyncHandler.js';
import { uploadsRouter } from './routes/uploads.js';
import { encountersRouter } from './routes/encounters.js';
import { playersRouter } from './routes/players.js';
import { logsRouter } from './routes/logs.js';
import { searchRouter } from './routes/search.js';
import { compareRouter } from './routes/compare.js';
import { authRouter } from './routes/auth.js';
import { accountRouter } from './routes/account.js';
import { homeRouter } from './routes/home.js';
import { compositionsRouter } from './routes/compositions.js';
import { dashboardRouter } from './routes/dashboard.js';
import { groupsRouter } from './routes/groups.js';
import { charactersRouter } from './routes/characters.js';
import { buildsRouter } from './routes/builds.js';
import { adminOverviewRouter } from './routes/admin/overview.js';
import { adminUploadsRouter } from './routes/admin/uploads.js';
import { adminLogsRouter } from './routes/admin/logs.js';
import { adminUsersRouter } from './routes/admin/users.js';
import { adminGroupsRouter } from './routes/admin/groups.js';
import { adminBuildsRouter } from './routes/admin/builds.js';

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
  app.use('/api/home', homeRouter);
  app.use('/api/compositions', compositionsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/groups', groupsRouter);
  app.use('/api/characters', charactersRouter);
  app.use('/api/builds', buildsRouter);

  // Every /api/admin/* route needs both a valid session and isAdmin — gated
  // once here rather than per-file, so a new admin route file can't
  // accidentally forget the check.
  const adminRouter = express.Router();
  adminRouter.use(requireAuth, requireAdmin);
  adminRouter.use('/overview', adminOverviewRouter);
  adminRouter.use('/uploads', adminUploadsRouter);
  adminRouter.use('/logs', adminLogsRouter);
  adminRouter.use('/users', adminUsersRouter);
  adminRouter.use('/groups', adminGroupsRouter);
  adminRouter.use('/builds', adminBuildsRouter);
  app.use('/api/admin', adminRouter);

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
