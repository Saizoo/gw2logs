-- AlterTable
ALTER TABLE "Log" ADD COLUMN     "permalink" TEXT;

-- AlterTable
ALTER TABLE "LogPlayer" ADD COLUMN     "stats" JSONB;
