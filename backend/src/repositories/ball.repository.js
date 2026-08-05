import prisma from "../config/db.js";

/*
|--------------------------------------------------------------------------
| Create Ball
|--------------------------------------------------------------------------
*/

// temporilly
export async function createBall(data, db = prisma) {

    return await db.ball.create({

        data: {

            innings: {
                connect: {
                    id: data.inningsId
                }
            },

            batsman: {
                connect: {
                    id: data.batsmanId
                }
            },

            nonStriker: {
                connect: {
                    id: data.nonStrikerId
                }
            },

            bowler: {
                connect: {
                    id: data.bowlerId
                }
            },

            dismissedPlayer: data.dismissedPlayerId
                ? {
                    connect: {
                        id: data.dismissedPlayerId
                    }
                }
                : undefined,

            fielder: data.fielderId
                ? {
                    connect: {
                        id: data.fielderId
                    }
                }
                : undefined,

            deliveryNumber: data.deliveryNumber,
            over: data.over,
            ball: data.ball,
            batRuns: data.batRuns,
            extraRuns: data.extraRuns,
            totalRuns: data.totalRuns,
            extraType: data.extraType,
            isLegalDelivery: data.isLegalDelivery,
            isBoundaryFour: data.isBoundaryFour,
            isBoundarySix: data.isBoundarySix,
            isWicket: data.isWicket,
            wicketType: data.wicketType,
            commentary: data.commentary
        },

        include: {
            innings: true,
            batsman: true,
            nonStriker: true,
            bowler: true
        }

    });

}
/*
|--------------------------------------------------------------------------
| Get All Balls
|--------------------------------------------------------------------------
*/

export async function getAllBalls(db=prisma) {

    return await db.ball.findMany({

        orderBy: [

            {
                deliveryNumber: "asc"
            }

        ],

        include: {

            batsman: true,

            nonStriker: true,

            bowler: true,

            dismissedPlayer: true,

            fielder: true

        }

    });

}

/*
|--------------------------------------------------------------------------
| Get Ball By ID
|--------------------------------------------------------------------------
*/

export async function getBallById(id,db=prisma) {

    return await db.ball.findUnique({

        where: {

            id

        },

        include: {

            batsman: true,

            nonStriker: true,

            bowler: true,

            innings: true,

            dismissedPlayer: true,

            fielder: true

        }

    });

}

/*
|--------------------------------------------------------------------------
| Get Balls By Innings
|--------------------------------------------------------------------------
*/

export async function getBallsByInnings(inningsId,db=prisma) {

    return await db.ball.findMany({

        where: {

            inningsId

        },

        orderBy: [

            {
                deliveryNumber: "asc"
            }

        ],

        include: {

            batsman: true,

            nonStriker: true,

            bowler: true,

            dismissedPlayer: true,

            fielder: true

        }

    });

}

export async function getRecentBalls(inningsId, limit = 6, db = prisma) {
    return await db.ball.findMany({
        where: {
            inningsId
        },
        orderBy: {
            deliveryNumber: "desc"
        },
        take: limit,
        include: {
            batsman: true,
            nonStriker: true,
            bowler: true,
            dismissedPlayer: true,
            fielder: true
        }
    });
}

/*
|--------------------------------------------------------------------------
| Get Last Ball
|--------------------------------------------------------------------------
*/

export async function getLastBall(inningsId,db = prisma) {

    return await db.ball.findFirst({
        where: {

            inningsId

        },

        orderBy: {

            deliveryNumber: "desc"

        }

    });

}

/*
|--------------------------------------------------------------------------
| Update Ball
|--------------------------------------------------------------------------
*/

export async function updateBall(id, data,db=prisma) {

    return await db.ball.update({

        where: {

            id

        },

        data,

        include: {

            batsman: true,

            nonStriker: true,

            bowler: true

        }

    });

}

/*
|--------------------------------------------------------------------------
| Delete Ball
|--------------------------------------------------------------------------
*/

export async function deleteBall(id,db=prisma) {

    return await db.ball.delete({

        where: {

            id

        }

    });

}

/*
|--------------------------------------------------------------------------
| Count Legal Deliveries
|--------------------------------------------------------------------------
*/

export async function countLegalDeliveries(inningsId,db=prisma) {

    return await db.ball.count({

        where: {

            inningsId,

            isLegalDelivery: true

        }

    });

}

/*
|--------------------------------------------------------------------------
| Count Total Deliveries
|--------------------------------------------------------------------------
*/

export async function countDeliveries(inningsId,db=prisma) {

    return await db.ball.count({

        where: {

            inningsId

        }

    });

}

// new function for commentry

export async function getCommentaryByInnings(inningsId) {

    return await prisma.ball.findMany({
        where: {
            inningsId
        },
        select: {
            id: true,
            over: true,
            ball: true,
            commentary: true,
            batRuns: true,
            extraRuns: true,
            totalRuns: true,
            extraType: true,
            isWicket: true,
            wicketType: true,
            createdAt: true,

            batsman: {
                select: {
                    firstName: true,
                    lastName: true
                }
            },

            bowler: {
                select: {
                    firstName: true,
                    lastName: true
                }
            }
        },
        orderBy: [
            {
                over: "desc"
            },
            {
                ball: "desc"
            }
        ]
    });

}