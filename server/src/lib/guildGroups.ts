import { prisma } from '../db.js';
import type { Gw2GuildMember, Gw2GuildRank } from './gw2Api.js';

// ---------------------------------------------------------------------------
// Guild groups: every displayed guild owns exactly one auto-created Group.
// Membership is driven by who displays the guild; roles can additionally be
// synced from in-game ranks (see mapRankToRole).
// ---------------------------------------------------------------------------

export async function ensureGuildGroup(guild: { id: string; name: string; tag: string }, firstUserId: string) {
  const existing = await prisma.group.findUnique({ where: { guildId: guild.id } });
  if (existing) return existing;
  // First displayer bootstraps the group and holds leadership until a rank
  // sync (or the in-game leader displaying the guild) reassigns it.
  return prisma.group.create({
    data: {
      name: `[${guild.tag}] ${guild.name}`,
      leaderId: firstUserId,
      guildId: guild.id,
      members: { create: { userId: firstUserId, role: 'leader' } },
    },
  });
}

export async function addToGuildGroup(groupId: string, userId: string): Promise<void> {
  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId, userId } },
    update: {},
    create: { groupId, userId, role: 'member' },
  });
}

// Removing someone who happens to lead the group hands leadership to the
// best remaining member (subleader first, then longest-standing member);
// an emptied guild group is deleted outright — it regenerates the moment
// anyone displays the guild again.
export async function removeFromGuildGroup(groupId: string, userId: string): Promise<void> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { leaderId: true, members: { select: { userId: true, role: true, joinedAt: true }, orderBy: { joinedAt: 'asc' } } },
  });
  if (!group || !group.members.some((m) => m.userId === userId)) return;

  const remaining = group.members.filter((m) => m.userId !== userId);
  if (remaining.length === 0) {
    await prisma.group.delete({ where: { id: groupId } });
    return;
  }

  await prisma.groupMember.deleteMany({ where: { groupId, userId } });
  if (group.leaderId === userId) {
    const successor = remaining.find((m) => m.role === 'subleader') ?? remaining[0];
    await prisma.$transaction([
      prisma.group.update({ where: { id: groupId }, data: { leaderId: successor.userId } }),
      prisma.groupMember.update({
        where: { groupId_userId: { groupId, userId: successor.userId } },
        data: { role: 'leader' },
      }),
    ]);
  }
}

// In-game rank → site role. Rank order 1 is the guild leader's rank;
// order 2 (typically "Officer" or similar) maps to subleader; everything
// below is a plain member. Pure function so it's testable without the API.
export function mapRankToRole(rankName: string, ranks: Gw2GuildRank[]): 'leader' | 'subleader' | 'member' {
  const rank = ranks.find((r) => r.id === rankName);
  if (!rank) return 'member';
  if (rank.order === 1) return 'leader';
  if (rank.order === 2) return 'subleader';
  return 'member';
}

export interface RankSyncResult {
  matched: number;
  updated: number;
  leaderAccount: string | null;
}

// Applies in-game ranks to a guild group's existing memberships. Only site
// users already in the group are touched — displaying the guild is what
// adds people; the sync assigns roles and stamps rank names. At most one
// leader: the first order-1 rank holder wins, later ones become subleader.
export async function applyGuildRanks(
  groupId: string,
  members: Gw2GuildMember[],
  ranks: Gw2GuildRank[],
): Promise<RankSyncResult> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      leaderId: true,
      members: { select: { userId: true, user: { select: { gw2AccountName: true } } } },
    },
  });
  if (!group) return { matched: 0, updated: 0, leaderAccount: null };

  // Two-phase: compute every member's target role first, then apply — a
  // single pass that demotes the old leader mid-loop can stomp a
  // rank-derived role it already wrote for that same user.
  const rankByAccount = new Map(members.map((m) => [m.name.toLowerCase(), m.rank]));
  const desired = new Map<string, { role: 'leader' | 'subleader' | 'member'; rankName: string }>();
  let leaderUserId: string | null = null;
  let leaderAccount: string | null = null;

  for (const m of group.members) {
    const account = m.user.gw2AccountName;
    if (!account) continue;
    const rankName = rankByAccount.get(account.toLowerCase());
    if (!rankName) continue;
    let role = mapRankToRole(rankName, ranks);
    if (role === 'leader') {
      if (leaderUserId) role = 'subleader';
      else {
        leaderUserId = m.userId;
        leaderAccount = account;
      }
    }
    desired.set(m.userId, { role, rankName });
  }

  if (leaderUserId && leaderUserId !== group.leaderId) {
    // Old leader loses the crown; if the guild roster didn't assign them
    // anything (unlinked/left guild), they fall back to plain member.
    if (!desired.has(group.leaderId)) {
      await prisma.groupMember.updateMany({ where: { groupId, userId: group.leaderId }, data: { role: 'member' } });
    }
    await prisma.group.update({ where: { id: groupId }, data: { leaderId: leaderUserId } });
  }

  let updated = 0;
  for (const [userId, d] of desired) {
    await prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId } },
      data: { role: d.role, guildRank: d.rankName },
    });
    updated++;
  }

  return { matched: desired.size, updated, leaderAccount };
}
