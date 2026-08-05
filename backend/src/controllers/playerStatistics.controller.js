import { getPlayerStatisticsService, getPlayerCareerRecordsService } from "../services/playerStatistics.service.js";

export async function getPlayerStatisticsController(  req, res, next) {
    try {

        const { playerId } = req.params;

        const statistics = await getPlayerStatisticsService(playerId);

        return res.status(200).json({
            success: true,
            message: "Player statistics fetched successfully.",
            data: statistics
        });

    } catch (error) {
        next(error);
    }
}

export async function getPlayerCareerRecordsController(req, res, next) {
    try {
        const { playerId } = req.params;
        const data = await getPlayerCareerRecordsService(playerId);
        return res.status(200).json({
            success: true,
            message: "Player career records fetched successfully.",
            data
        });
    } catch (error) {
        next(error);
    }
}