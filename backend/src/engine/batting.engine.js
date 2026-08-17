/*
|--------------------------------------------------------------------------
| batting.engine.js
|--------------------------------------------------------------------------
|
| Handles:
| - Individual Batting Score
| - Strike Rate
| - Boundaries
| - Balls Faced
| - Dismissals
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Calculate Runs
|--------------------------------------------------------------------------
*/

export function calculateRuns({

    currentRuns,

    batRuns

}) {

    return currentRuns + batRuns;

}

/*
|--------------------------------------------------------------------------
| Balls Faced
|--------------------------------------------------------------------------
|
| Wides do NOT count.
|--------------------------------------------------------------------------
*/

export function calculateBalls({

    currentBalls,

    extraType

}) {

    // Wides, Byes and Leg Byes do not count as batsman balls faced
    if (
        extraType === "WIDE" ||
        extraType === "BYE" ||
        extraType === "LEG_BYE"
    ) {

        return currentBalls;

    }

    return currentBalls + 1;

}

/*
|--------------------------------------------------------------------------
| Fours
|--------------------------------------------------------------------------
*/

export function calculateFours({

    currentFours,

    batRuns

}) {

    return batRuns === 4

        ? currentFours + 1

        : currentFours;

}

/*
|--------------------------------------------------------------------------
| Sixes
|--------------------------------------------------------------------------
*/

export function calculateSixes({

    currentSixes,

    batRuns

}) {

    return batRuns === 6

        ? currentSixes + 1

        : currentSixes;

}

/*
|--------------------------------------------------------------------------
| Strike Rate
|--------------------------------------------------------------------------
*/

export function calculateStrikeRate({

    runs,

    balls

}) {

    if (balls === 0) {

        return 0;

    }

    return Number(

        ((runs * 100) / balls)

            .toFixed(2)

    );

}

/*
|--------------------------------------------------------------------------
| Dismissal
|--------------------------------------------------------------------------
*/

export function updateDismissal({

    isOut,

    wicketType,

    dismissedBy,

    fielderId

}) {

    return {

        isOut,

        wicketType,

        dismissedBy,

        fielderId

    };

}

/*
|--------------------------------------------------------------------------
| Build Batting Summary
|--------------------------------------------------------------------------
*/

export function buildBattingSummary({

    runs,

    balls,

    fours,

    sixes,

    isOut,

    dismissalType,

    bowlerId,

    fielderId

}) {

    return {

        runs,
        balls,
        fours,
        sixes,

        strikeRate: calculateStrikeRate({
            runs,
            balls
        }),

        isOut,

        dismissalType,

        bowlerId ,

        fielderId

    };
}