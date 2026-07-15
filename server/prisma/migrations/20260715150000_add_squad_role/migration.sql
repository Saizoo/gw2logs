-- AlterTable: LogPlayer gains per-log squad-function classification
-- (dps / boon_dps / boon_heal), computed at ingest time from subgroup boon
-- generation and outgoing healing. squadRole defaults to 'dps' so existing
-- rows (ingested before this feature) read as plain DPS rather than NULL;
-- groupBoons/healingOutput are nullable since existing rows have no
-- generation/healing data captured for them.
ALTER TABLE "LogPlayer" ADD COLUMN     "squadRole" TEXT NOT NULL DEFAULT 'dps',
ADD COLUMN     "groupBoons" JSONB,
ADD COLUMN     "healingOutput" INTEGER;
