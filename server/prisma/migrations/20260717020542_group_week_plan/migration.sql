-- CreateTable
CREATE TABLE "GroupWeekPlanItem" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "encounterName" TEXT NOT NULL,
    "compositionId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupWeekPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupWeekPlanItem_groupId_weekStart_idx" ON "GroupWeekPlanItem"("groupId", "weekStart");

-- AddForeignKey
ALTER TABLE "GroupWeekPlanItem" ADD CONSTRAINT "GroupWeekPlanItem_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupWeekPlanItem" ADD CONSTRAINT "GroupWeekPlanItem_compositionId_fkey" FOREIGN KEY ("compositionId") REFERENCES "Composition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

