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
import { adminHealthRouter } from './routes/admin/health.js';
import { adminGuildsRouter } from './routes/admin/guilds.js';
import { adminAuditRouter } from './routes/admin/audit.js';
import { adminAnnouncementsRouter } from './routes/admin/announcements.js';
import { adminSettingsRouter } from './routes/admin/settings.js';
import { announcementsRouter } from './routes/announcements.js';
import { notificationsRouter } from './routes/notifications.js';
import { invitesRouter } from './routes/invites.js';
import { tokensRouter } from './routes/tokens.js';
import { remindersRouter } from './routes/reminders.js';

// Origins allowed to make credentialed cross-origin calls. Pinned rather than
// reflecting any origin (the old `origin: true`): with credentials enabled, a
// reflect-any policy means the day the session cookie loses SameSite=Lax, any
// site could ride a logged-in user's cookies. Configure the deployed origin(s)
// via CORS_ALLOWED_ORIGINS (comma-separated); dev origins are allowed unless
// running in production.
function allowedOrigins(): string[] {
  const configured = (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
  // Derive the public origin from the OAuth redirect if not spelled out, so a
  // standard deploy needs no extra env var.
  if (configured.length === 0 && process.env.DISCORD_REDIRECT_URI) {
    try {
      configured.push(new URL(process.env.DISCORD_REDIRECT_URI).origin);
    } catch {
      /* ignore a malformed redirect URI */
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    configured.push('http://localhost:5173', 'http://localhost:5180', 'http://127.0.0.1:5180');
  }
  return configured;
}

// Baseline security headers on every response the API emits. The static SPA
// gets the same set from nginx (deploy/nginx.conf.template); setting them here
// too means the API is covered even if it's ever exposed without that proxy.
function securityHeaders(): express.RequestHandler {
  return (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    next();
  };
}

export function createApp() {
  const app = express();

  // Behind nginx, so req.ip must come from the first X-Forwarded-For hop —
  // otherwise every request looks like 127.0.0.1 in logs and any per-IP logic.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  const origins = allowedOrigins();
  app.use(
    cors({
      credentials: true,
      origin(origin, cb) {
        // Same-origin / server-to-server requests send no Origin header — allow
        // them. A browser cross-origin request is only allowed from the pinned
        // list.
        if (!origin || origins.includes(origin)) return cb(null, true);
        cb(new Error('Not allowed by CORS'));
      },
    }),
  );
  app.use(securityHeaders());
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
  app.use('/api/announcements', announcementsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/invites', invitesRouter);
  app.use('/api/tokens', tokensRouter);
  app.use('/api/reminders', remindersRouter);

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
  adminRouter.use('/health', adminHealthRouter);
  adminRouter.use('/guilds', adminGuildsRouter);
  adminRouter.use('/audit', adminAuditRouter);
  adminRouter.use('/announcements', adminAnnouncementsRouter);
  adminRouter.use('/settings', adminSettingsRouter);
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
