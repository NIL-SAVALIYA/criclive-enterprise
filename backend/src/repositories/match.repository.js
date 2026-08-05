import prisma from "../config/db.js";

export async function createMatch(data,db=prisma) {
    return db.match.create({
        data,
        include: {
            teamA: true,
            teamB: true,
            tossWinner: true
        }
    });
}

export async function getAllMatches(db=prisma) {
    return db.match.findMany({
        include: {
            teamA: true,
            teamB: true,
            tossWinner: true
        },
        orderBy: {
            matchDate: "asc"
        }
    });
}

/*
|--------------------------------------------------------------------------
| Get Live Matches
|--------------------------------------------------------------------------
*/

export async function getLiveMatches(db = prisma) {
    return db.match.findMany({
        where: {
            status: "LIVE"
        },
        select: {
            id: true,
            status: true,
            matchDate: true,
            venue: true,

            teamA: {
                select: {
                    id: true,
                    name: true,
                    shortName: true,
                    logoUrl: true
                }
            },

            teamB: {
                select: {
                    id: true,
                    name: true,
                    shortName: true,
                    logoUrl: true
                }
            },

            tossWinner: {
                select: {
                    id: true,
                    name: true,
                    shortName: true
                }
            }
        },
        orderBy: {
            matchDate: "asc"
        }
    });
}

/*
|--------------------------------------------------------------------------
| Get Upcoming Matches
|--------------------------------------------------------------------------
*/

export async function getUpcomingMatches(db = prisma) {
    return db.match.findMany({
        where: {
            status: "UPCOMING"
        },
        select: {
            id: true,
            status: true,
            matchDate: true,
            venue: true,

            teamA: {
                select: {
                    id: true,
                    name: true,
                    shortName: true,
                    logoUrl: true
                }
            },

            teamB: {
                select: {
                    id: true,
                    name: true,
                    shortName: true,
                    logoUrl: true
                }
            },

            tossWinner: {
                select: {
                    id: true,
                    name: true,
                    shortName: true
                }
            }
        },
        orderBy: {
            matchDate: "asc"
        }
    });
}

/*
|--------------------------------------------------------------------------
| Get Completed Matches
|--------------------------------------------------------------------------
*/

export async function getCompletedMatches(db = prisma) {
    return db.match.findMany({
        where: {
            status: "COMPLETED"
        },

        select: {
            id: true,
            status: true,
            matchDate: true,
            venue: true,

            teamA: {
                select: {
                    id: true,
                    name: true,
                    shortName: true,
                    logoUrl: true
                }
            },

            teamB: {
                select: {
                    id: true,
                    name: true,
                    shortName: true,
                    logoUrl: true
                }
            },

            tossWinner: {
                select: {
                    id: true,
                    name: true,
                    shortName: true
                }
            },

            winnerTeam: {
                select: {
                    id: true,
                    name: true,
                    shortName: true
                }
            }
        },
        orderBy: {
            completedAt: "desc"
        }
    });
}

export async function getMatchById(id,db=prisma) {
    return db.match.findUnique({
        where: { id },
        include: {
            teamA: true,
            teamB: true,
            tossWinner: true
        }
    });
}

export async function updateMatch(id, data,db=prisma) {
    return db.match.update({
        where: { id },
        data,
        include: {
            teamA: true,
            teamB: true,
            tossWinner: true
        }
    });
}

export async function deleteMatch(id,db=prisma) {
    return db.match.delete({
        where: { id }
    });
}

//

/*
|--------------------------------------------------------------------------
| Create Multiple Matches
|--------------------------------------------------------------------------
*/

export async function createManyMatches(data,db=prisma) {

    return db.match.createMany({

        data

    });

}

/*
|--------------------------------------------------------------------------
| Get Matches By Tournament
|--------------------------------------------------------------------------
*/

export async function getMatchesByTournament(tournamentId,db=prisma) {

    return  db.match.findMany({

        where: {
            tournamentId
        },

        include: {

            tournament: true,

            teamA: {
                select: {
                    id: true,
                    name: true,
                    shortName: true
                }
            },

            teamB: {
                select: {
                    id: true,
                    name: true,
                    shortName: true
                }
            },

            tossWinner: {
                select: {
                    id: true,
                    name: true,
                    shortName: true
                }
            }

        },

        orderBy: {
            matchDate: "asc"
        }

    });

}

/*
|--------------------------------------------------------------------------
| Count Matches By Tournament
|--------------------------------------------------------------------------
*/

export async function countMatchesByTournament(tournamentId,db=prisma) {

    return db.match.count({

        where: {
            tournamentId
        }

    });

}