-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "webhookEvents" TEXT[] DEFAULT ARRAY['reminder', 'schedule', 'plan']::TEXT[];

