import prisma from "../config/db.js";

/*
|--------------------------------------------------------------------------
| Create Innings
|--------------------------------------------------------------------------
*/

export async function createInnings(data, db = prisma) {

    return db.innings.create({

        data,

        include: {

            match: true,

            battingTeam: true,

            bowlingTeam: true

        }

    });
}

/*
|--------------------------------------------------------------------------
| Get All Innings
|--------------------------------------------------------------------------
*/

export async function getAllInnings( db = prisma) {

    return db.innings.findMany({

        include: {

            match: true,

            battingTeam: true,

            bowlingTeam: true

        },

        orderBy: {

            inningsNumber: "asc"

        }

    });

}

/*
|--------------------------------------------------------------------------
| Get Innings By ID
|--------------------------------------------------------------------------
*/

export async function getInningsById(id, db = prisma) {

    return db.innings.findUnique({

        where: {

            id

        },

        include: {

            match: true,

            battingTeam: true,

            bowlingTeam: true

        }

    });

}

/*
|--------------------------------------------------------------------------
| Update Innings
|--------------------------------------------------------------------------
*/

export async function updateInnings(id, data, db = prisma) {

    return db.innings.update({

        where: {

            id

        },

        data,

        include: {

            match: true,

            battingTeam: true,

            bowlingTeam: true

        }

    });

}

/*
|--------------------------------------------------------------------------
| Delete Innings
|--------------------------------------------------------------------------
*/

export async function deleteInnings(id, db = prisma) {

    return db.innings.delete({

        where: {

            id

        }

    });

}

/*
|--------------------------------------------------------------------------
| Get Innings By Match ID
|--------------------------------------------------------------------------
*/

export async function getInningsByMatch(matchId, db = prisma) {

    return db.innings.findMany({

        where: {

            matchId

        },

        include: {

            battingTeam: true,

            bowlingTeam: true

        },

        orderBy: {

            inningsNumber: "asc"

        }

    });

}

export async function getLiveInnings(matchId, db = prisma) {
    return await db.innings.findFirst({
        where: {
            matchId,
            status: "LIVE"
        },
        include: {
            battingTeam: true,
            bowlingTeam: true,
            match: true
        }
    });
}

/*
|--------------------------------------------------------------------------
| Complete Innings
|--------------------------------------------------------------------------
*/

export async function completeInnings(id, db = prisma) {

    return db.innings.update({

        where: {
            id
        },

        data: {
            status: "COMPLETED"
        },

        include: {

            match: true,

            battingTeam: true,

            bowlingTeam: true

        }

    });

}