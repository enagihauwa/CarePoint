-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'pending_deletion', 'deleted');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX "User_status_deletionRequestedAt_idx" ON "User"("status", "deletionRequestedAt");
