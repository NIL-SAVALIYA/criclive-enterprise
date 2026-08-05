import {
    getTournamentStatistics,
    getTournamentMatchesCount,
    getTournamentTeamsCount,
    getTournamentPlayersCount,
    getHighestTeamScore,
    getLowestTeamScore,
    getTopRunScorer,
    getTopWicketTaker
} from "../repositories/tournamentStatistics.repository.js";

import { toTournamentStatistics } from "../mappers/tournamentStatistics.mapper.js";

export async function getTournamentStatisticsService(
    tournamentId
) {

    const [
        tournament,
        matches,
        totalTeams,
        totalPlayers,
        highestScore,
        lowestScore,
        topRunScorer,
        topWicketTaker
    ] = await Promise.all([

        getTournamentStatistics(tournamentId),

        getTournamentMatchesCount(tournamentId),

        getTournamentTeamsCount(tournamentId),

        getTournamentPlayersCount(tournamentId),

        getHighestTeamScore(tournamentId),

        getLowestTeamScore(tournamentId),

        getTopRunScorer(tournamentId),

        getTopWicketTaker(tournamentId)

    ]);

    if (!tournament) {
        throw new Error("Tournament not found.");
    }

    return toTournamentStatistics({

            tournament,

            matches,

            teams: {
                total: totalTeams
            },

            players: {
                total: totalPlayers
            },

            batting: {

                highestTeamScore: highestScore,

                lowestTeamScore: lowestScore,

                topRunScorer

            },

            bowling: {

                topWicketTaker

            }

    });
}