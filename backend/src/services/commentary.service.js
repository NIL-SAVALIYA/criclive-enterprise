import { getLiveInnings } from "../repositories/innings.repository.js";
import { getCommentaryByInnings } from "../repositories/ball.repository.js";

export async function getCommentaryService(matchId) {
    const innings = await getLiveInnings(matchId);

    if (!innings) {
        throw new Error("No live innings found.");
    }

    const commentary = await getCommentaryByInnings(innings.id);

    return commentary;
}