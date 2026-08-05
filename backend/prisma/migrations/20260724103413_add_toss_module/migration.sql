-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "resultType" "MatchResultType";

-- CreateTable
CREATE TABLE "PointsTable" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "tied" INTEGER NOT NULL DEFAULT 0,
    "noResult" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "runsScored" INTEGER NOT NULL DEFAULT 0,
    "ballsFaced" INTEGER NOT NULL DEFAULT 0,
    "runsConceded" INTEGER NOT NULL DEFAULT 0,
    "ballsBowled" INTEGER NOT NULL DEFAULT 0,
    "netRunRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointsTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Toss" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "winnerTeamId" TEXT NOT NULL,
    "loserTeamId" TEXT NOT NULL,
    "decision" "TossDecision" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Toss_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointsTable_tournamentId_idx" ON "PointsTable"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "PointsTable_tournamentId_teamId_key" ON "PointsTable"("tournamentId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Toss_matchId_key" ON "Toss"("matchId");

-- AddForeignKey
ALTER TABLE "PointsTable" ADD CONSTRAINT "PointsTable_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsTable" ADD CONSTRAINT "PointsTable_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Toss" ADD CONSTRAINT "Toss_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Toss" ADD CONSTRAINT "Toss_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Toss" ADD CONSTRAINT "Toss_loserTeamId_fkey" FOREIGN KEY ("loserTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
