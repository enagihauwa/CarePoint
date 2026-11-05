-- CreateEnum
CREATE TYPE "CodePurpose" AS ENUM ('verify', 'reset');

-- AlterTable
ALTER TABLE "EmailVerification" ADD COLUMN     "purpose" "CodePurpose" NOT NULL DEFAULT 'verify';
