-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "guildId" TEXT;

-- AlterTable
ALTER TABLE "GroupMember" ADD COLUMN     "guildRank" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "displayedGuildId" TEXT;

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncUserId" TEXT,
    "lastRankSyncAt" TIMESTAMP(3),

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Group_guildId_key" ON "Group"("guildId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_displayedGuildId_fkey" FOREIGN KEY ("displayedGuildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

