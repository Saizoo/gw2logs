-- AlterTable: mechanic severity, straight from Elite Insights' own
-- Mechanics[].Severity ("Sev0".."Sev4") — no classification invented here.
ALTER TABLE "MechanicEvent" ADD COLUMN     "severity" TEXT;

-- CreateTable: per-death recap from JsonPlayer.DeathRecap.
CREATE TABLE "DeathEvent" (
    "id"       TEXT NOT NULL,
    "logId"    TEXT NOT NULL,
    "timeMs"   INTEGER NOT NULL,
    "actor"    TEXT NOT NULL,
    "killedBy" TEXT,

    CONSTRAINT "DeathEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeathEvent_logId_idx" ON "DeathEvent"("logId");

ALTER TABLE "DeathEvent" ADD CONSTRAINT "DeathEvent_logId_fkey" FOREIGN KEY ("logId") REFERENCES "Log"("id") ON DELETE CASCADE ON UPDATE CASCADE;
