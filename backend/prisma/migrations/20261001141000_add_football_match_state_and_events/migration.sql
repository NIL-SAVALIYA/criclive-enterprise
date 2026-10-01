-- CreateEnum
CREATE TYPE "FootballEventType" AS ENUM ('GOAL', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION', 'PENALTY', 'KICKOFF', 'HALF_TIME', 'FULL_TIME');

-- AlterEnum
ALTER TYPE "SportCode" ADD VALUE 'FOOTBALL';

-- CreateTable
CREATE TABLE "FootballMatchState" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "homeScore" INTEGER NOT NULL DEFAULT 0,
    "awayScore" INTEGER NOT NULL DEFAULT 0,
    "currentHalf" INTEGER NOT NULL DEFAULT 1,
    "matchMinute" INTEGER NOT NULL DEFAULT 0,
    "status" "MatchStatus" NOT NULL DEFAULT 'UPCOMING',
    "homePossession" DOUBLE PRECISION DEFAULT 50.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FootballMatchState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FootballEvent" (
    "id" TEXT NOT NULL,
    "footballMatchStateId" TEXT NOT NULL,
    "eventType" "FootballEventType" NOT NULL,
    "minute" INTEGER NOT NULL,
    "teamId" TEXT,
    "playerId" TEXT,
    "secondaryPlayerId" TEXT,
    "detail" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FootballEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FootballMatchState_matchId_key" ON "FootballMatchState"("matchId");

-- CreateIndex
CREATE INDEX "FootballMatchState_status_idx" ON "FootballMatchState"("status");

-- CreateIndex
CREATE INDEX "FootballEvent_footballMatchStateId_idx" ON "FootballEvent"("footballMatchStateId");

-- CreateIndex
CREATE INDEX "FootballEvent_footballMatchStateId_minute_idx" ON "FootballEvent"("footballMatchStateId", "minute");

-- AddForeignKey
ALTER TABLE "FootballMatchState" ADD CONSTRAINT "FootballMatchState_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FootballEvent" ADD CONSTRAINT "FootballEvent_footballMatchStateId_fkey" FOREIGN KEY ("footballMatchStateId") REFERENCES "FootballMatchState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
