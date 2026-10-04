
import { getMatchById } from "../repositories/match.repository.js";
import { getLiveScoreService } from "./liveScore.service.js";
import { getBadmintonMatchStateService } from "./badmintonMatch.service.js";
import { getFootballMatchStateService } from "./footballMatch.service.js";

export async function getLiveMatchService(matchId) {
    const match = await getMatchById(matchId);
    if (!match) {
        const error = new Error("Match not found.");
        error.statusCode = 404;
        throw error;
    }

    if (match.tournament?.sport?.code === "BADMINTON") {
        return await getBadmintonMatchStateService(matchId);
    }

    if (match.tournament?.sport?.code === "FOOTBALL") {
        return await getFootballMatchStateService(matchId);
    }

    return await getLiveScoreService(matchId);
}