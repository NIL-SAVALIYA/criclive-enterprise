import prisma from "../config/db.js";
import {
    createManyPlayingXI,
    countPlayingXI,
    getPlayersByIds,
    getPlayingXIByMatch,
    deletePlayingXIByTeam
} from "../repositories/playingXI.repository.js";
import { getMatchById } from "../repositories/match.repository.js";
import { Roles } from "../constants/roles.js";

export async function getPlayingXIService(matchId) {
    const match = await getMatchById(matchId);

    if (!match) {
        const error = new Error("Match not found.");
        error.status = 404;
        error.statusCode = 404;
        throw error;
    }

    const playingXI = await getPlayingXIByMatch(matchId);

    const formattedPlayers = playingXI.map((p) => ({
        id: p.id,
        matchId: p.matchId,
        teamId: p.teamId,
        playerId: p.playerId,
        battingOrder: p.battingOrder,
        isCaptain: p.isCaptain,
        isWicketKeeper: p.isWicketKeeper,
        isSubstitute: p.isSubstitute,
        isImpactPlayer: p.isImpactPlayer,
        player: p.player ? {
            id: p.player.id,
            firstName: p.player.firstName,
            lastName: p.player.lastName,
            jerseyNumber: p.player.jerseyNumber,
            playerType: p.player.playerType,
            battingStyle: p.player.battingStyle,
            bowlingStyle: p.player.bowlingStyle
        } : null,
        team: p.team ? {
            id: p.team.id,
            name: p.team.name,
            shortName: p.team.shortName
        } : null
    }));

    const teamAPlayers = formattedPlayers.filter((p) => p.teamId === match.teamAId);
    const teamBPlayers = formattedPlayers.filter((p) => p.teamId === match.teamBId);

    return {
        matchId: match.id,
        teamA: {
            teamId: match.teamAId,
            players: teamAPlayers
        },
        teamB: {
            teamId: match.teamBId,
            players: teamBPlayers
        },
        playingXI: formattedPlayers
    };
}

export async function createPlayingXIService(
    matchId,
    teamId,
    players,
    user = null
) {
    const match = await getMatchById(matchId);

    if (!match) {
        const error = new Error("Match not found.");
        error.status = 404;
        error.statusCode = 404;
        throw error;
    }

    // Role-based scope verification
    if (user && user.role !== Roles.ADMIN && user.role !== Roles.SUPER_ADMIN) {
        if (user.role === Roles.TEAM_MANAGER) {
            const team = await prisma.team.findUnique({ where: { id: teamId } });
            if (!team || team.managerId !== user.userId) {
                const error = new Error("Access denied. You can only submit Playing XI for your assigned team.");
                error.status = 403;
                error.statusCode = 403;
                throw error;
            }
        } else if (user.role === Roles.ORGANIZER) {
            if (match.tournament?.organizerId && match.tournament.organizerId !== user.userId) {
                const error = new Error("Access denied. You can only manage Playing XI for tournaments you organize.");
                error.status = 403;
                error.statusCode = 403;
                throw error;
            }
        } else if (user.role === Roles.SCORER) {
            if (match.scorerId && match.scorerId !== user.userId) {
                const error = new Error("Access denied. You are not assigned to score this match.");
                error.status = 403;
                error.statusCode = 403;
                throw error;
            }
        }
    }

    if (teamId !== match.teamAId && teamId !== match.teamBId) {
        const error = new Error("Selected team is not part of this match.");
        error.status = 400;
        error.statusCode = 400;
        throw error;
    }

    if (match.status !== "UPCOMING") {
        const error = new Error(`Cannot set Playing XI for a match with status '${match.status}'.`);
        error.status = 400;
        error.statusCode = 400;
        throw error;
    }

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

export async function updatePlayingXIService(
    matchId,
    teamId,
    players,
    user = null
) {
    const match = await getMatchById(matchId);

    if (!match) {
        const error = new Error("Match not found.");
        error.status = 404;
        error.statusCode = 404;
        throw error;
    }

    // Role-based scope verification
    if (user && user.role !== Roles.ADMIN && user.role !== Roles.SUPER_ADMIN) {
        if (user.role === Roles.TEAM_MANAGER) {
            const team = await prisma.team.findUnique({ where: { id: teamId } });
            if (!team || team.managerId !== user.userId) {
                const error = new Error("Access denied. You can only submit Playing XI for your assigned team.");
                error.status = 403;
                error.statusCode = 403;
                throw error;
            }
        } else if (user.role === Roles.ORGANIZER) {
            if (match.tournament?.organizerId && match.tournament.organizerId !== user.userId) {
                const error = new Error("Access denied. You can only manage Playing XI for tournaments you organize.");
                error.status = 403;
                error.statusCode = 403;
                throw error;
            }
        } else if (user.role === Roles.SCORER) {
            if (match.scorerId && match.scorerId !== user.userId) {
                const error = new Error("Access denied. You are not assigned to score this match.");
                error.status = 403;
                error.statusCode = 403;
                throw error;
            }
        }
    }

    if (teamId !== match.teamAId && teamId !== match.teamBId) {
        const error = new Error("Selected team is not part of this match.");
        error.status = 400;
        error.statusCode = 400;
        throw error;
    }

    if (match.status !== "UPCOMING") {
        const error = new Error(`Cannot modify Playing XI for a match with status '${match.status}'.`);
        error.status = 400;
        error.statusCode = 400;
        throw error;
    }

    const playerIds = players.map(player => player.playerId);

    const uniquePlayerIds = new Set(playerIds);

    if (uniquePlayerIds.size !== playerIds.length) {
        const error = new Error("Duplicate players are not allowed in Playing XI.");
        error.status = 400;
        error.statusCode = 400;
        throw error;
    }

    const captains = players.filter(player => player.isCaptain);

    if (captains.length !== 1) {
        const error = new Error("Playing XI must have exactly one captain.");
        error.status = 400;
        error.statusCode = 400;
        throw error;
    }

    const battingOrders = players.map(player => player.battingOrder);

    const uniqueBattingOrders = new Set(battingOrders);

    if (uniqueBattingOrders.size !== battingOrders.length) {
        const error = new Error("Batting order must be unique.");
        error.status = 400;
        error.statusCode = 400;
        throw error;
    }

    const wicketKeepers = players.filter(
        player => player.isWicketKeeper
    );

    if (wicketKeepers.length > 1) {
        const error = new Error("Playing XI can have only one wicketkeeper.");
        error.status = 400;
        error.statusCode = 400;
        throw error;
    }

    const teamPlayers = await getPlayersByIds(playerIds);

    if (teamPlayers.length !== playerIds.length) {
        const error = new Error("One or more selected players do not exist.");
        error.status = 400;
        error.statusCode = 400;
        throw error;
    }

    const invalidPlayers = teamPlayers.filter(
        player => player.teamId !== teamId
    );

    if (invalidPlayers.length > 0) {
        const error = new Error("One or more selected players do not belong to the selected team.");
        error.status = 400;
        error.statusCode = 400;
        throw error;
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

    await prisma.$transaction(async (tx) => {
        await deletePlayingXIByTeam(matchId, teamId, tx);
        await createManyPlayingXI(playingXIData, tx);
    });

    return {
        message: "Playing XI updated successfully."
    };
}
