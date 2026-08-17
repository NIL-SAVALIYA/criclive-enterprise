import { getMatchById } from "../repositories/match.repository.js";
import { getLiveInnings, getInningsByMatch } from "../repositories/innings.repository.js";
import { getCurrentBatsmen } from "../repositories/battingScorecard.repository.js";
import { getCurrentBowler } from "../repositories/bowlingScorecard.repository.js";
import { getActivePartnership } from "../repositories/partnership.repository.js";
import { getRecentBalls } from "../repositories/ball.repository.js";

function calculateCurrentRunRate(runs, legalBalls) {
    if (!legalBalls) return 0;
    return Number(((runs * 6) / legalBalls).toFixed(2));
}

function calculateRequiredRunRate(target, runs, legalBalls, maxOvers = 20) {
    if (!target) return null;

    const ballsRemaining = (maxOvers * 6) - legalBalls;

    if (ballsRemaining <= 0) {
        return 0;
    }

    const runsRemaining = target - runs;

    if (runsRemaining <= 0) {
        return 0;
    }

    return Number(((runsRemaining * 6) / ballsRemaining).toFixed(2));
}

function formatOvers(legalBalls) {
    return `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
}

export async function getLiveScoreService(matchId) {
    const match = await getMatchById(matchId);

    if (!match) {
        throw new Error("Match not found.");
    }

    let innings = await getLiveInnings(matchId);
    const inningsList = await getInningsByMatch(matchId);

    // If no LIVE innings found
    if (!innings) {
        if (match.status === "UPCOMING" || inningsList.length === 0) {
            return {
                match: {
                    id: match.id,
                    venue: match.venue,
                    matchDate: match.matchDate,
                    status: match.status,
                    teamA: match.teamA,
                    teamB: match.teamB,
                    tossWinner: match.tossWinner
                },
                innings: null,
                score: {
                    runs: 0,
                    wickets: 0,
                    overs: "0.0",
                    legalBalls: 0,
                    totalBalls: 0,
                    currentRunRate: 0,
                    requiredRunRate: null,
                    target: null
                },
                currentBatters: {
                    striker: null,
                    nonStriker: null
                },
                currentBowling: null,
                recentBalls: [],
                lastSixBalls: [],
                matchStatus: match.status === "UPCOMING" ? "Upcoming" : "Not Started"
            };
        }

        // Use latest completed innings (e.g. 2nd innings or 1st innings)
        innings = inningsList[inningsList.length - 1];
    }

    const [
        currentBatsmen,
        currentBowler,
        partnership,
        recentBalls
    ] = await Promise.all([
        getCurrentBatsmen(innings.id),
        getCurrentBowler(innings.id),
        getActivePartnership(innings.id),
        getRecentBalls(innings.id, 12)
    ]);

    const currentRunRate = calculateCurrentRunRate(
        innings.totalRuns,
        innings.legalBalls
    );

    let target = null;
    let requiredRunRate = null;

    if (innings.inningsNumber === 2) {
        const firstInnings = inningsList.find((i) => i.inningsNumber === 1);
        if (firstInnings) {
            target = firstInnings.totalRuns + 1;
            requiredRunRate = calculateRequiredRunRate(
                target,
                innings.totalRuns,
                innings.legalBalls
            );
        }
    }

    const score = {
        runs: innings.totalRuns,
        wickets: innings.wickets,
        overs: formatOvers(innings.legalBalls),
        legalBalls: innings.legalBalls,
        totalBalls: innings.totalBalls,
        currentRunRate,
        requiredRunRate,
        target
    };

    const striker = partnership
        ? (currentBatsmen.find((b) => b.player.id === partnership.strikerId || b.playerId === partnership.strikerId) ?? currentBatsmen[0] ?? null)
        : (currentBatsmen[0] ?? null);

    const nonStriker = partnership
        ? (currentBatsmen.find((b) => b.player.id === partnership.nonStrikerId || b.playerId === partnership.nonStrikerId) ?? currentBatsmen[1] ?? null)
        : (currentBatsmen[1] ?? null);

    const currentBatters = {
        striker: striker
            ? {
                id: striker.player.id,
                name: `${striker.player.firstName} ${striker.player.lastName}`,
                runs: striker.runs,
                balls: striker.balls,
                fours: striker.fours,
                sixes: striker.sixes,
                strikeRate: striker.strikeRate
            }
            : null,
        nonStriker: nonStriker
            ? {
                id: nonStriker.player.id,
                name: `${nonStriker.player.firstName} ${nonStriker.player.lastName}`,
                runs: nonStriker.runs,
                balls: nonStriker.balls,
                fours: nonStriker.fours,
                sixes: nonStriker.sixes,
                strikeRate: nonStriker.strikeRate
            }
            : null
    };

    const currentBowling = currentBowler
        ? {
            id: currentBowler.bowler.id,
            name: `${currentBowler.bowler.firstName} ${currentBowler.bowler.lastName}`,
            overs: formatOvers(currentBowler.balls),
            maidens: currentBowler.maidens,
            runs: currentBowler.runs,
            wickets: currentBowler.wickets,
            economy: currentBowler.economy
        }
        : null;

    const formattedRecentBalls = [...recentBalls].map((ball) => ({
        over: `${ball.over}.${ball.ball}`,
        batsman: `${ball.batsman?.firstName || ""} ${ball.batsman?.lastName || ""}`.trim(),
        bowler: `${ball.bowler?.firstName || ""} ${ball.bowler?.lastName || ""}`.trim(),
        batRuns: ball.batRuns,
        extraRuns: ball.extraRuns,
        totalRuns: ball.totalRuns,
        extraType: ball.extraType,
        isWicket: ball.isWicket,
        wicketType: ball.wicketType,
        commentary: ball.commentary
    }));

    let matchStatus;
    if (match.status === "COMPLETED") {
        matchStatus = "Completed";
    } else if (innings.inningsNumber === 1) {
        matchStatus = "First Innings";
    } else if (target && innings.totalRuns >= target) {
        matchStatus = "Target Achieved";
    } else {
        matchStatus = "Second Innings";
    }

    return {
        match: {
            id: match.id,
            venue: match.venue,
            matchDate: match.matchDate,
            status: match.status,
            teamA: match.teamA,
            teamB: match.teamB,
            tossWinner: match.tossWinner,
            winnerTeam: match.winnerTeam,
            result: match.result,
            winningMargin: match.winningMargin
        },
        innings: {
            id: innings.id,
            inningsNumber: innings.inningsNumber,
            battingTeam: innings.battingTeam,
            bowlingTeam: innings.bowlingTeam,
            status: innings.status
        },
        score,
        currentBatters,
        currentBowling,
        partnership: partnership ? {
            runs: partnership.runs,
            balls: partnership.balls,
            fours: partnership.fours,
            sixes: partnership.sixes
        } : null,
        recentBalls: formattedRecentBalls,
        lastSixBalls: formattedRecentBalls.slice(0, 6),
        matchStatus
    };
}