-- AlterTable: admin flag, bootstrapped from ADMIN_DISCORD_IDS on login
-- (see routes/auth.ts) rather than requiring manual SQL after a DB reset.
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: admin-editable raid-planner build catalog, replacing the
-- static src/data/builds.ts array. `id` stays a plain string (not cuid) so
-- it lines up with the path-derived ids CompositionSlot.buildId already
-- stores for every composition saved against the old static catalog — see
-- scripts/seedBuilds.ts for the one-time seed from that array's data.
CREATE TABLE "Build" (
    "id"         TEXT NOT NULL,
    "profession" TEXT NOT NULL,
    "category"   TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "weapons"    TEXT NOT NULL,
    "url"        TEXT NOT NULL,
    "sortOrder"  INTEGER NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Build_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Build_profession_idx" ON "Build"("profession");
