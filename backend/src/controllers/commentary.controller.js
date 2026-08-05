import { getCommentaryService } from "../services/commentary.service.js";

export async function getCommentary(req, res, next) {
    try {
        const { matchId } = req.params;

        const data = await getCommentaryService(matchId);

        return res.status(200).json({
            success: true,
            message: "Commentary fetched successfully.",
            data
        });
    } catch (error) {
        next(error);
    }
}