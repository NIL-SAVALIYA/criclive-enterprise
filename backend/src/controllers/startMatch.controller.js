import { startMatch } from "../services/startMatch.service.js";

export async function startMatchController(req, res) {
    try {
        const { matchId } = req.params;
        const { strikerId, nonStrikerId, bowlerId } = req.body;

        const match = await startMatch(matchId, strikerId, nonStrikerId, bowlerId);

        return res.status(200).json({
            success: true,
            message: "Match started successfully",
            data: match
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
}