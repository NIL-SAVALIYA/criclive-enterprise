import { getMatchSummaryService } from "../services/matchSummary.service.js";

export async function getMatchSummary(req, res, next) {
    try {
        const { matchId } = req.params;

        const data = await getMatchSummaryService(matchId);

        return res.status(200).json({
            success: true,
            message: "Match summary fetched successfully.",
            data
        });
    } catch (error) {
        next(error);
    }
}