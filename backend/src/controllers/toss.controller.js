import { createToss } from "../services/toss.service.js";

export async function recordToss(req, res) {
    try {
        const { matchId } = req.params;
        const { winnerTeamId, decision } = req.body;

        const match = await createToss(
            matchId,
            winnerTeamId,
            decision
        );

        return res.status(200).json({
            success: true,
            message: "Toss recorded successfully",
            data: match
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
}