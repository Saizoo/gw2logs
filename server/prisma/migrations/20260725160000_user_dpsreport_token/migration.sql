-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dpsReportTokenEnc" TEXT,
ADD COLUMN     "dpsReportLinkedAt" TIMESTAMP(3),
ADD COLUMN     "dpsReportLastImportAt" TIMESTAMP(3);
