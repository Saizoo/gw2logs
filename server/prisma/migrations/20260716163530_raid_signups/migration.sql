-- CreateTable
CREATE TABLE "RaidSignup" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaidSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RaidSignup_groupId_date_idx" ON "RaidSignup"("groupId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RaidSignup_groupId_userId_date_key" ON "RaidSignup"("groupId", "userId", "date");

-- AddForeignKey
ALTER TABLE "RaidSignup" ADD CONSTRAINT "RaidSignup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaidSignup" ADD CONSTRAINT "RaidSignup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
