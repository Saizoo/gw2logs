-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardedAt" TIMESTAMP(3);

-- Accounts that existed before the tour shipped have already found their
-- way around — mark them onboarded so the tour only greets new users.
UPDATE "User" SET "onboardedAt" = now();
