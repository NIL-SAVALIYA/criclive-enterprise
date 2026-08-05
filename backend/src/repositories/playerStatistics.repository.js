import prisma from "../config/db.js";

/*
|--------------------------------------------------------------------------
| Player Statistics Repository
|--------------------------------------------------------------------------
*/

export async function getPlayerProfile(
    playerId,
    db = prisma
) {
    return await db.player.findUnique({
        where: {
            id: playerId
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            jerseyNumber: true,
            playerType: true,

            team: {
                select: {
                    id: true,
                    name: true,
                    shortName: true,
                    logoUrl: true
                }
            }
        }
    });
}

export async function getMatchesPlayed(
    playerId,
    db = prisma
) {
    return await db.playingXI.count({
        where: {
            playerId
        }
    });
}

export async function getBattingStatistics(
    playerId,
    db = prisma
) {
    return await db.battingScorecard.aggregate({

        where: {
            playerId
        },

        _sum: {
            runs: true,
            balls: true,
            fours: true,
            sixes: true
        },

        _avg: {
            strikeRate: true
        },

        _max: {
            runs: true
        },

        _count: {
            id: true
        }

    });
}

export async function getBattingMilestones(
    playerId,
    db = prisma
) {
    const innings = await db.battingScorecard.findMany({
        where: {
            playerId
        },
        select: {
            runs: true,
            isOut: true
        }
    });

    let fifties = 0;
    let hundreds = 0;
    let notOuts = 0;

    for (const inning of innings) {

        if (!inning.isOut) {
            notOuts++;
        }

        if (inning.runs >= 100) {
            hundreds++;
        } else if (inning.runs >= 50) {
            fifties++;
        }

    }

    return {
        fifties,
        hundreds,
        notOuts
    };
}

export async function getBowlingStatistics(
    playerId,
    db = prisma
) {
    return await db.bowlingScorecard.aggregate({

        where: {
            bowlerId: playerId
        },

        _sum: {
            balls: true,
            runs: true,
            wickets: true,
            maidens: true,
            wides: true,
            noBalls: true
        },

        _avg: {
            economy: true
        },

        _max: {
            wickets: true
        },

        _count: {
            id: true
        }

    });
}

export async function getBestBowling(
    playerId,
    db = prisma
) {
    const spells = await db.bowlingScorecard.findMany({
        where: {
            bowlerId: playerId
        },
        select: {
            wickets: true,
            runs: true
        }
    });

    let best = null;

    for (const spell of spells) {

        if (
            !best ||
            spell.wickets > best.wickets ||
            (
                spell.wickets === best.wickets &&
                spell.runs < best.runs
            )
        ) {
            best = spell;
        }

    }

    return best;
}

export async function getFieldingStatistics(
    playerId,
    db = prisma
) {

    const [
        catches,
        runOuts,
        stumpings
    ] = await Promise.all([

        db.battingScorecard.count({
            where: {
                fielderId: playerId,
                dismissalType: "CAUGHT"
            }
        }),

        db.battingScorecard.count({
            where: {
                fielderId: playerId,
                dismissalType: "RUN_OUT"
            }
        }),

        db.battingScorecard.count({
            where: {
                fielderId: playerId,
                dismissalType: "STUMPED"
            }
        })

    ]);

    return {
        catches,
        runOuts,
        stumpings
    };
}

export async function getBowlingMilestones(
    playerId,
    db = prisma
) {
    const spells = await db.bowlingScorecard.findMany({
        where: { bowlerId: playerId },
        select: { wickets: true }
    });

    let threeWickets = 0;
    let fiveWickets = 0;

    for (const spell of spells) {
        if (spell.wickets >= 5) {
            fiveWickets++;
        } else if (spell.wickets >= 3) {
            threeWickets++;
        }
    }

    return {
        threeWickets,
        fiveWickets
    };
}

export async function getFormatStatistics(
    playerId,
    format,
    db = prisma
) {
    const batting = await db.battingScorecard.aggregate({
        where: {
            playerId,
            innings: { match: { tournament: { format } } }
        },
        _sum: { runs: true, balls: true, fours: true, sixes: true },
        _max: { runs: true },
        _count: { id: true }
    });

    const bowling = await db.bowlingScorecard.aggregate({
        where: {
            bowlerId: playerId,
            innings: { match: { tournament: { format } } }
        },
        _sum: { balls: true, runs: true, wickets: true, maidens: true },
        _max: { wickets: true },
        _count: { id: true }
    });

    return {
        format,
        batting: {
            innings: batting._count.id ?? 0,
            runs: batting._sum.runs ?? 0,
            highestScore: batting._max.runs ?? 0,
            fours: batting._sum.fours ?? 0,
            sixes: batting._sum.sixes ?? 0
        },
        bowling: {
            innings: bowling._count.id ?? 0,
            wickets: bowling._sum.wickets ?? 0,
            runs: bowling._sum.runs ?? 0,
            overs: Math.floor((bowling._sum.balls ?? 0) / 6)
        }
    };
}