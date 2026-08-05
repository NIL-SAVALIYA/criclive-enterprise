export function toTournamentStatistics(data) {

    return {

        tournament: {
            id: data.tournament.id,
            name: data.tournament.name,
            description: data.tournament.description,
            format: data.tournament.format,
            status: data.tournament.status,
            startDate: data.tournament.startDate,
            endDate: data.tournament.endDate
        },

        matches: data.matches,

        teams: data.teams,

        players: data.players,

        batting: {

            highestTeamScore: data.batting.highestTeamScore,

            lowestTeamScore: data.batting.lowestTeamScore,

            topRunScorer: data.batting.topRunScorer

        },

        bowling: {

            topWicketTaker: data.bowling.topWicketTaker

        }

    };

}