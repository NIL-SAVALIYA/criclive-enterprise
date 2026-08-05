/*
|--------------------------------------------------------------------------
| Cricket Constants
|--------------------------------------------------------------------------
*/
import { ExtraType } from "@prisma/client";
export const BALLS_PER_OVER = 6;

/*
|--------------------------------------------------------------------------
| Calculate Total Runs
|--------------------------------------------------------------------------
*/

export function calculateTotalRuns(
    batRuns,
    extraRuns
) {

    return batRuns + extraRuns;

}

/*
|--------------------------------------------------------------------------
| Check Legal Delivery
|--------------------------------------------------------------------------
*/

export function isLegalDelivery(extraType) {

    return ![
        "WIDE",
        "NO_BALL"
    ].includes(extraType);

}

/*
|--------------------------------------------------------------------------
| Calculate Over & Ball
|--------------------------------------------------------------------------
*/

export function calculateOverAndBall(
    legalDeliveries
) {

    const over = Math.floor(
        legalDeliveries / BALLS_PER_OVER
    );

    const ball = (legalDeliveries % BALLS_PER_OVER) + 1;

    return {

        over,

        ball

    };

}

/*
|--------------------------------------------------------------------------
| Next Delivery Number
|--------------------------------------------------------------------------
*/

export function getNextDeliveryNumber(
    totalDeliveries
) {

    return totalDeliveries + 1;

}

/*
|--------------------------------------------------------------------------
| Rotate Strike
|--------------------------------------------------------------------------
*/

export function shouldRotateStrike(
    batRuns,
    extraType
) {

    // Byes and Leg Byes also rotate strike if odd.
    if (
        extraType === "BYE" ||
        extraType === "LEG_BYE"
    ) {

        return batRuns % 2 === 1;

    }

    return batRuns % 2 === 1;

}

/*
|--------------------------------------------------------------------------
| End Of Over
|--------------------------------------------------------------------------
*/

export function isOverCompleted(
    legalDeliveries
) {

    return (
        legalDeliveries > 0 &&
        legalDeliveries % BALLS_PER_OVER === 0
    );

}

/*
|--------------------------------------------------------------------------
| Boundary Check
|--------------------------------------------------------------------------
*/

export function getBoundaryType(
    batRuns
) {

    if (batRuns === 4) {

        return {

            four: true,

            six: false

        };

    }

    if (batRuns === 6) {

        return {

            four: false,

            six: true

        };

    }

    return {

        four: false,

        six: false

    };

}

/*
|--------------------------------------------------------------------------
| Build Ball Object
|--------------------------------------------------------------------------
*/

export function buildBallData({

    inningsId,

    batsmanId,

    nonStrikerId,

    bowlerId,

    batRuns,

    extraRuns,

    extraType,

    isWicket,

    wicketType,

    dismissedPlayerId,

    fielderId,

    commentary,

    shotZone,

    shotX,

    shotY,

    pitchLength,

    pitchLine,

    legalDeliveries,

    totalDeliveries

}) {

    const legal = isLegalDelivery(extraType);

    const {

        over,

        ball

    } = calculateOverAndBall(
        legalDeliveries
    );

    const totalRuns = calculateTotalRuns(

        batRuns,

        extraRuns

    );

    const boundary = getBoundaryType(
        batRuns
    );

    return {

        inningsId,

        batsmanId,

        nonStrikerId,

        bowlerId,

        over,

        ball,

        deliveryNumber:
            getNextDeliveryNumber(
                totalDeliveries
            ),

        batRuns,

        extraRuns,

        totalRuns,

        extraType: extraType ?? ExtraType.NONE,

        isLegalDelivery: legal,

        isBoundaryFour:
            boundary.four,

        isBoundarySix:
            boundary.six,

        isWicket,

        wicketType,

        dismissedPlayerId,

        fielderId,

        commentary,

        shotZone,

        shotX,

        shotY,

        pitchLength,

        pitchLine

    };

}