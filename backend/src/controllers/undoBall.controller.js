import { undoLastBallService } from "../services/undoBall.service.js";

/**
 * Controller to undo the most recent delivery of a match or innings.
 */
export async function undoLastBall(req, res) {
    try {
        const matchId = req.params.matchId || req.body?.matchId;
        const inningsId = req.params.inningsId || req.body?.inningsId;

        const result = await undoLastBallService({
            matchId,
            inningsId,
            user: req.user
        });

        return res.status(200).json({
            success: true,
            message: result.message,
            data: result
        });
    } catch (error) {
        console.error("Undo ball error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to undo last delivery."
        });
    }
}
