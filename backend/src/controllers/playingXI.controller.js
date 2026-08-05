import { createPlayingXIService } from "../services/playingXI.service.js";

export async function createPlayingXIController(req,res,next) {
    try {

        const { matchId } = req.params;
        const { teamId, players } = req.body;

        const result = await createPlayingXIService(
            matchId,
            teamId,
            players
        );

        return res.status(201).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        next(error);
    }
}