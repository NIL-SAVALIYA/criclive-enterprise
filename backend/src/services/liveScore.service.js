import { getMatchById } from "../repositories/match.repository.js";
import { getLiveInnings } from "../repositories/innings.repository.js";
import { getBattingScorecardsByInnings, getCurrentBatsmen } from "../repositories/battingScorecard.repository.js";
import { getBowlingScorecardsByInnings, getCurrentBowler } from "../repositories/bowlingScorecard.repository.js";
import { getActivePartnership } from "../repositories/partnership.repository.js";
import { getRecentBalls } from "../repositories/ball.repository.js";
import { getFallOfWicketsByInnings } from "../repositories/fallOfWicket.repository.js";
import { getInningsByMatch } from "../repositories/innings.repository.js";

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

    const innings = await getLiveInnings(matchId);

    if (!innings) {
        throw new Error("No live innings found.");
    }

    const [
        battingScorecard,
        bowlingScorecard,
        currentBatsmen,
        currentBowler,
        partnership,
        recentBalls,
        fallOfWickets
    ] = await Promise.all([
        getBattingScorecardsByInnings(innings.id),
        getBowlingScorecardsByInnings(innings.id),
        getCurrentBatsmen(innings.id),
        getCurrentBowler(innings.id),
        getActivePartnership(innings.id),
        getRecentBalls(innings.id),
        getFallOfWicketsByInnings(innings.id)
    ]);

    const currentRunRate = calculateCurrentRunRate(
        innings.totalRuns,
        innings.legalBalls
    );

    let target = null;

    let requiredRunRate = null;

    if (innings.inningsNumber === 2) {

        const inningsList = await getInningsByMatch(matchId);

        const firstInnings = inningsList.find(
            innings => innings.inningsNumber === 1
        );
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

    const batting = battingScorecard.map(player => ({
        id: player.player.id,
        name: `${player.player.firstName} ${player.player.lastName}`,
        battingPosition: player.battingPosition,
        runs: player.runs,
        balls: player.balls,
        fours: player.fours,
        sixes: player.sixes,
        strikeRate: player.strikeRate,
        isOut: player.isOut,
        dismissalType: player.dismissalType
    }));

    const bowling = bowlingScorecard.map(bowler => ({
        id: bowler.bowler.id,
        name: `${bowler.bowler.firstName} ${bowler.bowler.lastName}`,
        overs: `${bowler.overs}.${bowler.balls}`,
        maidens: bowler.maidens,
        runs: bowler.runs,
        wickets: bowler.wickets,
        economy: bowler.economy,
        wides: bowler.wides,
        noBalls: bowler.noBalls
    }));

    const striker = currentBatsmen[0] ?? null;

    const nonStriker = currentBatsmen[1] ?? null;

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
              overs: `${currentBowler.overs}.${currentBowler.balls}`,
              maidens: currentBowler.maidens,
              runs: currentBowler.runs,
              wickets: currentBowler.wickets,
              economy: currentBowler.economy
          }
        : null;

    const currentPartnership = partnership
        ? {
              striker: `${partnership.striker.firstName} ${partnership.striker.lastName}`,
              nonStriker: `${partnership.nonStriker.firstName} ${partnership.nonStriker.lastName}`,
              runs: partnership.runs,
              balls: partnership.balls,
              fours: partnership.fours,
              sixes: partnership.sixes
          }
        : null;

    const lastSixBalls = [...recentBalls]
        .reverse()
        .map(ball => ({
            over: `${ball.over}.${ball.ball}`,
            batsman: `${ball.batsman.firstName} ${ball.batsman.lastName}`,
            bowler: `${ball.bowler.firstName} ${ball.bowler.lastName}`,
            batRuns: ball.batRuns,
            extraRuns: ball.extraRuns,
            totalRuns: ball.totalRuns,
            extraType: ball.extraType,
            isWicket: ball.isWicket,
            wicketType: ball.wicketType,
            commentary: ball.commentary
        }));

    const wickets = fallOfWickets.map(wicket => ({
        wicketNumber: wicket.wicketNumber,
        player: `${wicket.player.firstName} ${wicket.player.lastName}`,
        score: wicket.score,
        over: wicket.over,
        wicketType: wicket.wicketType
    }));

    let matchStatus = "";

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
            tossWinner: match.tossWinner
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


        lastSixBalls,

        matchStatus
    };
}
