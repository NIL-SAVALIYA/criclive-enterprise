import prisma from "../config/db.js";

export async function startMatch(matchId, strikerId, nonStrikerId, bowlerId) {
    return await prisma.$transaction(async (tx) => {
        const match = await tx.match.findUnique({
            where: { id: matchId }
        });

        if (!match) {
            throw new Error("Match not found");
        }

        if (match.status !== "UPCOMING") {
            throw new Error("Match has already started or completed");
        }

        if (!match.tossWinnerId || !match.tossDecision) {
            throw new Error("Toss has not been recorded");
        }

        const playingXI = await tx.playingXI.findMany({
            where: { matchId }
        });

        const teamAPlayers = playingXI.filter(p => p.teamId === match.teamAId);
        const teamBPlayers = playingXI.filter(p => p.teamId === match.teamBId);

        if (teamAPlayers.length !== 11 || teamBPlayers.length !== 11) {
            throw new Error("Both teams must have exactly 11 players");
        }

        let battingTeamId;
        let bowlingTeamId;

        if (match.tossDecision === "BAT") {
            battingTeamId = match.tossWinnerId;
            bowlingTeamId = match.tossWinnerId === match.teamAId ? match.teamBId : match.teamAId;
        } else {
            bowlingTeamId = match.tossWinnerId;
            battingTeamId = match.tossWinnerId === match.teamAId ? match.teamBId : match.teamAId;
        }

        // Validate striker, non-striker and bowler
        const battingPlayers = playingXI.filter(p => p.teamId === battingTeamId);
        const bowlingPlayers = playingXI.filter(p => p.teamId === bowlingTeamId);

        if (!battingPlayers.some(p => p.playerId === strikerId)) {
            throw new Error("Striker is not in the batting team's Playing XI");
        }
        if (!battingPlayers.some(p => p.playerId === nonStrikerId)) {
            throw new Error("Non-Striker is not in the batting team's Playing XI");
        }
        if (!bowlingPlayers.some(p => p.playerId === bowlerId)) {
            throw new Error("Bowler is not in the bowling team's Playing XI");
        }

        // 1. Update Match status
        const updatedMatch = await tx.match.update({
            where: { id: matchId },
            data: { status: "LIVE" }
        });

        // 2. Create Innings
        const innings = await tx.innings.create({
            data: {
                matchId,
                inningsNumber: 1,
                battingTeamId,
                bowlingTeamId,
                status: "LIVE"
            }
        });

        // 3. Create Batting Scorecards
        // Sort batting players by original battingOrder to assign 3-11 positions to non-openers
        const otherBatters = battingPlayers
            .filter(p => p.playerId !== strikerId && p.playerId !== nonStrikerId)
            .sort((a, b) => a.battingOrder - b.battingOrder);

        const battingScorecardsData = [
            { inningsId: innings.id, playerId: strikerId, battingPosition: 1 },
            { inningsId: innings.id, playerId: nonStrikerId, battingPosition: 2 },
            ...otherBatters.map((p, index) => ({
                inningsId: innings.id,
                playerId: p.playerId,
                battingPosition: index + 3
            }))
        ];

        await tx.battingScorecard.createMany({
            data: battingScorecardsData
        });

        // 4. Create Bowling Scorecards
        const bowlingScorecardsData = bowlingPlayers.map(p => ({
            inningsId: innings.id,
            bowlerId: p.playerId
        }));

        await tx.bowlingScorecard.createMany({
            data: bowlingScorecardsData
        });

        // Dummy update the opening bowler to ensure they have the latest updatedAt timestamp
        const openingBowlerScorecard = await tx.bowlingScorecard.findFirst({
            where: { inningsId: innings.id, bowlerId }
        });
        if (openingBowlerScorecard) {
            await tx.bowlingScorecard.update({
                where: { id: openingBowlerScorecard.id },
                data: { updatedAt: new Date() } // Forces an update
            });
        }

        // 5. Create Partnership
        await tx.partnership.create({
            data: {
                inningsId: innings.id,
                strikerId,
                nonStrikerId,
                isActive: true
            }
        });

        // 7. Create Notification (Timeline Event)
        await tx.notification.create({
            data: {
                type: "MATCH_EVENT",
                title: "Match Started",
                message: "The match has started. 1st Innings underway.",
                matchId
            }
        });

        return updatedMatch;
    });
}