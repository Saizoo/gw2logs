-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "icon" TEXT,
    "background" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupRequest" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profession" TEXT NOT NULL,
    "race" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "extId" TEXT,
    "activeTab" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterTemplate" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "tab" INTEGER NOT NULL,
    "name" TEXT,
    "spec" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "assignedBuildId" TEXT,

    CONSTRAINT "CharacterTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupRequest_groupId_userId_key" ON "GroupRequest"("groupId", "userId");

-- CreateIndex
CREATE INDEX "Character_userId_idx" ON "Character"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Character_userId_name_key" ON "Character"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterTemplate_characterId_tab_key" ON "CharacterTemplate"("characterId", "tab");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupRequest" ADD CONSTRAINT "GroupRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupRequest" ADD CONSTRAINT "GroupRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterTemplate" ADD CONSTRAINT "CharacterTemplate_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: CompositionSlot gains the new structured-reference columns.
-- These are all nullable, so this part is always safe regardless of
-- existing rows.
ALTER TABLE "CompositionSlot" ADD COLUMN     "buildId" TEXT,
ADD COLUMN     "characterId" TEXT,
ADD COLUMN     "characterTemplateId" TEXT;

-- AlterTable: add groupId as NULLABLE first. Composition previously
-- belonged to a Guild; it now belongs to a Group instead (an ad-hoc
-- raid-planning team, distinct from the read-only GW2-synced Guild). Any
-- row created before this migration only has a guildId, so groupId can't
-- be backfilled as part of the column definition the way a fresh install
-- (with zero existing rows) could get away with.
ALTER TABLE "Composition" ADD COLUMN "groupId" TEXT;

-- Backfill: for every pre-existing Composition (still keyed by guildId),
-- create an equivalent Group — named after the Guild it came from, led by
-- whoever created the composition — and point the composition at it. This
-- runs before groupId is made required and before guildId is dropped, so
-- no existing data is lost; the composition's slots, name, and history
-- are all preserved, just re-parented onto a real Group instead of a
-- Guild.
DO $$
DECLARE
  comp RECORD;
  new_group_id TEXT;
BEGIN
  FOR comp IN
    SELECT c.id AS comp_id, c."createdById", g.name AS guild_name
    FROM "Composition" c
    JOIN "Guild" g ON g.id = c."guildId"
    WHERE c."groupId" IS NULL
  LOOP
    new_group_id := replace(gen_random_uuid()::text, '-', '');
    INSERT INTO "Group" (id, name, "leaderId", "createdAt")
    VALUES (new_group_id, comp.guild_name || ' (migrated)', comp."createdById", now());
    INSERT INTO "GroupMember" (id, "groupId", "userId", role, "joinedAt")
    VALUES (replace(gen_random_uuid()::text, '-', ''), new_group_id, comp."createdById", 'leader', now());
    UPDATE "Composition" SET "groupId" = new_group_id WHERE id = comp.comp_id;
  END LOOP;
END $$;

-- Now safe to require groupId and drop the old guildId column/constraint.
ALTER TABLE "Composition" ALTER COLUMN "groupId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "Composition" DROP CONSTRAINT "Composition_guildId_fkey";

-- DropIndex
DROP INDEX "Composition_guildId_idx";

-- AlterTable
ALTER TABLE "Composition" DROP COLUMN "guildId";

-- CreateIndex
CREATE INDEX "Composition_groupId_idx" ON "Composition"("groupId");

-- AddForeignKey
ALTER TABLE "Composition" ADD CONSTRAINT "Composition_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompositionSlot" ADD CONSTRAINT "CompositionSlot_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompositionSlot" ADD CONSTRAINT "CompositionSlot_characterTemplateId_fkey" FOREIGN KEY ("characterTemplateId") REFERENCES "CharacterTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
