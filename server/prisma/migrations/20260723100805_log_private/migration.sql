-- AlterTable
ALTER TABLE "Log" ADD COLUMN     "private" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Log_private_idx" ON "Log"("private");
