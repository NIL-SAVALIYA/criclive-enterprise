-- Synchronize analytics fields and notification system.
-- Remove the obsolete standalone Toss table.
-- Toss functionality remains on Match.tossWinnerId/tossDecision.

-- Add cricket analytics fields to Ball
ALTER TABLE "Ball"
ADD COLUMN "pitchLength" TEXT,
ADD COLUMN "pitchLine" TEXT,
ADD COLUMN "shotX" DOUBLE PRECISION,
ADD COLUMN "shotY" DOUBLE PRECISION,
ADD COLUMN "shotZone" TEXT;

-- Remove legacy Toss foreign keys
ALTER TABLE "Toss" DROP CONSTRAINT "Toss_loserTeamId_fkey";
ALTER TABLE "Toss" DROP CONSTRAINT "Toss_matchId_fkey";
ALTER TABLE "Toss" DROP CONSTRAINT "Toss_winnerTeamId_fkey";

-- Remove obsolete standalone Toss table.
-- Toss data is stored directly on Match.
DROP TABLE "Toss";

-- Create notification system table
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "matchId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- Notification feed performance index
CREATE INDEX "Notification_createdAt_idx"
ON "Notification"("createdAt");