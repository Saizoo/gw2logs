-- Replace dps.report's permalink/dpsReportId (no longer applicable now that
-- parsing runs locally via a self-hosted Elite Insights) with a content hash
-- of the uploaded file, used for upload dedup instead.

-- DropIndex
DROP INDEX "Log_permalink_key";

-- DropIndex
DROP INDEX "Log_dpsReportId_key";

-- AlterTable
ALTER TABLE "Log" DROP COLUMN "permalink",
                   DROP COLUMN "dpsReportId",
                   ADD COLUMN "contentHash" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Log_contentHash_key" ON "Log"("contentHash");

-- AlterTable
ALTER TABLE "Log" ALTER COLUMN "contentHash" DROP DEFAULT;
