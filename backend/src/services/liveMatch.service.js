
import { getLiveScoreService } from "./liveScore.service.js";

export async function getLiveMatchService(matchId) {


    const liveScore = await getLiveScoreService(matchId);




    return  liveScore;

}