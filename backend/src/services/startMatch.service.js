import prisma from "../config/db.js";
import { recordAuditLog } from "../utils/auditLogger.js";
import { Roles } from "../constants/roles.js";

export async function startMatch(matchId, strikerId, nonStrikerId, bowlerId, user = null) {
    return await prisma.$transaction(async (tx) => {
        const match = await tx.match.findUnique({
            where: { id: matchId },
            include: {
                tournament: true,
                teamA: true,
                teamB: true
            }
        });

        if (!match) {
            const error = new Error("Match not found");
            error.statusCode = 404;
            throw error;
        }

        // Authorization check for non-ADMIN users
        if (user && user.role !== Roles.ADMIN) {
            if (user.role === Roles.ORGANIZER) {
                if (match.tournament?.organizerId && match.tournament.organizerId !== user.userId) {
                    const error = new Error("Access denied. You can only start matches in tournaments you organize.");
                    error.statusCode = 403;
                    throw error;
                }
            } else if (user.role === Roles.SCORER) {
                if (match.scorerId && match.scorerId !== user.userId) {
                    const error = new Error("Access denied. You are not assigned to score this match.");
                    error.statusCode = 403;
                    throw error;
                }
            } else {
                const error = new Error("Access denied. Only authorized staff can start matches.");
                error.statusCode = 403;
                throw error;
            }
        }

        if (match.status !== "UPCOMING") {
            const error = new Error("Match has already started or completed");
            error.statusCode = 400;
            throw error;
        }

        if (!match.tossWinnerId || !match.tossDecision) {
            const error = new Error("Toss has not been recorded");
            error.statusCode = 400;
            throw error;
        }

        const playingXI = await tx.playingXI.findMany({
            where: { matchId }
        });

        const teamAPlayers = playingXI.filter(p => p.teamId === match.teamAId);
        const teamBPlayers = playingXI.filter(p => p.teamId === match.teamBId);

        if (teamAPlayers.length !== 11 || teamBPlayers.length !== 11) {
            const error = new Error("Both teams must have exactly 11 players in Playing XI");
            error.statusCode = 400;
            throw error;
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
        if (strikerId === nonStrikerId) {
            const error = new Error("Striker and Non-Striker cannot be the same player");
            error.statusCode = 400;
            throw error;
        }

        const battingPlayers = playingXI.filter(p => p.teamId === battingTeamId);
        const bowlingPlayers = playingXI.filter(p => p.teamId === bowlingTeamId);

        if (!battingPlayers.some(p => p.playerId === strikerId)) {
            const error = new Error("Striker is not in the batting team's Playing XI");
            error.statusCode = 400;
            throw error;
        }
        if (!battingPlayers.some(p => p.playerId === nonStrikerId)) {
            const error = new Error("Non-Striker is not in the batting team's Playing XI");
            error.statusCode = 400;
            throw error;
        }
        if (!bowlingPlayers.some(p => p.playerId === bowlerId)) {
            const error = new Error("Bowler is not in the bowling team's Playing XI");
            error.statusCode = 400;
            throw error;
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

        // Update the opening bowler to ensure they have the latest updatedAt timestamp
        const openingBowlerScorecard = await tx.bowlingScorecard.findFirst({
            where: { inningsId: innings.id, bowlerId }
        });
        if (openingBowlerScorecard) {
            await tx.bowlingScorecard.update({
                where: { id: openingBowlerScorecard.id },
                data: { updatedAt: new Date() }
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

        // 6. Record Audit Log
        await recordAuditLog({
            userId: user ? user.userId : null,
            action: "MATCH_STARTED",
            entityType: "MATCH",
            entityId: matchId,
            metadata: {
                matchId,
                tournamentId: match.tournamentId,
                teamAId: match.teamAId,
                teamBId: match.teamBId,
                strikerId,
                nonStrikerId,
                bowlerId
            },
            db: tx
        });

        // 7. Create Notification (Timeline Event)
        await tx.notification.create({
            data: {
                type: "MATCH_EVENT",
                title: "Match Started",
                message: `Match started: ${match.teamA.name} vs ${match.teamB.name}. 1st Innings underway.`,
                matchId
            }
        });

        console.log(`[MATCH EVENT] Match Started | ID: ${matchId} | ${match.teamA.name} vs ${match.teamB.name}`);
        return updatedMatch;
    }, { maxWait: 15000, timeout: 30000 });
}