import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { prisma } from '../db.js';

export const SESSION_COOKIE_NAME = 'gw2logs_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const isProduction = process.env.NODE_ENV === 'production';

// Only the hash of the session token is stored. The raw token lives solely in
// the user's cookie, so a leaked database backup can't be replayed as a live
// session — an attacker would still need to reverse SHA-256. (The lookup stays
// a single indexed primary-key hit, since the hash is what we store as the id.)
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  await prisma.session.create({
    data: { id: hashToken(token), userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  return token;
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
}

export async function getSessionUser(req: Request) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { id: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function destroySession(req: Request): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (token) await prisma.session.deleteMany({ where: { id: hashToken(token) } });
}
