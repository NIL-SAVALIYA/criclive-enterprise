import prisma from "../config/db.js";
import { InningsStatus,MatchStatus } from "@prisma/client";

/*
|--------------------------------------------------------------------------
| Tournament Statistics Repository
|--------------------------------------------------------------------------
*/

export async function getTournamentStatistics(
    tournamentId,
    db = prisma
) {
    return await db.tournament.findUnique({
        where: {
            id: tournamentId
        },
        select: {
            id: true,
            name: true,
            description: true,
            format: true,
            status: true,
            startDate: true,
            endDate: true
        }
    });
}

export async function getTournamentMatchesCount(
    tournamentId,
    db = prisma
) {

    const [
        total,
        completed,
        live,
        upcoming
    ] = await Promise.all([

        db.match.count({
            where: {
                tournamentId
            }
        }),

        db.match.count({
            where: {
                tournamentId,
                status: MatchStatus.COMPLETED
            }
        }),

        db.match.count({
            where: {
                tournamentId,
                status: MatchStatus.LIVE
            }
        }),

        db.match.count({
            where: {
                tournamentId,
                status: MatchStatus.UPCOMING
            }
        })

    ]);

    return {
        total,
        completed,
        live,
        upcoming
    };
}

export async function getTournamentTeamsCount(
    tournamentId,
    db = prisma
) {
    return await db.tournamentTeam.count({
        where: {
            tournamentId
        }
    });
}

export async function getTournamentPlayersCount(
    tournamentId,
    db = prisma
) {
    return await db.player.count({
        where: {
            team: {
                tournaments: {
                    some: {
                        tournamentId
                    }
                }
            }
        }
    });
}


export async function getHighestTeamScore(
    tournamentId,
    db = prisma
) {
    return await db.innings.findFirst({
        where: {
            match: {
                tournamentId
            }
        },
        orderBy: {
            totalRuns: "desc"
        },
        select: {
            totalRuns: true,
            wickets: true,
            overs: true,
            battingTeam: {
                select: {
                    id: true,
                    name: true,
                    shortName: true
                }
            },
            match: {
                select: {
                    id: true
                }
            }
        }
    });
}


export async function getLowestTeamScore(
    tournamentId,
    db = prisma
) {
    return await db.innings.findFirst({
        where: {
            match: {
                tournamentId
            },
            status: InningsStatus.COMPLETED
        },
        orderBy: {
            totalRuns: "asc"
        },
        select: {
            totalRuns: true,
            wickets: true,
            overs: true,
            battingTeam: {
                select: {
                    id: true,
                    name: true,
                    shortName: true
                }
            },
            match: {
                select: {
                    id: true
                }
            }
        }
    });
}

export async function getTopRunScorer(
    tournamentId,
    db = prisma
) {
    const result = await db.battingScorecard.groupBy({
        by: ["playerId"],

        where: {
            innings: {
                match: {
                    tournamentId
                }
            }
        },

        _sum: {
            runs: true
        },

        orderBy: {
            _sum: {
                runs: "desc"
            }
        },

        take: 1
    });

    if (!result.length) {
        return null;
    }

    const player = await db.player.findUnique({
        where: {
            id: result[0].playerId
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            team: {
                select: {
                    id: true,
                    name: true,
                    shortName: true
                }
            }
        }
    });

    return {
        ...player,
        runs: result[0]._sum.runs
    };
}

export async function getTopWicketTaker(
    tournamentId,
    db = prisma
) {
    const result = await db.bowlingScorecard.groupBy({
        by: ["bowlerId"],

        where: {
            innings: {
                match: {
                    tournamentId
                }
            }
        },

        _sum: {
            wickets: true
        },

        orderBy: {
            _sum: {
                wickets: "desc"
            }
        },

        take: 1
    });

    if (!result.length) {
        return null;
    }

    const player = await db.player.findUnique({
        where: {
            id: result[0].bowlerId
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            team: {
                select: {
                    id: true,
                    name: true,
                    shortName: true
                }
            }
        }
    });

    return {
        ...player,
        wickets: result[0]._sum.wickets
    };
}
