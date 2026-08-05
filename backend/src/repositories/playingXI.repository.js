import prisma from "../config/db.js";

const playingXIInclude = {

    match: true,
    player: true,
    team: true
};

export async function createPlayingXI(data,db = prisma) {

    return await db.playingXI.create({
        data,
        include: playingXIInclude
    });
}

export async function createManyPlayingXI( data,db = prisma) {

    return await db.playingXI.createMany({
        data
    });
}

export async function getAllPlayingXI( db = prisma) {

    return await db.playingXI.findMany({

        include: playingXIInclude,

        orderBy: [

            {
                battingOrder: "asc"
            }
        ]
    });
}

export async function getPlayingXIById(id, db = prisma) {

    return await db.playingXI.findUnique({
        where: {
            id
        },
        include: playingXIInclude
    });
}

export async function getPlayingXIByMatch(matchId,db = prisma) {

    return await db.playingXI.findMany({
        where: {
            matchId
        },
        include: playingXIInclude,
        orderBy: {
            battingOrder: "asc"
        }
    });
}

export async function getPlayingXIByTeam( matchId, teamId, db = prisma) {

    return await db.playingXI.findMany({

        where: {
            matchId,
            teamId
        },
        include: playingXIInclude,
        orderBy: {
            battingOrder: "asc"
        }
    });
}

export async function getPlayingXIPlayer( matchId, playerId, db = prisma) {

    return await db.playingXI.findFirst({

        where: {
            matchId,
            playerId
        },
        include: playingXIInclude
    });
}

export async function getCaptain( matchId, teamId, db = prisma) {

    return await db.playingXI.findFirst({

        where: {
            matchId,
            teamId,
            isCaptain: true
        },
        include: playingXIInclude
    });
}

export async function getWicketKeeper( matchId, teamId, db = prisma) {

    return await db.playingXI.findFirst({

        where: {
            matchId,
            teamId,
            isWicketKeeper: true
        },
        include: playingXIInclude
    });
}

export async function getImpactPlayer(matchId,teamId,db = prisma) {

    return await db.playingXI.findFirst({

        where: {
            matchId,
            teamId,
            isImpactPlayer: true
        },
        include: playingXIInclude
    });
}

export async function getSubstitutes( matchId,teamId, db = prisma) {

    return await db.playingXI.findMany({

        where: {
            matchId,
            teamId,
            isSubstitute: true
        },
        include: playingXIInclude,
        orderBy: {
            battingOrder: "asc"
        }
    });
}

export async function updatePlayingXI( id,data,db = prisma) {

    return await db.playingXI.update({

        where: {
            id
        },
        data,
        include: playingXIInclude
    });
}

export async function deletePlayingXI(id,db = prisma) {

    return await db.playingXI.delete({

        where: {
          id
        }
    });
}

export async function deletePlayingXIByMatch(matchId, db = prisma) {

    return await db.playingXI.deleteMany({

        where: {
            matchId
        }
    });
}

export async function existsPlayingXIPlayer( matchId, playerId,db = prisma) {

    const player = await db.playingXI.findFirst({

        where: {
            matchId,
            playerId
        },
        select: {
            id: true
        }
    });
    return !!player;
}

export async function countPlayingXI( matchId,teamId,db = prisma) {

    return await db.playingXI.count({

        where: {
            matchId,
            teamId,
            isSubstitute: false
        }
    });
}


export async function getPlayersByIds(playerIds,db=prisma) {
    return db.player.findMany({
        where: {
            id: {
                in: playerIds
            }
        },
        select: {
            id: true,
            teamId: true
        }
    });
}