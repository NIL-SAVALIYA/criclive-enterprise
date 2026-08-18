import {
    createPlayingXIService,
    getPlayingXIService,
    updatePlayingXIService
} from "../services/playingXI.service.js";

export async function getPlayingXIController(req, res) {
    try {
        const { matchId } = req.params;
        const data = await getPlayingXIService(matchId);

        return res.status(200).json({
            success: true,
            message: "Playing XI fetched successfully.",
            data
        });
    } catch (error) {
        const statusCode = error.status || error.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Failed to fetch Playing XI."
        });
    }
}

export async function createPlayingXIController(req, res) {
    try {
        const { matchId } = req.params;
        const { teamId, players } = req.body;

        const result = await createPlayingXIService(
            matchId,
            teamId,
            players,
            req.user
        );

        return res.status(201).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        const statusCode = error.status || error.statusCode || 400;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Failed to create Playing XI."
        });
    }
}

export async function updatePlayingXIController(req, res) {
    try {
        const { matchId } = req.params;
        const { teamId, players } = req.body;

        const result = await updatePlayingXIService(
            matchId,
            teamId,
            players,
            req.user
        );

        return res.status(200).json({
            success: true,
            message: result.message
        });

    } catch (error) {
        const statusCode = error.status || error.statusCode || 400;
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Failed to update Playing XI."
        });
    }
}