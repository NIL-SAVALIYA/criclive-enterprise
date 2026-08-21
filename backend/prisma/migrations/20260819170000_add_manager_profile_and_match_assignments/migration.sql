-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ManagerAssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'REVOKED', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable ManagerProfile
CREATE TABLE IF NOT EXISTS "ManagerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "normalizedNickname" TEXT NOT NULL,
    "displayName" TEXT,
    "bio" TEXT,
    "profileImageUrl" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable ManagerAssignment
CREATE TABLE IF NOT EXISTS "ManagerAssignment" (
    "id" TEXT NOT NULL,
    "managerProfileId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "assignedByUserId" TEXT NOT NULL,
    "status" "ManagerAssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagerAssignment_pkey" PRIMARY KEY ("id")
);

-- Unique constraints & Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "ManagerProfile_userId_key" ON "ManagerProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "ManagerProfile_normalizedNickname_key" ON "ManagerProfile"("normalizedNickname");
CREATE INDEX IF NOT EXISTS "ManagerProfile_normalizedNickname_idx" ON "ManagerProfile"("normalizedNickname");
CREATE INDEX IF NOT EXISTS "ManagerProfile_userId_idx" ON "ManagerProfile"("userId");
CREATE INDEX IF NOT EXISTS "ManagerProfile_isActive_idx" ON "ManagerProfile"("isActive");

CREATE INDEX IF NOT EXISTS "ManagerAssignment_managerProfileId_idx" ON "ManagerAssignment"("managerProfileId");
CREATE INDEX IF NOT EXISTS "ManagerAssignment_matchId_idx" ON "ManagerAssignment"("matchId");
CREATE INDEX IF NOT EXISTS "ManagerAssignment_teamId_idx" ON "ManagerAssignment"("teamId");
CREATE INDEX IF NOT EXISTS "ManagerAssignment_assignedByUserId_idx" ON "ManagerAssignment"("assignedByUserId");
CREATE INDEX IF NOT EXISTS "ManagerAssignment_status_idx" ON "ManagerAssignment"("status");
CREATE INDEX IF NOT EXISTS "ManagerAssignment_matchId_teamId_status_idx" ON "ManagerAssignment"("matchId", "teamId", "status");
CREATE INDEX IF NOT EXISTS "ManagerAssignment_matchId_managerProfileId_status_idx" ON "ManagerAssignment"("matchId", "managerProfileId", "status");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ManagerProfile" ADD CONSTRAINT "ManagerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ManagerAssignment" ADD CONSTRAINT "ManagerAssignment_managerProfileId_fkey" FOREIGN KEY ("managerProfileId") REFERENCES "ManagerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ManagerAssignment" ADD CONSTRAINT "ManagerAssignment_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ManagerAssignment" ADD CONSTRAINT "ManagerAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "ManagerAssignment" ADD CONSTRAINT "ManagerAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
