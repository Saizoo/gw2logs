import { prisma } from '../db.js';

// Append-only record of privileged admin actions. Fire-and-forget by
// design: an audit-write failure logs loudly but never blocks or fails
// the action itself.
export function audit(
  adminId: string,
  action: string,
  targetType: string,
  targetId?: string | null,
  detail?: Record<string, unknown>,
): void {
  prisma.adminAudit
    .create({ data: { adminId, action, targetType, targetId: targetId ?? null, detail: detail as never } })
    .catch((err) => console.error('audit write failed:', action, err instanceof Error ? err.message : err));
}
