import {
    getInningsById,
    completeInnings
} from "../repositories/innings.repository.js";

import {
    getMatchById
} from "../repositories/match.repository.js";

import {
    startSecondInnings,
    evaluateMatchResult
} from "../engine/matchResult.engine.js";

export async function endInnings(inningsId) {
    const innings = await getInningsById(inningsId);

    if (!innings) {
        throw new Error("Innings not found");
    }

    if (innings.status === "COMPLETED") {
        throw new Error("Innings already completed");
    }

    await completeInnings(inningsId);

    const match = await getMatchById(innings.matchId);

    if (innings.inningsNumber === 1) {
        const secondInnings = await startSecondInnings(match.id, innings);

        return {
            message: "First innings completed. Second innings started.",
            secondInningsId: secondInnings.id
        };
    }

    const matchResult = await evaluateMatchResult(innings.id);

    return {
        message: "Match completed successfully.",
        result: matchResult
    };
}