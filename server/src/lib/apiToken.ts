import { createHash, randomBytes } from 'node:crypto';
import type { Request } from 'express';
import { prisma } from '../db.js';

// Personal access tokens for non-browser clients (the desktop / Nexus addon).
// Same storage discipline as sessions: only the SHA-256 is persisted, the raw
// value is returned to the user once at creation. The `gw2logs_pat_` prefix
// makes a leaked token recognisable in logs/secret scanners.
const TOKEN_PREFIX = 'gw2logs_pat_';
const LAST_USED_THROTTLE_MS = 60 * 60 * 1000; // update lastUsedAt at most hourly

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createApiToken(userId: string, name: string): Promise<{ id: string; token: string }> {
  const token = TOKEN_PREFIX + randomBytes(24).toString('hex');
  const row = await prisma.apiToken.create({ data: { tokenHash: hashToken(token), userId, name } });
  return { id: row.id, token };
}

// Resolve a raw bearer token to its owning user, or null. Bumps lastUsedAt at
// most once an hour so an active addon doesn't write on every request.
export async function resolveApiToken(raw: string) {
  if (!raw.startsWith(TOKEN_PREFIX)) return null;
  const row = await prisma.apiToken.findUnique({ where: { tokenHash: hashToken(raw) }, include: { user: true } });
  if (!row) return null;
  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > LAST_USED_THROTTLE_MS) {
    void prisma.apiToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }
  return row.user;
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}
