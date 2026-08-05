import {
    getMatchById,
    updateMatch
} from "../repositories/match.repository.js";

export async function createToss(matchId, winnerTeamId, decision) {

    const match = await getMatchById(matchId);

    if (!match) {
        throw new Error("Match not found");
    }

    if (match.tossWinnerId) {
        throw new Error("Toss has already been recorded");
    }

    if (
        winnerTeamId !== match.teamAId &&
        winnerTeamId !== match.teamBId
    ) {
        throw new Error("Winner team must be Team A or Team B");
    }

    return await updateMatch(matchId, {
        tossWinnerId: winnerTeamId,
        tossDecision: decision
    });
}