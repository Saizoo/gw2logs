-- CreateTable
CREATE TABLE "Composition" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fightName" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Composition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompositionSlot" (
    "id" TEXT NOT NULL,
    "compositionId" TEXT NOT NULL,
    "subgroup" INTEGER NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "profession" TEXT NOT NULL,
    "spec" TEXT,
    "buildName" TEXT,
    "buildDetails" TEXT,

    CONSTRAINT "CompositionSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Composition_guildId_idx" ON "Composition"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "CompositionSlot_compositionId_subgroup_slotIndex_key" ON "CompositionSlot"("compositionId", "subgroup", "slotIndex");

-- AddForeignKey
ALTER TABLE "Composition" ADD CONSTRAINT "Composition_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Composition" ADD CONSTRAINT "Composition_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompositionSlot" ADD CONSTRAINT "CompositionSlot_compositionId_fkey" FOREIGN KEY ("compositionId") REFERENCES "Composition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

