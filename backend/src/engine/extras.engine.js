/*
|--------------------------------------------------------------------------
| extras.engine.js
|--------------------------------------------------------------------------
|
| Handles all cricket extras according to MCC Laws.
| Supported:
| - Wide
| - No Ball
| - Bye
| - Leg Bye
| - Penalty Runs
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Extra Types
|--------------------------------------------------------------------------
*/

import { ExtraType } from "../constants/cricket.constants.js";

export const EXTRA_TYPES = ExtraType;

/*
|--------------------------------------------------------------------------
| Check Extra Delivery
|--------------------------------------------------------------------------
*/

export function isExtra(extraType) {

    return extraType !== EXTRA_TYPES.NONE;

}

/*
|--------------------------------------------------------------------------
| Check Legal Delivery
|--------------------------------------------------------------------------
*/

export function isLegalDelivery(extraType) {

    return ![
        EXTRA_TYPES.WIDE,
        EXTRA_TYPES.NO_BALL
    ].includes(extraType);

}

/*
|--------------------------------------------------------------------------
| Calculate Extras
|--------------------------------------------------------------------------
*/

export function calculateExtraRuns({

    extraType,

    extraRuns

}) {

    switch (extraType) {

        case EXTRA_TYPES.NONE:

            return 0;

        case EXTRA_TYPES.WIDE:
        case EXTRA_TYPES.NO_BALL:
        case EXTRA_TYPES.BYE:
        case EXTRA_TYPES.LEG_BYE:
            return extraRuns;

        default:

            throw new Error(
                "Invalid Extra Type."
            );

    }

}

/*
|--------------------------------------------------------------------------
| Validate Extras
|--------------------------------------------------------------------------
*/

export function validateExtras({

    batRuns,

    extraRuns,

    extraType

}) {

    switch (extraType) {

        case EXTRA_TYPES.NONE:

            if (extraRuns > 0) {

                throw new Error(
                    "Normal delivery cannot contain extra runs."
                );

            }

            break;

        case EXTRA_TYPES.WIDE:

            if (extraRuns < 1) {

                throw new Error(
                    "Wide must have at least 1 extra run."
                );

            }

            if (batRuns > 0) {

                throw new Error(
                    "Bat runs are not allowed on a Wide."
                );

            }

            break;

        case EXTRA_TYPES.NO_BALL:

            if (extraRuns < 1) {

                throw new Error(
                    "No Ball must include at least 1 extra run."
                );

            }

            break;

        case EXTRA_TYPES.BYE:

            if (batRuns > 0) {

                throw new Error(
                    "Bye cannot contain bat runs."
                );

            }

            break;

        case EXTRA_TYPES.LEG_BYE:

            if (batRuns > 0) {

                throw new Error(
                    "Leg Bye cannot contain bat runs."
                );

            }

            break;

        default:

            throw new Error(
                "Unknown Extra Type."
            );

    }

}

/*
|--------------------------------------------------------------------------
| Total Team Runs
|--------------------------------------------------------------------------
*/

export function calculateTeamRuns({

    batRuns,

    extraRuns

}) {

    return batRuns + extraRuns;

}

/*
|--------------------------------------------------------------------------
| Counts As Ball?
|--------------------------------------------------------------------------
*/

export function countsAsBall(extraType) {

    return isLegalDelivery(extraType);

}

/*
|--------------------------------------------------------------------------
| Counts Against Bowler?
|--------------------------------------------------------------------------
*/

export function countsAgainstBowler(extraType) {

    return [

        EXTRA_TYPES.NONE,
        EXTRA_TYPES.WIDE,
        EXTRA_TYPES.NO_BALL

    ].includes(extraType);

}

/*
|--------------------------------------------------------------------------
| Counts To Batsman?
|--------------------------------------------------------------------------
*/

export function countsToBatsman(extraType) {

    return [

        EXTRA_TYPES.NONE,
        EXTRA_TYPES.NO_BALL

    ].includes(extraType);

}

/*
|--------------------------------------------------------------------------
| Is Bye?
|--------------------------------------------------------------------------
*/

export function isBye(extraType) {

    return extraType === EXTRA_TYPES.BYE;

}

/*
|--------------------------------------------------------------------------
| Is Leg Bye?
|--------------------------------------------------------------------------
*/

export function isLegBye(extraType) {

    return extraType === EXTRA_TYPES.LEG_BYE;

}

/*
|--------------------------------------------------------------------------
| Is Wide?
|--------------------------------------------------------------------------
*/

export function isWide(extraType) {

    return extraType === EXTRA_TYPES.WIDE;

}

/*
|--------------------------------------------------------------------------
| Is No Ball?
|--------------------------------------------------------------------------
*/

export function isNoBall(extraType) {

    return extraType === EXTRA_TYPES.NO_BALL;

}

/*
|--------------------------------------------------------------------------
| Build Extras Summary
|--------------------------------------------------------------------------
*/

export function buildExtrasSummary({

    batRuns,

    extraRuns,

    extraType

}) {

    validateExtras({

        batRuns,

        extraRuns,

        extraType

    });

    return {

        batRuns,

        extraRuns,

        totalRuns: calculateTeamRuns({

            batRuns,

            extraRuns

        }),

        extraType,

        isExtra: isExtra(extraType),

        isLegalDelivery: countsAsBall(extraType),

        countsToBatsman:
            countsToBatsman(extraType),

        countsAgainstBowler:
            countsAgainstBowler(extraType)

    };

}