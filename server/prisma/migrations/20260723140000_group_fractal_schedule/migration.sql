-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "fractalDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "fractalStartTime" TEXT,
ADD COLUMN     "fractalDurationMins" INTEGER,
ADD COLUMN     "fractalTimezone" TEXT;
