import type { NextFunction, Request, Response } from 'express';
import { getSessionUser } from '../lib/session.js';

type SessionUser = Awaited<ReturnType<typeof getSessionUser>>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  getSessionUser(req)
    .then((user) => {
      req.user = user;
      next();
    })
    .catch(next);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not signed in' });
    return;
  }
  // Suspended accounts keep their session rows but can't act — every
  // authenticated route rejects until an admin unsuspends.
  if (req.user.suspendedAt) {
    res.status(403).json({ error: 'This account is suspended. Contact an admin if you think this is a mistake.' });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not signed in' });
    return;
  }
  if (!req.user.isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
