/*
|--------------------------------------------------------------------------
| strike.engine.js
|--------------------------------------------------------------------------
|
| Handles:
| - Strike Rotation based on physical runs completed by batsmen
| - End of Over Strike Change
| - Batsman Swapping
|--------------------------------------------------------------------------
*/

/**
 * Calculate the physical runs completed by the batsmen running between wickets.
 * Boundaries (4s and 6s) do not involve physical running and thus do not swap strike.
 * Extras (Wides, No Balls, Byes, Leg Byes) only swap strike if physical runs were taken.
 */
export function calculateCompletedRuns({ batRuns = 0, extraRuns = 0, extraType = "NONE" }) {
    if (extraType === "WIDE") {
        // A standard 1-run wide penalty involves no running.
        // If extraRuns > 1, any additional runs taken physically by batsmen count as completed runs.
        const additional = extraRuns > 1 ? (extraRuns - 1) : 0;
        return (additional > 0 && additional !== 4 && additional !== 6) ? additional : 0;
    }

    if (extraType === "BYE" || extraType === "LEG_BYE") {
        // Byes / Leg Byes: physical runs run by batsmen. (4 is boundary -> no swap)
        return (extraRuns > 0 && extraRuns !== 4 && extraRuns !== 6) ? extraRuns : 0;
    }

    if (extraType === "NO_BALL") {
        if (batRuns > 0) {
            return (batRuns !== 4 && batRuns !== 6) ? batRuns : 0;
        }
        const additional = extraRuns > 1 ? (extraRuns - 1) : 0;
        return (additional > 0 && additional !== 4 && additional !== 6) ? additional : 0;
    }

    // Normal deliveries: 1, 2, 3, 5 are runs run physically between wickets; 4 and 6 are boundaries.
    if (batRuns === 4 || batRuns === 6) {
        return 0;
    }
    return batRuns || 0;
}

export function shouldRotateStrike(param) {
    if (typeof param === "number") {
        return param % 2 === 1;
    }
    if (typeof param === "object" && param !== null) {
        const physical = calculateCompletedRuns(param);
        return physical % 2 === 1;
    }
    return false;
}

export function swapStrike({
    strikerId,
    nonStrikerId
}) {
    return {
        strikerId: nonStrikerId,
        nonStrikerId: strikerId
    };
}

export function rotateStrike({
    strikerId,
    nonStrikerId,
    batRuns = 0,
    extraRuns = 0,
    extraType = "NONE",
    totalRuns = 0
}) {
    const shouldRotate = (batRuns !== undefined && extraType !== undefined)
        ? shouldRotateStrike({ batRuns, extraRuns, extraType })
        : shouldRotateStrike(totalRuns);

    if (!shouldRotate) {
        return {
            strikerId,
            nonStrikerId
        };
    }

    return swapStrike({
        strikerId,
        nonStrikerId
    });
}

export function rotateAtOverEnd({
    strikerId,
    nonStrikerId
}) {
    return swapStrike({
        strikerId,
        nonStrikerId
    });
}

export function getNextStrike({
    strikerId,
    nonStrikerId,
    batRuns = 0,
    extraRuns = 0,
    extraType = "NONE",
    totalRuns = 0,
    overCompleted = false
}) {
    let players = rotateStrike({
        strikerId,
        nonStrikerId,
        batRuns,
        extraRuns,
        extraType,
        totalRuns
    });

    if (overCompleted) {
        players = rotateAtOverEnd({
            strikerId: players.strikerId,
            nonStrikerId: players.nonStrikerId
        });
    }

    return players;
}

export function validateStrike({
    strikerId,
    nonStrikerId
}) {
    if (!strikerId) {
        throw new Error("Striker is required.");
    }

    if (!nonStrikerId) {
        throw new Error("Non-striker is required.");
    }

    if (strikerId === nonStrikerId) {
        throw new Error("Striker and non-striker cannot be the same player.");
    }
}

export function buildStrikeSummary({
    strikerId,
    nonStrikerId,
    batRuns = 0,
    extraRuns = 0,
    extraType = "NONE",
    totalRuns = 0,
    overCompleted = false
}) {
    validateStrike({
        strikerId,
        nonStrikerId
    });

    const players = getNextStrike({
        strikerId,
        nonStrikerId,
        batRuns,
        extraRuns,
        extraType,
        totalRuns,
        overCompleted
    });

    return {
        strikerId: players.strikerId,
        nonStrikerId: players.nonStrikerId,
        strikeRotated: shouldRotateStrike({ batRuns, extraRuns, extraType, totalRuns }),
        overCompleted
    };
}