/**
 * ============================================================================
 * CRICLIVE ENTERPRISE — SCORECARD STATUS ENGINE
 * ============================================================================
 * Production-grade status resolution for Batting and Bowling Scorecards.
 *
 * Rules:
 * 1. Batting Status:
 *    - DISMISSED: If player has an out record / dismissalType.
 *    - NOT_OUT: If player is active striker/non-striker or has entered/participated in innings.
 *    - YET_TO_BAT: If player belongs to the XI but has never entered the crease.
 * 2. Bowling Scorecard:
 *    - Visible ONLY if player has delivered at least 1 ball in the innings.
 */

/**
 * Format dismissal text based on dismissal type, bowler, and fielder.
 */
export function formatDismissalText(player) {
    if (!player.isOut && !player.dismissalType) {
        return "not out";
    }

    const dismissalType = player.dismissalType;
    const bowlerName = player.bowler ? `${player.bowler.firstName} ${player.bowler.lastName}`.trim() : null;
    const fielderName = player.fielder ? `${player.fielder.firstName} ${player.fielder.lastName}`.trim() : null;

    if (!dismissalType) {
        return bowlerName ? `b ${bowlerName}` : "out";
    }

    switch (dismissalType) {
        case "BOWLED":
            return bowlerName ? `b ${bowlerName}` : "b BOWLED";
        case "CAUGHT":
            if (fielderName && bowlerName) {
                return `c ${fielderName} b ${bowlerName}`;
            } else if (bowlerName) {
                return `c & b ${bowlerName}`;
            } else if (fielderName) {
                return `c ${fielderName}`;
            }
            return "c Fielder b Bowler";
        case "LBW":
            return bowlerName ? `lbw b ${bowlerName}` : "lbw";
        case "RUN_OUT":
            return fielderName ? `run out (${fielderName})` : "run out";
        case "STUMPED":
            if (fielderName && bowlerName) {
                return `st ${fielderName} b ${bowlerName}`;
            }
            return bowlerName ? `st b ${bowlerName}` : "stumped";
        case "HIT_WICKET":
            return bowlerName ? `hit wicket b ${bowlerName}` : "hit wicket";
        case "RETIRED_HURT":
            return "retired hurt";
        case "RETIRED_OUT":
            return "retired out";
        case "TIMED_OUT":
            return "timed out";
        case "OBSTRUCTING_FIELD":
            return "obstructing field";
        case "HIT_BALL_TWICE":
            return "hit ball twice";
        case "HANDLED_BALL":
            return "handled ball";
        default:
            return bowlerName ? `b ${bowlerName}` : `b ${dismissalType}`;
    }
}

/**
 * Resolves batting status for a single player in an innings.
 *
 * @param {Object} params
 * @param {Object} params.player - Batting scorecard player row
 * @param {string|null} params.activeStrikerId - Currently active striker player ID
 * @param {string|null} params.activeNonStrikerId - Currently active non-striker player ID
 * @param {Set<string>} params.participatedPlayerIds - Set of player IDs who entered/participated
 * @param {boolean} params.isInitialLiveInnings - True if live innings before any balls are bowled
 * @returns {{ status: 'DISMISSED'|'NOT_OUT'|'YET_TO_BAT', statusText: string, hasBatted: boolean }}
 */
export function resolveBattingStatus({
    player,
    activeStrikerId = null,
    activeNonStrikerId = null,
    participatedPlayerIds = new Set(),
    isInitialLiveInnings = false
}) {
    const playerId = player.playerId || player.id || player.player?.id;

    // STEP 1: Dismissed
    if (player.isOut || player.dismissalType) {
        return {
            status: "DISMISSED",
            statusText: formatDismissalText(player),
            hasBatted: true
        };
    }

    // STEP 2: Current active striker
    if (activeStrikerId && activeStrikerId === playerId) {
        return {
            status: "NOT_OUT",
            statusText: "not out",
            hasBatted: true
        };
    }

    // STEP 3: Current active non-striker
    if (activeNonStrikerId && activeNonStrikerId === playerId) {
        return {
            status: "NOT_OUT",
            statusText: "not out",
            hasBatted: true
        };
    }

    // STEP 4: Demonstrably entered/participated in the innings
    const hasFacedBalls = (player.balls || 0) > 0;
    const hasScoredRuns = (player.runs || 0) > 0;
    const hasParticipated = participatedPlayerIds.has(playerId) || hasFacedBalls || hasScoredRuns;

    if (hasParticipated) {
        return {
            status: "NOT_OUT",
            statusText: "not out",
            hasBatted: true
        };
    }

    // Special Case: Initial Live Innings (0/0, before deliveries)
    // Opening 2 batters (positions 1 and 2) are at the crease
    if (isInitialLiveInnings && (player.battingPosition === 1 || player.battingPosition === 2)) {
        return {
            status: "NOT_OUT",
            statusText: "not out",
            hasBatted: true
        };
    }

    // STEP 5: Otherwise -> YET_TO_BAT
    return {
        status: "YET_TO_BAT",
        statusText: "Yet to bat",
        hasBatted: false
    };
}

/**
 * Filter bowling scorecard to include only players who have actually delivered at least 1 ball.
 *
 * @param {Array} bowlingScorecard - Array of bowling scorecard rows
 * @param {Array} balls - Array of recorded ball deliveries in the innings
 * @returns {Array} Filtered bowling scorecard array
 */
export function filterDeliveredBowlers(bowlingScorecard = [], balls = []) {
    const deliveredBowlerIds = new Set(
        balls.map((b) => b.bowlerId).filter(Boolean)
    );

    return bowlingScorecard.filter((b) => {
        const bowlerId = b.bowlerId || b.id || b.bowler?.id;
        const hasDelivered =
            deliveredBowlerIds.has(bowlerId) ||
            (b.balls || 0) > 0 ||
            (b.wides || 0) > 0 ||
            (b.noBalls || 0) > 0 ||
            (b.runs || 0) > 0 ||
            (b.wickets || 0) > 0 ||
            (b.maidens || 0) > 0;

        return hasDelivered;
    });
}
