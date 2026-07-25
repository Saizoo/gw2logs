-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "level" INTEGER,
ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "equipmentTabs" JSONB,
ADD COLUMN     "buildTabs" JSONB;
