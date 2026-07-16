-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "discordWebhookEnc" TEXT,
ADD COLUMN     "raidReminderMins" INTEGER NOT NULL DEFAULT 60;

-- CreateTable
CREATE TABLE "RaidReminderLog" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaidReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RaidReminderLog_groupId_date_key" ON "RaidReminderLog"("groupId", "date");

-- AddForeignKey
ALTER TABLE "RaidReminderLog" ADD CONSTRAINT "RaidReminderLog_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
