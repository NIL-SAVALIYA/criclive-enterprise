export function calculatePoints({
    won = 0,
    tied = 0,
    noResult = 0
}) {
    return (won * 2) + tied + noResult;
}

export function calculateNetRunRate({
    runsScored = 0,
    ballsFaced = 0,
    runsConceded = 0,
    ballsBowled = 0
}) {
    if (ballsFaced === 0 && ballsBowled === 0) {
        return 0;
    }

    const oversFaced = ballsFaced > 0 ? (ballsFaced / 6) : 0;
    const oversBowled = ballsBowled > 0 ? (ballsBowled / 6) : 0;

    const forRate = oversFaced > 0 ? (runsScored / oversFaced) : 0;
    const againstRate = oversBowled > 0 ? (runsConceded / oversBowled) : 0;

    const nrr = forRate - againstRate;

    return Number(nrr.toFixed(3));
}

export function buildPointsTableSummary({
    team,
    played,
    won,
    lost,
    tied,
    noResult,
    runsScored,
    ballsFaced,
    runsConceded,
    ballsBowled
}) {
    const points = calculatePoints({
        won,
        tied,
        noResult
    });

    const netRunRate = calculateNetRunRate({
        runsScored,
        ballsFaced,
        runsConceded,
        ballsBowled
    });

    return {
        teamId: team.id,

        team,

        played,

        won,

        lost,

        tied,

        noResult,

        points,

        runsScored,

        ballsFaced,

        runsConceded,

        ballsBowled,

        netRunRate
    };
}

export function sortStandings(standings) {
    return [...standings].sort((a, b) => {

        if (b.points !== a.points) {
            return b.points - a.points;
        }

        if (b.netRunRate !== a.netRunRate) {
            return b.netRunRate - a.netRunRate;
        }

        if (b.won !== a.won) {
            return b.won - a.won;
        }

        return a.team.name.localeCompare(b.team.name);
    });
}

export function assignPositions(standings) {
    return standings.map((team, index) => ({
        ...team,
        position: index + 1
    }));
}