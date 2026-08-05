import {
    getPlayerProfile,
    getMatchesPlayed,
    getBattingStatistics,
    getBattingMilestones,
    getBowlingStatistics,
    getBestBowling,
    getFieldingStatistics,
    getBowlingMilestones,
    getFormatStatistics
} from "../repositories/playerStatistics.repository.js";

import { toPlayerStatistics } from "../mappers/playerStatistics.mapper.js";

export async function getPlayerStatisticsService(playerId) {

    const [
        player,
        matchesPlayed,
        batting,
        milestones,
        bowling,
        bestBowling,
        fielding,
        bowlingMilestones
    ] = await Promise.all([
        getPlayerProfile(playerId),
        getMatchesPlayed(playerId),
        getBattingStatistics(playerId),
        getBattingMilestones(playerId),
        getBowlingStatistics(playerId),
        getBestBowling(playerId),
        getFieldingStatistics(playerId),
        getBowlingMilestones(playerId)
    ]);

    if (!player) {
        throw new Error("Player not found.");
    }

    const runs = batting._sum.runs ?? 0;
    const balls = batting._sum.balls ?? 0;
    const fours = batting._sum.fours ?? 0;
    const sixes = batting._sum.sixes ?? 0;

    const innings = batting._count.id ?? 0;
    const highestScore = batting._max.runs ?? 0;

    const bowlingBalls = bowling._sum.balls ?? 0;
    const wickets = bowling._sum.wickets ?? 0;
    const bowlingRuns = bowling._sum.runs ?? 0;
    const maidens = bowling._sum.maidens ?? 0;

    const overs = Math.floor(bowlingBalls / 6) + "." + (bowlingBalls % 6);

    const strikeRate =
        balls === 0
            ? 0
            : Number(((runs / balls) * 100).toFixed(2));

    const economy =
        bowlingBalls === 0
            ? 0
            : Number(((bowlingRuns * 6) / bowlingBalls).toFixed(2));

    const timesOut = innings - milestones.notOuts;

    const average =
        timesOut === 0
            ? runs
            : Number((runs / timesOut).toFixed(2));

    return toPlayerStatistics({
        player,

        batting: {
            matches: matchesPlayed,
            innings,
            runs,
            highestScore,
            average,
            strikeRate,
            balls,
            fours,
            sixes,
            fifties: milestones.fifties,
            hundreds: milestones.hundreds,
            notOuts: milestones.notOuts
        },

        bowling: {
            matches: bowling._count.id ?? 0,
            overs,
            balls: bowlingBalls,
            wickets,
            economy,
            maidens,
            threeWickets: bowlingMilestones.threeWickets,
            fiveWickets: bowlingMilestones.fiveWickets,
            bestBowling: bestBowling
                ? {
                    wickets: bestBowling.wickets,
                    runs: bestBowling.runs
                }
                : null
        },

        fielding
    });
}

export async function getPlayerCareerRecordsService(playerId) {
    const formats = ["LEAGUE", "KNOCKOUT", "ROUND_ROBIN", "HYBRID"];
    let overall = null;
    try {
        overall = await getPlayerStatisticsService(playerId);
    } catch (err) {
        // Player not found
        return {
            overall: null,
            formatBreakdown: []
        };
    }
    
    const formatBreakdown = await Promise.all(
        formats.map((fmt) => getFormatStatistics(playerId, fmt))
    );

    return {
        overall,
        formatBreakdown
    };
}