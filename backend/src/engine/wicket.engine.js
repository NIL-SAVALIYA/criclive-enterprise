/*
|--------------------------------------------------------------------------
| wicket.engine.js
|--------------------------------------------------------------------------
|
| Handles:
| - Wicket Validation
| - Bowling Credit
| - Fall of Wicket
| - New Partnership Trigger
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Bowling Credit
|--------------------------------------------------------------------------
|
| Run Out does NOT count to the bowler.
|--------------------------------------------------------------------------
*/

import { WicketType } from "../constants/cricket.constants.js";

export function countsToBowler(

    wicketType

) {

    return wicketType !== WicketType.RUN_OUT;

}

/*
|--------------------------------------------------------------------------
| Validate Wicket
|--------------------------------------------------------------------------
*/

export function validateWicket({

    isWicket,

    wicketType,

    dismissedPlayerId

}) {

    if (!isWicket) {

        return true;

    }

    if (!wicketType) {

        throw new Error(
            "Wicket type is required."
        );

    }

    if (!dismissedPlayerId) {

        throw new Error(
            "Dismissed player is required."
        );

    }

    return true;

}

/*
|--------------------------------------------------------------------------
| Fall Of Wicket
|--------------------------------------------------------------------------
*/

export function buildFallOfWicket({

    wicketNumber,

    teamRuns,

    batsmanRuns,

    over,

    ball,

    dismissedPlayerId,

    wicketType

}) {

    return {

        wicketNumber,

        score: teamRuns,

        batsmanRuns,

        over,

        ball,

        dismissedPlayerId,

        wicketType

    };

}

/*
|--------------------------------------------------------------------------
| New Partnership
|--------------------------------------------------------------------------
*/

export function shouldCreateNewPartnership(

    isWicket

) {

    return isWicket;

}

/*
|--------------------------------------------------------------------------
| Bowler Wicket
|--------------------------------------------------------------------------
*/

export function calculateBowlerWicket({

    currentWickets,

    isWicket,

    wicketType

}) {

    if (!isWicket) {

        return currentWickets;

    }

    if (!countsToBowler(wicketType)) {

        return currentWickets;

    }

    return currentWickets + 1;

}

/*
|--------------------------------------------------------------------------
| Wicket Summary
|--------------------------------------------------------------------------
*/

export function buildWicketSummary({

    isWicket,

    wicketType,

    dismissedPlayerId,

    wicketNumber,

    teamRuns,

    batsmanRuns,

    over,

    ball

}) {

    validateWicket({

        isWicket,

        wicketType,

        dismissedPlayerId

    });

    if (!isWicket) {

        return {

            isWicket: false

        };

    }

    return {

        isWicket: true,

        wicketType,

        dismissedPlayerId,

        newPartnership:

            shouldCreateNewPartnership(

                isWicket

            ),

        fallOfWicket:

            buildFallOfWicket({

                wicketNumber,

                teamRuns,

                batsmanRuns,

                over,

                ball,

                dismissedPlayerId,

                wicketType

            })

    };

}