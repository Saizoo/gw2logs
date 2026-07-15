-- AlterTable: optional group attachment on Log, set at upload time by a
-- group member — see routes/uploads.ts.
ALTER TABLE "Log" ADD COLUMN     "groupId" TEXT;

CREATE INDEX "Log_groupId_idx" ON "Log"("groupId");

ALTER TABLE "Log" ADD CONSTRAINT "Log_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
