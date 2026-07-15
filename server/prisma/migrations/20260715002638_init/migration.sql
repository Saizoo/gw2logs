-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" TEXT NOT NULL,
    "permalink" TEXT NOT NULL,
    "dpsReportId" TEXT NOT NULL,
    "fightName" TEXT NOT NULL,
    "triggerId" INTEGER,
    "wing" TEXT,
    "isCm" BOOLEAN NOT NULL DEFAULT false,
    "success" BOOLEAN NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "squadDps" INTEGER NOT NULL,
    "encounterTime" TIMESTAMP(3) NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT,
    "sourceFileName" TEXT,
    "rawJson" JSONB NOT NULL,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogPlayer" (
    "id" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "characterName" TEXT NOT NULL,
    "profession" TEXT NOT NULL,
    "spec" TEXT NOT NULL,
    "subgroup" INTEGER NOT NULL,
    "totalDps" INTEGER NOT NULL,
    "powerDps" INTEGER NOT NULL,
    "condiDps" INTEGER NOT NULL,
    "damageTaken" INTEGER NOT NULL,
    "downCount" INTEGER NOT NULL,
    "deadCount" INTEGER NOT NULL,
    "boons" JSONB NOT NULL,
    "mechanics" JSONB NOT NULL,

    CONSTRAINT "LogPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MechanicEvent" (
    "id" TEXT NOT NULL,
    "logId" TEXT NOT NULL,
    "timeMs" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "actor" TEXT,

    CONSTRAINT "MechanicEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadJob" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSizeByte" INTEGER NOT NULL,
    "errorMessage" TEXT,
    "logId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_account_key" ON "Player"("account");

-- CreateIndex
CREATE UNIQUE INDEX "Log_permalink_key" ON "Log"("permalink");

-- CreateIndex
CREATE UNIQUE INDEX "Log_dpsReportId_key" ON "Log"("dpsReportId");

-- CreateIndex
CREATE INDEX "Log_fightName_isCm_idx" ON "Log"("fightName", "isCm");

-- CreateIndex
CREATE INDEX "Log_uploadedAt_idx" ON "Log"("uploadedAt");

-- CreateIndex
CREATE INDEX "LogPlayer_logId_idx" ON "LogPlayer"("logId");

-- CreateIndex
CREATE INDEX "LogPlayer_playerId_idx" ON "LogPlayer"("playerId");

-- CreateIndex
CREATE INDEX "LogPlayer_profession_idx" ON "LogPlayer"("profession");

-- CreateIndex
CREATE INDEX "MechanicEvent_logId_idx" ON "MechanicEvent"("logId");

-- AddForeignKey
ALTER TABLE "LogPlayer" ADD CONSTRAINT "LogPlayer_logId_fkey" FOREIGN KEY ("logId") REFERENCES "Log"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogPlayer" ADD CONSTRAINT "LogPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MechanicEvent" ADD CONSTRAINT "MechanicEvent_logId_fkey" FOREIGN KEY ("logId") REFERENCES "Log"("id") ON DELETE CASCADE ON UPDATE CASCADE;
