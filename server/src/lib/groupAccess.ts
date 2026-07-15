import { prisma } from '../db.js';

export async function getGroupRole(groupId: string, userId: string): Promise<string | null> {
  const membership = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
  return membership?.role ?? null;
}

export function canManageGroup(role: string | null): boolean {
  return role === 'leader' || role === 'subleader';
}
