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

export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  req.user = await getSessionUser(req);
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not signed in' });
    return;
  }
  next();
}
