import {
    createManyPlayingXI,
    countPlayingXI,
    getPlayersByIds
} from "../repositories/playingXI.repository.js";


export async function createPlayingXIService(
    matchId,
    teamId,
    players
) {

    const existingPlayers = await countPlayingXI(
        matchId,
        teamId
    );

    if (existingPlayers > 0) {
        throw new Error(
            "Playing XI already exists for this team."
        );
    }
    const playerIds = players.map(player => player.playerId);

    const uniquePlayerIds = new Set(playerIds);

    if (uniquePlayerIds.size !== playerIds.length) {
        throw new Error("Duplicate players are not allowed in Playing XI.");
    }

    const captains = players.filter(player => player.isCaptain);

    if (captains.length !== 1) {
        throw new Error("Playing XI must have exactly one captain.");
    }


    const battingOrders = players.map(player => player.battingOrder);

    const uniqueBattingOrders = new Set(battingOrders);

    if (uniqueBattingOrders.size !== battingOrders.length) {
        throw new Error("Batting order must be unique.");
    }


    const wicketKeepers = players.filter(
        player => player.isWicketKeeper
    );

    if (wicketKeepers.length > 1) {
        throw new Error(
            "Playing XI can have only one wicketkeeper."
        );
    }

    const teamPlayers = await getPlayersByIds(playerIds);

    if (teamPlayers.length !== playerIds.length) {
        throw new Error("One or more selected players do not exist.");
    }

    const invalidPlayers = teamPlayers.filter(
        player => player.teamId !== teamId
    );

    if (invalidPlayers.length > 0) {
        throw new Error(
            "One or more selected players do not belong to the selected team."
        );
    }

    const playingXIData = players.map((player) => ({
        matchId,
        teamId,
        playerId: player.playerId,
        battingOrder: player.battingOrder,
        isCaptain: player.isCaptain ?? false,
        isWicketKeeper: player.isWicketKeeper ?? false,
        isSubstitute: player.isSubstitute ?? false,
        isImpactPlayer: player.isImpactPlayer ?? false
    }));

    await createManyPlayingXI(playingXIData);

    return {
        message: "Playing XI created successfully."
    };

}
