import { startMatch } from "../services/startMatch.service.js";

export async function startMatchController(req, res) {
    try {
        const { matchId } = req.params;
        const { strikerId, nonStrikerId, bowlerId } = req.body;

        const match = await startMatch(matchId, strikerId, nonStrikerId, bowlerId, req.user);

        return res.status(200).json({
            success: true,
            message: "Match started successfully",
            data: match
        });
    } catch (error) {
        const statusCode = error.statusCode || 400;
        return res.status(statusCode).json({
            success: false,
            message: error.message
        });
    }
}