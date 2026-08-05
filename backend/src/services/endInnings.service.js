import {
    getInningsById,
    completeInnings,
    createInnings
} from "../repositories/innings.repository.js";

import {
    getMatchById,
    updateMatch
} from "../repositories/match.repository.js";

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

        await createInnings({

            matchId: innings.matchId,

            inningsNumber: 2,

            battingTeamId: innings.bowlingTeamId,

            bowlingTeamId: innings.battingTeamId,

            status: "LIVE"

        });

        return {
            message: "First innings completed. Second innings started."
        };
    }

    await updateMatch(match.id, {

        status: "COMPLETED",

        completedAt: new Date()

    });

    return {
        message: "Match completed successfully."
    };
}