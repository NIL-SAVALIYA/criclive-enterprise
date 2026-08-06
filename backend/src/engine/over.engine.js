/*
|--------------------------------------------------------------------------
| over.engine.js
|--------------------------------------------------------------------------
|
| Handles:
| - Over Calculation
| - Ball Number
| - Legal Deliveries
| - Completed Overs
| - Maiden Overs
|--------------------------------------------------------------------------
*/

import { BALLS_PER_OVER } from "../constants/cricket.constants.js";

export { BALLS_PER_OVER };

/*
|--------------------------------------------------------------------------
| Current Over
|--------------------------------------------------------------------------
*/

export function calculateCurrentOver(legalBalls) {

    return Math.floor(
        legalBalls / BALLS_PER_OVER
    );

}

/*
|--------------------------------------------------------------------------
| Current Ball
|--------------------------------------------------------------------------
*/

export function calculateCurrentBall(legalBalls) {

    return (
        legalBalls % BALLS_PER_OVER
    ) + 1;

}

/*
|--------------------------------------------------------------------------
| Display Overs
|--------------------------------------------------------------------------
|
| Examples:
|
| legalBalls = 0   => 0.0
| legalBalls = 5   => 0.5
| legalBalls = 6   => 1.0
| legalBalls = 17  => 2.5
|--------------------------------------------------------------------------
*/

export function formatOvers(legalBalls) {

    const over = Math.floor(
        legalBalls / BALLS_PER_OVER
    );

    const ball =
        legalBalls % BALLS_PER_OVER;

    return `${over}.${ball}`;

}

/*
|--------------------------------------------------------------------------
| Next Delivery Number
|--------------------------------------------------------------------------
*/

export function getNextDeliveryNumber(
    totalDeliveries
) {

    return totalDeliveries ;

}

/*
|--------------------------------------------------------------------------
| Increment Legal Balls
|--------------------------------------------------------------------------
*/

export function incrementLegalBalls(
    legalBalls
) {

    return legalBalls + 1;

}

/*
|--------------------------------------------------------------------------
| Increment Total Deliveries
|--------------------------------------------------------------------------
*/

export function incrementDeliveries(
    deliveries
) {

    return deliveries + 1;

}

/*
|--------------------------------------------------------------------------
| Over Completed?
|--------------------------------------------------------------------------
*/

export function isOverCompleted(
    legalBalls
) {

    return (
        legalBalls > 0 &&
        legalBalls % BALLS_PER_OVER === 0
    );

}

/*
|--------------------------------------------------------------------------
| Over Start?
|--------------------------------------------------------------------------
*/

export function isNewOver(
    legalBalls
) {

    return (
        legalBalls % BALLS_PER_OVER === 0
    );

}

/*
|--------------------------------------------------------------------------
| Remaining Balls In Over
|--------------------------------------------------------------------------
*/

export function remainingBallsInOver(
    legalBalls
) {

    const currentBall =
        legalBalls % BALLS_PER_OVER;

    if (currentBall === 0) {

        return BALLS_PER_OVER;

    }

    return BALLS_PER_OVER - currentBall;

}

/*
|--------------------------------------------------------------------------
| Balls Bowled In Current Over
|--------------------------------------------------------------------------
*/

export function ballsInCurrentOver(
    legalBalls
) {

    return (
        legalBalls % BALLS_PER_OVER
    );

}

/*
|--------------------------------------------------------------------------
| Maiden Over?
|--------------------------------------------------------------------------
*/

export function isMaidenOver(
    completed,
    overRuns
) {

    return completed && overRuns === 0;

}
/*
|--------------------------------------------------------------------------
| Validate Ball Number
|--------------------------------------------------------------------------
*/

export function validateBallNumber(
    ball
) {

    if (
        ball < 1 ||
        ball > BALLS_PER_OVER
    ) {

        throw new Error(
            "Invalid ball number."
        );

    }

}

/*
|--------------------------------------------------------------------------
| Build Over Summary
|--------------------------------------------------------------------------
*/

export function buildOverSummary({

    legalBalls,

    totalDeliveries,

    overRuns

}) {
    const completed = isOverCompleted(legalBalls);
    return {

        currentOver:
            calculateCurrentOver(
                legalBalls
            ),

        currentBall:
            calculateCurrentBall(
                legalBalls
            ),

        overs:
            formatOvers(
                legalBalls
            ),

        deliveryNumber:
            getNextDeliveryNumber(
                totalDeliveries
            ),

        completed:
            isOverCompleted(
                legalBalls
            ),

        maiden:
            isMaidenOver(
             completed,
             overRuns
            ),
        remainingBalls:
            remainingBallsInOver(
                legalBalls
            )

    };

}

export function calculateCurrentOverRuns(
    balls,
    currentOver
) {

    return balls
        .filter(ball => ball.over === currentOver)
        .reduce(
            (total, ball) => total + ball.totalRuns,
            0
        );

}
