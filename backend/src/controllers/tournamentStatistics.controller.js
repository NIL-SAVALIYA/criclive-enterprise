import {
    getTournamentStatisticsService
} from "../services/tournamentStatistics.service.js";

export async function getTournamentStatisticsController( req,res,next) {
    try {

        const { tournamentId } = req.params;

        const statistics =
            await getTournamentStatisticsService(
                tournamentId
            );

        return res.status(200).json({
            success: true,
            message: "Tournament statistics fetched successfully.",
            data: statistics
        });

    } catch (error) {
        next(error);
    }
}