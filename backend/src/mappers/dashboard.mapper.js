export function toDashboardMatch(match) {
    return {
        id: match.id,
        status: match.status,
        matchDate: match.matchDate,
        venue: match.venue,

        teamA: {
            id: match.teamA.id,
            name: match.teamA.name,
            shortName: match.teamA.shortName,
            logo: match.teamA.logoUrl
        },

        teamB: {
            id: match.teamB.id,
            name: match.teamB.name,
            shortName: match.teamB.shortName,
            logo: match.teamB.logoUrl
        },

        tossWinner: match.tossWinner
            ? {
                  id: match.tossWinner.id,
                  name: match.tossWinner.name,
                  shortName: match.tossWinner.shortName
              }
            : null,

        winner: match.winnerTeam
            ? {
                  id: match.winnerTeam.id,
                  name: match.winnerTeam.name,
                  shortName: match.winnerTeam.shortName
              }
            : null
    };
}