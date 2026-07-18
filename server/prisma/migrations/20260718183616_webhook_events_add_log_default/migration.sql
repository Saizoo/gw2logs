-- AlterTable
ALTER TABLE "Group" ALTER COLUMN "webhookEvents" SET DEFAULT ARRAY['reminder', 'schedule', 'plan', 'log']::TEXT[];

