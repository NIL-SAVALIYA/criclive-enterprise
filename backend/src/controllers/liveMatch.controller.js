import { getLiveMatchService } from "../services/liveMatch.service.js";
import { getScorecardService } from "../services/scorecard.service.js";

export async function getLiveMatch(req, res, next) {
    try {

        const { matchId } = req.params;

        const data = await getLiveMatchService(matchId);

        return res.status(200).json({
            success: true,
            message: "Live match fetched successfully.",
            data
        });

    } catch (error) {
        next(error);
    }
}
export async function getScorecard(req, res, next) {
    try {
        const { matchId } = req.params;

        const data = await getScorecardService(matchId);

        return res.status(200).json({
            success: true,
            message: "Scorecard fetched successfully.",
            data
        });

    } catch (error) {
        next(error);
    }
}