import { getMatchById } from "../repositories/match.repository.js";
import { getLiveInnings } from "../repositories/innings.repository.js";

import { getCurrentBatsmen } from "../repositories/battingScorecard.repository.js";
import { getCurrentBowler } from "../repositories/bowlingScorecard.repository.js";
import { getRecentBalls } from "../repositories/ball.repository.js";

export async function getMatchSummaryService(matchId) {
    const match = await getMatchById(matchId);
    const innings = await getLiveInnings(matchId);

    if (!match) {
        throw new Error("Match not found.");
    }

    if (!innings) {
        throw new Error("No live innings found.");
    }

    const currentBatters = await getCurrentBatsmen(innings.id);

    const currentBowler = await getCurrentBowler(innings.id);

    const lastSixBalls = await getRecentBalls(innings.id);

    return {
        match: {
            id: match.id,
            status: match.status,
            venue: match.venue,
            matchDate: match.matchDate
        },

        innings: {
            id: innings.id,
            inningsNumber: innings.inningsNumber,
            totalRuns: innings.totalRuns,
            wickets: innings.wickets,
            overs: innings.overs,
            currentRunRate: innings.currentRunRate
        },

        currentBatters,

        currentBowler,

        lastSixBalls
    };
}