/*
|--------------------------------------------------------------------------
| bowling.engine.js
|--------------------------------------------------------------------------
|
| Handles:
| - Overs Bowled
| - Balls Bowled
| - Runs Conceded
| - Wickets
| - Maidens
| - Economy Rate
| - Wides
| - No Balls
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Balls Bowled
|--------------------------------------------------------------------------
|
| Only legal deliveries count.
|--------------------------------------------------------------------------
*/

export function calculateBallsBowled({

    currentBalls,

    isLegalDelivery

}) {

    return isLegalDelivery

        ? currentBalls + 1

        : currentBalls;

}

/*
|--------------------------------------------------------------------------
| Overs Bowled
|--------------------------------------------------------------------------
*/

export function calculateOvers(

    legalBalls

) {

    const overs = Math.floor(

        legalBalls / 6

    );

    const balls = legalBalls % 6;

    return `${overs}.${balls}`;

}

/*
|--------------------------------------------------------------------------
| Runs Conceded
|--------------------------------------------------------------------------
*/

export function calculateRunsConceded({

    currentRuns,

    totalRuns,

    extraType

}) {

    if (extraType === "BYE" || extraType === "LEG_BYE") {
        return currentRuns;
    }

    return currentRuns + totalRuns;

}

/*
|--------------------------------------------------------------------------
| Wickets
|--------------------------------------------------------------------------
*/

export function calculateBowlingWickets({

    currentWickets,

    isWicket,

    wicketType

}) {

    if (

        !isWicket

    ) {

        return currentWickets;

    }

    if (

        wicketType === "RUN_OUT"

    ) {

        return currentWickets;

    }

    return currentWickets + 1;

}

/*
|--------------------------------------------------------------------------
| Wides
|--------------------------------------------------------------------------
*/

export function calculateWides({

    currentWides,

    extraType,

    extraRuns

}) {

    if (

        extraType !== "WIDE"

    ) {

        return currentWides;

    }

    return currentWides + extraRuns;

}

/*
|--------------------------------------------------------------------------
| No Balls
|--------------------------------------------------------------------------
*/

export function calculateNoBalls({
    currentNoBalls,
    extraType
}) {
    if (extraType !== "NO_BALL") {
        return currentNoBalls;
    }
    return currentNoBalls + 1;
}

/*
|--------------------------------------------------------------------------
| Economy Rate
|--------------------------------------------------------------------------
*/

export function calculateEconomy({

    runs,

    legalBalls

}) {

    if (

        legalBalls === 0

    ) {

        return 0;

    }

    return Number(

        (

            runs /

            (legalBalls / 6)

        ).toFixed(2)

    );

}

/*
|--------------------------------------------------------------------------
| Maiden Over
|--------------------------------------------------------------------------
*/

export function calculateMaidens({

    currentMaidens,

    overRuns

}) {

    if (

        overRuns === 0

    ) {

        return currentMaidens + 1;

    }

    return currentMaidens;

}

/*
|--------------------------------------------------------------------------
| Bowling Summary
|--------------------------------------------------------------------------
*/

export function buildBowlingSummary({
    legalBalls,
    runs,
    wickets,
    maidens,
    wides,
    noBalls
}) {
    return {
        overs: calculateOvers(legalBalls),
        balls: legalBalls,
        runs,
        wickets,
        maidens,
        wides,
        noBalls,
        economy: calculateEconomy({
            runs,
            legalBalls
        })
    };
}