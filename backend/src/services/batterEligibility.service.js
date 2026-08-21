import prisma from "../config/db.js";

/**
 * Single source of truth for incoming batter eligibility.
 * 
 * Eligibility Rules:
 * 1. Player must belong to current batting team (player.teamId === innings.battingTeamId)
 * 2. Player must be part of the match Playing XI for the batting team
 * 3. Player is not dismissed (isOut: false in BattingScorecard)
 * 4. Player is not currently on the pitch (playerId !== currentStrikerId && playerId !== currentNonStrikerId)
 * 5. Player is not the dismissed player of this wicket delivery
 */
export async function getEligibleIncomingBatters({
    inningsId,
    currentStrikerId,
    currentNonStrikerId,
    dismissedPlayerId,
    tx = prisma
}) {
    const innings = await tx.innings.findUnique({
        where: { id: inningsId },
        include: {
            match: true
        }
    });

    if (!innings) {
        const error = new Error("Innings not found.");
        error.statusCode = 404;
        throw error;
    }

    // Get Playing XI of the batting team for this match
    const battingXI = await tx.playingXI.findMany({
        where: {
            matchId: innings.matchId,
            teamId: innings.battingTeamId
        },
        include: {
            player: true
        },
        orderBy: {
            battingOrder: "asc"
        }
    });

    // Get all batting scorecards for this innings
    const scorecards = await tx.battingScorecard.findMany({
        where: { inningsId }
    });

    const scorecardMap = new Map(scorecards.map(sc => [sc.playerId, sc]));

    const excludedPlayerIds = new Set([
        currentStrikerId,
        currentNonStrikerId,
        dismissedPlayerId
    ].filter(Boolean));

    const eligible = [];

    for (const xi of battingXI) {
        const pId = xi.playerId;
        if (excludedPlayerIds.has(pId)) continue;

        const card = scorecardMap.get(pId);
        // If already batted and dismissed, ineligible
        if (card && card.isOut) continue;

        eligible.push({
            playerId: pId,
            id: pId,
            teamId: xi.teamId || xi.player?.teamId || innings.battingTeamId,
            name: `${xi.player.firstName} ${xi.player.lastName}`.trim(),
            jerseyNumber: xi.player.jerseyNumber,
            battingOrder: xi.battingOrder,
            runs: card ? card.runs : 0,
            balls: card ? card.balls : 0,
            isOut: false
        });
    }

    return eligible;
}

/**
 * Validate that the specified incoming batter is eligible.
 * Throws 400 Bad Request if the player violates any eligibility rules.
 */
export async function validateIncomingBatter({
    inningsId,
    newBatsmanId,
    incomingBatterId,
    currentStrikerId,
    currentNonStrikerId,
    dismissedPlayerId,
    tx = prisma
}) {
    const targetBatterId = newBatsmanId || incomingBatterId;
    if (!targetBatterId) return { isValid: true };

    const innings = await tx.innings.findUnique({
        where: { id: inningsId }
    });

    if (!innings) {
        const error = new Error("Innings not found.");
        error.statusCode = 404;
        throw error;
    }

    // 1. Check current striker/non-striker/dismissed player conflicts
    if (targetBatterId === currentStrikerId) {
        const error = new Error("Incoming batter cannot be the active striker.");
        error.statusCode = 400;
        throw error;
    }

    if (targetBatterId === currentNonStrikerId) {
        const error = new Error("Incoming batter cannot be the active non-striker.");
        error.statusCode = 400;
        throw error;
    }

    if (dismissedPlayerId && targetBatterId === dismissedPlayerId) {
        const error = new Error("Incoming batter cannot be the player who was just dismissed.");
        error.statusCode = 400;
        throw error;
    }

    // 2. Check player exists and belongs to batting team
    const player = await tx.player.findUnique({
        where: { id: targetBatterId }
    });

    if (!player) {
        const error = new Error("Incoming batter not found.");
        error.statusCode = 404;
        throw error;
    }

    if (player.teamId !== innings.battingTeamId) {
        const error = new Error("Incoming batter must belong to the current batting team. Opposition players are not allowed.");
        error.statusCode = 400;
        throw error;
    }

    // 3. Check Playing XI
    const inXI = await tx.playingXI.findFirst({
        where: {
            matchId: innings.matchId,
            teamId: innings.battingTeamId,
            playerId: targetBatterId
        }
    });

    if (!inXI) {
        const error = new Error("Incoming batter must be part of the batting team's Playing XI for this match.");
        error.statusCode = 400;
        throw error;
    }

    // 4. Check not already dismissed in this innings
    const card = await tx.battingScorecard.findFirst({
        where: {
            inningsId,
            playerId: targetBatterId
        }
    });

    if (card && card.isOut) {
        const error = new Error("Incoming batter has already been dismissed in this innings.");
        error.statusCode = 400;
        throw error;
    }

    return { isValid: true, player };
}
