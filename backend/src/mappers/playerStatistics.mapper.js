export function toPlayerStatistics(data) {

    return {

        player: {
            id: data.player.id,
            firstName: data.player.firstName,
            lastName: data.player.lastName,
            jerseyNumber: data.player.jerseyNumber,
            role: data.player.role,

            team: data.player.team
                ? {
                      id: data.player.team.id,
                      name: data.player.team.name,
                      shortName: data.player.team.shortName,
                      logoUrl: data.player.team.logoUrl
                  }
                : null
        },

        batting: data.batting,

        bowling: data.bowling,

        fielding: data.fielding

    };
}