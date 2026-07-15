import { prisma } from '../db.js';
import { fetchGuild, type Gw2Account } from './gw2Api.js';

export async function syncGuildsForUser(userId: string, account: Gw2Account) {
  const guildIds = account.guilds ?? [];
  const leaderIds = new Set(account.guild_leader ?? []);

  const guilds = [];
  for (const gw2GuildId of guildIds) {
    const info = await fetchGuild(gw2GuildId);
    const guild = await prisma.guild.upsert({
      where: { gw2GuildId },
      update: { name: info.name, tag: info.tag, lastSyncedAt: new Date() },
      create: { gw2GuildId, name: info.name, tag: info.tag },
    });
    await prisma.guildMembership.upsert({
      where: { userId_guildId: { userId, guildId: guild.id } },
      update: { isLeader: leaderIds.has(gw2GuildId) },
      create: { userId, guildId: guild.id, isLeader: leaderIds.has(gw2GuildId) },
    });
    guilds.push(guild);
  }

  // Drop memberships for guilds no longer in the account's current list
  // (left the guild, or the key's guilds scope changed).
  await prisma.guildMembership.deleteMany({
    where: { userId, guildId: { notIn: guilds.map((g) => g.id) } },
  });

  return guilds;
}
