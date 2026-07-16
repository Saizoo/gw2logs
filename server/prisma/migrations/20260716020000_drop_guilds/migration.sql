-- DropTable: the Guild feature is removed. GW2 accounts can rep multiple
-- guilds, and there was no way to know which one was actually represented
-- at the moment a given log was recorded, so "your synced guilds" was
-- displaying every guild on the account rather than anything log-accurate.
DROP TABLE "GuildMembership";
DROP TABLE "Guild";
