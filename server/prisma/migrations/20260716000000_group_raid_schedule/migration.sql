-- AlterTable: recurring raid-schedule fields on Group (days/start
-- time/duration/timezone), settable by a leader/subleader and surfaced on
-- group search so prospective members can filter by day.
ALTER TABLE "Group" ADD COLUMN     "raidDays" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Group" ADD COLUMN     "raidStartTime" TEXT;
ALTER TABLE "Group" ADD COLUMN     "raidDurationMins" INTEGER;
ALTER TABLE "Group" ADD COLUMN     "raidTimezone" TEXT;
