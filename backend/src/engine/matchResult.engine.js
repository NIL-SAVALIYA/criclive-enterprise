import {
    getInningsById,
    updateInnings,
    getInningsByMatch,
    createInnings
} from "../repositories/innings.repository.js";

import {
    getMatchById,
    updateMatch
} from "../repositories/match.repository.js";

import {
    getPlayingXIByMatch
} from "../repositories/playingXI.repository.js";

import {
    getPlayersByTeam
} from "../repositories/player.repository.js";

import {
    createManyBattingScorecards
} from "../repositories/battingScorecard.repository.js";

import {
    createManyBowlingScorecards
} from "../repositories/bowlingScorecard.repository.js";

import {
    createPartnership
} from "../repositories/partnership.repository.js";

import {
    updatePointsTableService
} from "../services/pointsTable.service.js";

const MAX_WICKETS = 10;
const DEFAULT_MAX_OVERS = 20;

export function isAllOut(innings) {
    return innings.wickets >= MAX_WICKETS;
}

export function isOversCompleted(innings, maxOvers = DEFAULT_MAX_OVERS) {
    return innings.legalBalls >= maxOvers * 6;
}

export function isTargetChased(target, runs) {
    return target !== null && runs >= target;
}

export async function completeInnings(inningsId, db) {
    return await updateInnings(
        inningsId,
        {
            status: "COMPLETED"
        },
        db
    );
}

export async function completeMatch(
    matchId,
    winnerTeamId,
    result,
    winningMargin,
    db
) {
    return await updateMatch(
        matchId,
        {
            status: "COMPLETED",
            winnerTeamId,
            result,
            winningMargin,
            completedAt: new Date()
        },
        db
    );
}

export async function startSecondInnings(matchId, firstInnings, db) {
    const existingInnings = await getInningsByMatch(matchId, db);
    const alreadySecond = existingInnings.find(i => i.inningsNumber === 2);
    if (alreadySecond) {
        return alreadySecond;
    }

    const battingTeamId = firstInnings.bowlingTeamId;
    const bowlingTeamId = firstInnings.battingTeamId;

    const secondInnings = await createInnings(
        {
            matchId,
            inningsNumber: 2,
            battingTeamId,
            bowlingTeamId,
            status: "LIVE"
        },
        db
    );

    // Get Playing XI or fallback to team players
    const matchPlayingXI = await getPlayingXIByMatch(matchId, db);
    let battingPlayers = matchPlayingXI
        .filter(p => p.teamId === battingTeamId)
        .sort((a, b) => a.battingOrder - b.battingOrder);
    let bowlingPlayers = matchPlayingXI
        .filter(p => p.teamId === bowlingTeamId);

    if (battingPlayers.length === 0) {
        const teamBatters = await getPlayersByTeam(battingTeamId, db);
        battingPlayers = teamBatters.map((p, idx) => ({ playerId: p.id, battingOrder: idx + 1 }));
    }
    if (bowlingPlayers.length === 0) {
        const teamBowlers = await getPlayersByTeam(bowlingTeamId, db);
        bowlingPlayers = teamBowlers.map(p => ({ playerId: p.id }));
    }

    if (battingPlayers.length > 0) {
        await createManyBattingScorecards(
            battingPlayers.map((p, idx) => ({
                inningsId: secondInnings.id,
                playerId: p.playerId,
                battingPosition: idx + 1
            })),
            db
        );
    }

    if (bowlingPlayers.length > 0) {
        await createManyBowlingScorecards(
            bowlingPlayers.map(p => ({
                inningsId: secondInnings.id,
                bowlerId: p.playerId
            })),
            db
        );
    }

    // Initialize opening partnership for 2nd innings
    if (battingPlayers.length >= 2) {
        await createPartnership(
            {
                inningsId: secondInnings.id,
                strikerId: battingPlayers[0].playerId,
                nonStrikerId: battingPlayers[1].playerId,
                runs: 0,
                balls: 0,
                fours: 0,
                sixes: 0,
                isActive: true
            },
            db
        );
    }

    return secondInnings;
}

function getWinningTeam(match, firstInnings, secondInnings) {
    if (!firstInnings || !secondInnings) {
        return null;
    }

    if (secondInnings.totalRuns > firstInnings.totalRuns) {
        const wicketsRemaining = 10 - secondInnings.wickets;
        const winnerTeam = secondInnings.battingTeam?.name || "Batting Team";
        return {
            winnerTeamId: secondInnings.battingTeamId,
            result: `${winnerTeam} won by ${wicketsRemaining} wicket${wicketsRemaining === 1 ? "" : "s"}`,
            winningMargin: `${wicketsRemaining} Wickets`
        };
    }

    if (firstInnings.totalRuns > secondInnings.totalRuns) {
        const runMargin = firstInnings.totalRuns - secondInnings.totalRuns;
        const winnerTeam = firstInnings.battingTeam?.name || "Batting Team";
        return {
            winnerTeamId: firstInnings.battingTeamId,
            result: `${winnerTeam} won by ${runMargin} run${runMargin === 1 ? "" : "s"}`,
            winningMargin: `${runMargin} Runs`
        };
    }

    return {
        winnerTeamId: null,
        result: "Match Tied",
        winningMargin: "Tie"
    };
}

export async function evaluateMatchResult(inningsId, db) {
    const innings = await getInningsById(inningsId, db);

    if (!innings) {
        throw new Error("Innings not found.");
    }

    const match = await getMatchById(innings.matchId, db);

    if (!match) {
        throw new Error("Match not found.");
    }

    if (match.status === "COMPLETED") {
        return {
            completed: true,
            type: "MATCH_ALREADY_COMPLETED",
            winnerTeamId: match.winnerTeamId,
            result: match.result,
            winningMargin: match.winningMargin
        };
    }

    const inningsList = await getInningsByMatch(innings.matchId, db);

    if (innings.inningsNumber === 1) {
        if (isAllOut(innings) || isOversCompleted(innings)) {
            await completeInnings(innings.id, db);
            const secondInnings = await startSecondInnings(match.id, innings, db);

            return {
                completed: true,
                type: "INNINGS_COMPLETED",
                secondInningsId: secondInnings.id
            };
        }

        return {
            completed: false
        };
    }

    // Second Innings Handling
    const firstInnings = inningsList.find(i => i.inningsNumber === 1);
    const secondInnings = innings;

    if (!firstInnings || !secondInnings) {
        throw new Error("Innings data not found.");
    }

    const target = firstInnings.totalRuns + 1;
    const targetChased = isTargetChased(target, secondInnings.totalRuns);
    const inningsFinished = isAllOut(secondInnings) || isOversCompleted(secondInnings);

    if (!targetChased && !inningsFinished) {
        return {
            completed: false
        };
    }

    await completeInnings(secondInnings.id, db);

    const result = getWinningTeam(match, firstInnings, secondInnings);

    await completeMatch(
        match.id,
        result.winnerTeamId,
        result.result,
        result.winningMargin,
        db
    );

    // Update Points Table
    if (result.winnerTeamId === null) {
        // TIE
        await updatePointsTableService(
            match.tournamentId,
            match.teamAId,
            {
                won: false,
                lost: false,
                tied: true,
                noResult: false,
                runsScored: match.teamAId === firstInnings.battingTeamId ? firstInnings.totalRuns : secondInnings.totalRuns,
                ballsFaced: match.teamAId === firstInnings.battingTeamId ? firstInnings.legalBalls : secondInnings.legalBalls,
                runsConceded: match.teamAId === firstInnings.battingTeamId ? secondInnings.totalRuns : firstInnings.totalRuns,
                ballsBowled: match.teamAId === firstInnings.battingTeamId ? secondInnings.legalBalls : firstInnings.legalBalls
            },
            db
        );

        await updatePointsTableService(
            match.tournamentId,
            match.teamBId,
            {
                won: false,
                lost: false,
                tied: true,
                noResult: false,
                runsScored: match.teamBId === firstInnings.battingTeamId ? firstInnings.totalRuns : secondInnings.totalRuns,
                ballsFaced: match.teamBId === firstInnings.battingTeamId ? firstInnings.legalBalls : secondInnings.legalBalls,
                runsConceded: match.teamBId === firstInnings.battingTeamId ? secondInnings.totalRuns : firstInnings.totalRuns,
                ballsBowled: match.teamBId === firstInnings.battingTeamId ? secondInnings.legalBalls : firstInnings.legalBalls
            },
            db
        );
    } else {
        const loserTeamId = result.winnerTeamId === match.teamAId ? match.teamBId : match.teamAId;

        await updatePointsTableService(
            match.tournamentId,
            result.winnerTeamId,
            {
                won: true,
                lost: false,
                tied: false,
                noResult: false,
                runsScored: result.winnerTeamId === firstInnings.battingTeamId ? firstInnings.totalRuns : secondInnings.totalRuns,
                ballsFaced: result.winnerTeamId === firstInnings.battingTeamId ? firstInnings.legalBalls : secondInnings.legalBalls,
                runsConceded: result.winnerTeamId === firstInnings.battingTeamId ? secondInnings.totalRuns : firstInnings.totalRuns,
                ballsBowled: result.winnerTeamId === firstInnings.battingTeamId ? secondInnings.legalBalls : firstInnings.legalBalls
            },
            db
        );

        await updatePointsTableService(
            match.tournamentId,
            loserTeamId,
            {
                won: false,
                lost: true,
                tied: false,
                noResult: false,
                runsScored: loserTeamId === firstInnings.battingTeamId ? firstInnings.totalRuns : secondInnings.totalRuns,
                ballsFaced: loserTeamId === firstInnings.battingTeamId ? firstInnings.legalBalls : secondInnings.legalBalls,
                runsConceded: loserTeamId === firstInnings.battingTeamId ? secondInnings.totalRuns : firstInnings.totalRuns,
                ballsBowled: loserTeamId === firstInnings.battingTeamId ? secondInnings.legalBalls : firstInnings.legalBalls
            },
            db
        );
    }

    return {
        completed: true,
        type: "MATCH_COMPLETED",
        winnerTeamId: result.winnerTeamId,
        result: result.result,
        winningMargin: result.winningMargin
    };
}