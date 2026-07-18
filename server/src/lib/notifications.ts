import { prisma } from '../db.js';

export interface NotifyInput {
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  groupId?: string | null;
}

// Fan a notification out to a set of users (one row each). Silently no-ops on
// an empty recipient list so callers don't need to guard.
export async function notifyUsers(userIds: string[], n: NotifyInput): Promise<void> {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return;
  await prisma.notification.createMany({
    data: unique.map((userId) => ({
      userId,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      link: n.link ?? null,
      groupId: n.groupId ?? null,
    })),
  });
}

// Notify every member of a group, optionally skipping the person who caused
// the event (the leader who edited the schedule shouldn't ping themselves).
export async function notifyGroup(
  groupId: string,
  n: Omit<NotifyInput, 'groupId'>,
  exceptUserId?: string,
): Promise<void> {
  const members = await prisma.groupMember.findMany({ where: { groupId }, select: { userId: true } });
  await notifyUsers(
    members.map((m) => m.userId).filter((id) => id !== exceptUserId),
    { ...n, groupId },
  );
}
