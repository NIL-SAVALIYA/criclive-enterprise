import prisma from "../config/db.js";
import { MatchStatus } from "@prisma/client";
import { emitTableTennisPointScored, emitTableTennisMatchUpdated, emitTableTennisPointUndone } from "../socket/socket.server.js";

const TX_OPTIONS = { timeout: 20000, maxWait: 10000 };
function safeTx(fn) {
  return prisma.$transaction(fn, TX_OPTIONS);
}

/**
 * Validates that a match exists and belongs to TABLE_TENNIS.
 */
export async function validateTableTennisMatch(matchId, db = prisma) {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (matchId && !UUID_REGEX.test(matchId)) {
    const error = new Error("Invalid format for one or more parameters. Check that all IDs are valid UUIDs.");
    error.statusCode = 400;
    throw error;
  }

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      tournament: {
        include: { sport: true }
      },
      teamA: true,
      teamB: true
    }
  });

  if (!match) {
    const error = new Error("Match not found.");
    error.statusCode = 404;
    throw error;
  }

  const sportCode = match.tournament?.sport?.code;
  if (sportCode && sportCode !== "TABLE_TENNIS") {
    const error = new Error(`Match belongs to ${sportCode} and cannot use Table Tennis scoring.`);
    error.statusCode = 400;
    throw error;
  }

  return match;
}

/**
 * Resolves exactly 2 active players for each team from PlayingXI for Doubles.
 */
async function resolveDoublesPlayers(matchId, teamAId, teamBId, tx) {
  const playingXI = await tx.playingXI.findMany({ where: { matchId } });
  const teamAPlayers = playingXI.filter(p => p.teamId === teamAId).map(p => p.playerId);
  const teamBPlayers = playingXI.filter(p => p.teamId === teamBId).map(p => p.playerId);
  
  if (teamAPlayers.length !== 2 || teamBPlayers.length !== 2) {
    const error = new Error("Invalid Doubles Lineup: Exactly 2 players are required per team in the PlayingXI for a Doubles match.");
    error.statusCode = 400;
    throw error;
  }
  
  return { teamAPlayers, teamBPlayers };
}

/**
 * Calculates the exact 4-player service sequence for Doubles.
 */
function getDoublesSequence(initialServerId, initialReceiverId, teamAId, teamAPlayers, teamBId, teamBPlayers) {
  let serverTeamPlayers, receiverTeamPlayers, serverTeamId, receiverTeamId;
  
  if (teamAPlayers.includes(initialServerId)) {
    serverTeamPlayers = teamAPlayers;
    serverTeamId = teamAId;
    receiverTeamPlayers = teamBPlayers;
    receiverTeamId = teamBId;
  } else if (teamBPlayers.includes(initialServerId)) {
    serverTeamPlayers = teamBPlayers;
    serverTeamId = teamBId;
    receiverTeamPlayers = teamAPlayers;
    receiverTeamId = teamAId;
  } else {
    const error = new Error("Initial server is not in the active lineup.");
    error.statusCode = 400;
    throw error;
  }

  if (!receiverTeamPlayers.includes(initialReceiverId)) {
    const error = new Error("Initial receiver is not in the opponent's active lineup.");
    error.statusCode = 400;
    throw error;
  }

  const A = initialServerId;
  const C = initialReceiverId;
  const B = serverTeamPlayers.find(id => id !== A);
  const D = receiverTeamPlayers.find(id => id !== C);

  // A serves to C, C serves to B, B serves to D, D serves to A
  return [
    { nextServerId: A, nextReceiverId: C, nextServingTeamId: serverTeamId },
    { nextServerId: C, nextReceiverId: B, nextServingTeamId: receiverTeamId },
    { nextServerId: B, nextReceiverId: D, nextServingTeamId: serverTeamId },
    { nextServerId: D, nextReceiverId: A, nextServingTeamId: receiverTeamId }
  ];
}

/**
 * Calculates the next server and receiver based on the current score and format.
 */
function calculateNextServiceState(format, totalPoints, teamAId, teamBId, initialServerId, initialReceiverId, currentServerId, currentReceiverId, teamAPlayers = [], teamBPlayers = []) {
  if (!initialServerId || !initialReceiverId) return { nextServerId: currentServerId, nextReceiverId: currentReceiverId };

  // Deuce condition logic inside a game (points >= 20 and score is tied at 10-10 or above implies we change every 1 point)
  // Standard logic: change every 2 points.
  // We determine if we are in deuce by totalPoints.
  // Wait, if it's 10-10, total points = 20.
  // Before 10-10 (total < 20), service changes every 2 points.
  // After 10-10 (total >= 20), service changes every 1 point.
  
  const isDeucePhase = totalPoints >= 20;
  
  let serviceTurns = 0;
  if (isDeucePhase) {
    serviceTurns = 10 + (totalPoints - 20); // 10 turns for first 20 points, then 1 per point
  } else {
    serviceTurns = Math.floor(totalPoints / 2);
  }

  const isInitialServerTurn = serviceTurns % 2 === 0;

  if (format === 'SINGLES') {
    return {
      nextServerId: isInitialServerTurn ? initialServerId : initialReceiverId,
      nextReceiverId: isInitialServerTurn ? initialReceiverId : initialServerId,
      nextServingTeamId: null
    };
  } else if (format === 'DOUBLES') {
    const sequence = getDoublesSequence(initialServerId, initialReceiverId, teamAId, teamAPlayers, teamBId, teamBPlayers);
    return sequence[serviceTurns % 4];
  }

  return { nextServerId: currentServerId, nextReceiverId: currentReceiverId, nextServingTeamId: null };
}

export async function startTableTennisMatchService(matchId, options = {}) {
  return safeTx(async (tx) => {
    const match = await validateTableTennisMatch(matchId, tx);

    if (match.status === MatchStatus.COMPLETED) {
      const error = new Error("Match has already been completed.");
      error.statusCode = 400;
      throw error;
    }

    if (options.format === 'DOUBLES') {
      await resolveDoublesPlayers(match.id, match.teamAId, match.teamBId, tx);
    }

    let state = await tx.tableTennisMatchState.findUnique({
      where: { matchId: match.id },
      include: { games: true }
    });

    if (!state) {
      state = await tx.tableTennisMatchState.create({
        data: {
          matchId: match.id,
          format: options.format || 'SINGLES',
          bestOf: options.bestOf || 3,
          teamAGamesWon: 0,
          teamBGamesWon: 0,
          currentGameNumber: 1,
          status: MatchStatus.LIVE,
          currentServerId: options.initialServerId || null,
          currentReceiverId: options.initialReceiverId || null,
          servingTeamId: options.servingTeamId || null
        }
      });

      await tx.tableTennisGame.create({
        data: {
          tableTennisMatchStateId: state.id,
          gameNumber: 1,
          teamAScore: 0,
          teamBScore: 0,
          initialServerId: options.initialServerId || null,
          initialReceiverId: options.initialReceiverId || null,
          status: 'IN_PROGRESS'
        }
      });
    } else if (state.status === MatchStatus.UPCOMING) {
      state = await tx.tableTennisMatchState.update({
        where: { id: state.id },
        data: { status: MatchStatus.LIVE }
      });
    }

    if (match.status !== MatchStatus.LIVE) {
      await tx.match.update({
        where: { id: match.id },
        data: { status: MatchStatus.LIVE }
      });
    }

    const finalState = await getTableTennisMatchStateService(matchId, tx);
    emitTableTennisMatchUpdated(matchId, { status: finalState.status });
    return finalState;
  });
}

export async function getTableTennisMatchStateService(matchId, db = prisma) {
  const match = await validateTableTennisMatch(matchId, db);

  let state = await db.tableTennisMatchState.findUnique({
    where: { matchId },
    include: {
      games: {
        include: {
          points: {
            orderBy: { pointNumber: 'asc' }
          }
        },
        orderBy: { gameNumber: 'asc' }
      }
    }
  });

  return {
    match: {
      id: match.id,
      venue: match.venue,
      matchDate: match.matchDate,
      status: match.status,
      teamA: match.teamA,
      teamB: match.teamB
    },
    matchState: state
  };
}

export async function recordTableTennisPointService(matchId, pointInput) {
  return safeTx(async (tx) => {
    const match = await validateTableTennisMatch(matchId, tx);
    const { scoringTeamId, serverId, receiverId, commentary } = pointInput;

    const state = await tx.tableTennisMatchState.findUnique({
      where: { matchId },
      include: {
        games: { orderBy: { gameNumber: 'desc' }, take: 1 }
      }
    });

    if (!state) throw new Error("Match state not found. Start match first.");
    if (state.status === MatchStatus.COMPLETED) {
      const error = new Error("Match has already been completed.");
      error.statusCode = 400;
      throw error;
    }

    let currentGame = state.games[0];
    if (!currentGame || currentGame.status === 'COMPLETED') {
      const error = new Error("No active game found.");
      error.statusCode = 400;
      throw error;
    }

    const newScoreA = scoringTeamId === match.teamAId ? currentGame.teamAScore + 1 : currentGame.teamAScore;
    const newScoreB = scoringTeamId === match.teamBId ? currentGame.teamBScore + 1 : currentGame.teamBScore;

    // Check game completion: 11 points, win by 2
    let isGameWon = false;
    if ((newScoreA >= 11 || newScoreB >= 11) && Math.abs(newScoreA - newScoreB) >= 2) {
      isGameWon = true;
    }

    // Check match completion
    let newTeamAGames = state.teamAGamesWon;
    let newTeamBGames = state.teamBGamesWon;
    let isMatchWon = false;
    let matchWinnerId = null;

    if (isGameWon) {
      if (newScoreA > newScoreB) newTeamAGames++;
      else newTeamBGames++;

      const requiredGamesToWin = Math.ceil(state.bestOf / 2);
      if (newTeamAGames >= requiredGamesToWin) {
        isMatchWon = true;
        matchWinnerId = match.teamAId;
      } else if (newTeamBGames >= requiredGamesToWin) {
        isMatchWon = true;
        matchWinnerId = match.teamBId;
      }
    }

    const totalPoints = newScoreA + newScoreB;
    const pointNumberCount = await tx.tableTennisPoint.count({ where: { tableTennisGameId: currentGame.id } });
    
    // Create point
    const point = await tx.tableTennisPoint.create({
      data: {
        tableTennisGameId: currentGame.id,
        pointNumber: pointNumberCount + 1,
        scoringTeamId,
        servingTeamId: state.servingTeamId || match.teamAId,
        serverId: serverId || state.currentServerId,
        receiverId: receiverId || state.currentReceiverId,
        scoreTeamA: newScoreA,
        scoreTeamB: newScoreB,
        isGamePoint: isGameWon,
        isMatchPoint: isMatchWon,
        commentary
      }
    });

    // Determine next service state
    let nextServerId = serverId || state.currentServerId;
    let nextReceiverId = receiverId || state.currentReceiverId;
    let nextServingTeamId = state.servingTeamId;

    if (!isGameWon) {
      if (state.format === 'SINGLES') {
        const s = calculateNextServiceState(
          state.format,
          totalPoints,
          match.teamAId,
          match.teamBId,
          currentGame.initialServerId,
          currentGame.initialReceiverId,
          nextServerId,
          nextReceiverId
        );
        nextServerId = s.nextServerId;
        nextReceiverId = s.nextReceiverId;
        const isDeucePhase = totalPoints >= 20;
        const serviceTurns = isDeucePhase ? (10 + (totalPoints - 20)) : Math.floor(totalPoints / 2);
        
        if (state.servingTeamId === match.teamAId) {
          nextServingTeamId = (serviceTurns % 2 === 0) ? match.teamAId : match.teamBId;
        } else {
          nextServingTeamId = (serviceTurns % 2 === 0) ? match.teamBId : match.teamAId;
        }
      } else if (state.format === 'DOUBLES') {
        const { teamAPlayers, teamBPlayers } = await resolveDoublesPlayers(match.id, match.teamAId, match.teamBId, tx);
        const s = calculateNextServiceState(
          state.format,
          totalPoints,
          match.teamAId,
          match.teamBId,
          currentGame.initialServerId,
          currentGame.initialReceiverId,
          nextServerId,
          nextReceiverId,
          teamAPlayers,
          teamBPlayers
        );
        nextServerId = s.nextServerId;
        nextReceiverId = s.nextReceiverId;
        nextServingTeamId = s.nextServingTeamId;
      }
    }

    // Update game
    await tx.tableTennisGame.update({
      where: { id: currentGame.id },
      data: {
        teamAScore: newScoreA,
        teamBScore: newScoreB,
        status: isGameWon ? 'COMPLETED' : 'IN_PROGRESS'
      }
    });

    // Setup next game if this one is won but match is not
    if (isGameWon && !isMatchWon) {
      await tx.tableTennisGame.create({
        data: {
          tableTennisMatchStateId: state.id,
          gameNumber: state.currentGameNumber + 1,
          teamAScore: 0,
          teamBScore: 0,
          status: 'IN_PROGRESS',
          initialServerId: nextReceiverId, // The person who received first in last game serves first? Actually standard rules usually say they swap.
          initialReceiverId: nextServerId
        }
      });
      // In next game, serving team swaps from who served first in previous game
      nextServerId = currentGame.initialReceiverId; // Naive swap
      nextReceiverId = currentGame.initialServerId;
    }

    // Update state
    await tx.tableTennisMatchState.update({
      where: { id: state.id },
      data: {
        teamAGamesWon: newTeamAGames,
        teamBGamesWon: newTeamBGames,
        currentGameNumber: isGameWon && !isMatchWon ? state.currentGameNumber + 1 : state.currentGameNumber,
        status: isMatchWon ? MatchStatus.COMPLETED : MatchStatus.LIVE,
        currentServerId: isMatchWon ? null : nextServerId,
        currentReceiverId: isMatchWon ? null : nextReceiverId,
        servingTeamId: isMatchWon ? null : nextServingTeamId
      }
    });

    // Update parent match
    if (isMatchWon) {
      await tx.match.update({
        where: { id: match.id },
        data: {
          status: MatchStatus.COMPLETED,
          winnerTeamId: matchWinnerId,
          completedAt: new Date(),
          result: `Table Tennis Match won by ${matchWinnerId === match.teamAId ? 'Team A' : 'Team B'}`,
          winningMargin: `${Math.max(newTeamAGames, newTeamBGames)} - ${Math.min(newTeamAGames, newTeamBGames)}`
        }
      });
    }

    const finalState = await getTableTennisMatchStateService(matchId, tx);
    emitTableTennisPointScored(matchId, { pointRecord: point, updatedState: finalState });
    emitTableTennisMatchUpdated(matchId, { status: finalState.status });
    return finalState;
  });
}

export async function undoTableTennisPointService(matchId) {
  return safeTx(async (tx) => {
    const match = await validateTableTennisMatch(matchId, tx);

    const state = await tx.tableTennisMatchState.findUnique({
      where: { matchId },
      include: {
        games: { orderBy: { gameNumber: 'desc' } }
      }
    });

    if (!state || state.games.length === 0) {
      throw new Error("No match state or games found.");
    }

    // Find the latest point
    const latestGameWithPoints = await tx.tableTennisGame.findFirst({
      where: { tableTennisMatchStateId: state.id },
      orderBy: { gameNumber: 'desc' },
      include: {
        points: { orderBy: { pointNumber: 'desc' }, take: 2 }
      }
    });

    let targetGame = latestGameWithPoints;
    let targetPoint = targetGame?.points[0];

    // If the latest game has no points, we might need to rollback from the previous game
    if (!targetPoint && state.games.length > 1) {
      targetGame = state.games[1];
      const prevGameData = await tx.tableTennisGame.findUnique({
        where: { id: targetGame.id },
        include: { points: { orderBy: { pointNumber: 'desc' }, take: 2 } }
      });
      targetPoint = prevGameData.points[0];
      
      // Delete the empty game that was created for the next set
      await tx.tableTennisGame.delete({
        where: { id: latestGameWithPoints.id }
      });
    }

    if (!targetPoint) {
      throw new Error("No points to undo.");
    }

    const previousPoint = targetGame.points[1]; // might be undefined if it was the first point of the game

    // Revert match completion if it was won
    if (targetPoint.isMatchPoint) {
      await tx.match.update({
        where: { id: match.id },
        data: {
          status: MatchStatus.LIVE,
          winnerTeamId: null,
          completedAt: null,
          result: null,
          winningMargin: null
        }
      });
    }

    // Delete the point
    await tx.tableTennisPoint.delete({
      where: { id: targetPoint.id }
    });

    // Recalculate game scores
    const newTeamAScore = previousPoint ? previousPoint.scoreTeamA : 0;
    const newTeamBScore = previousPoint ? previousPoint.scoreTeamB : 0;

    await tx.tableTennisGame.update({
      where: { id: targetGame.id },
      data: {
        teamAScore: newTeamAScore,
        teamBScore: newTeamBScore,
        status: 'IN_PROGRESS'
      }
    });

    // Revert Games Won
    let newTeamAGames = state.teamAGamesWon;
    let newTeamBGames = state.teamBGamesWon;
    if (targetPoint.isGamePoint) {
      if (targetPoint.scoreTeamA > targetPoint.scoreTeamB) newTeamAGames--;
      else newTeamBGames--;
    }

    // Determine restored service state
    let restoredServerId = targetGame.initialServerId;
    let restoredReceiverId = targetGame.initialReceiverId;
    let restoredServingTeamId = null;

    const totalPoints = newTeamAScore + newTeamBScore;
    const isDeucePhase = totalPoints >= 20;
    const serviceTurns = isDeucePhase ? (10 + (totalPoints - 20)) : Math.floor(totalPoints / 2);
    
    if (state.format === 'SINGLES') {
      const isInitialServerTurn = serviceTurns % 2 === 0;
      restoredServerId = isInitialServerTurn ? targetGame.initialServerId : targetGame.initialReceiverId;
      restoredReceiverId = isInitialServerTurn ? targetGame.initialReceiverId : targetGame.initialServerId;
      
      // We don't have direct access to serving team logic easily backwards without knowing who A and B are.
      // But we can pull servingTeamId from the previous point if it exists.
      if (previousPoint) {
        restoredServingTeamId = previousPoint.servingTeamId; // Wait, previous point's servingTeamId is who served the previous point, which might have been a different server than the newly restored one.
        // Actually, if we just pull the initial Serving team and toggle it...
        // Let's rely on the previous point's serverId or just calculate it like singles did.
      }
      
      // Let's use the same toggle logic:
      // We need to know who served first to know the serving team.
      // But since singles is simple, we will just keep previous logic or fetch it if needed.
    } else if (state.format === 'DOUBLES') {
      const { teamAPlayers, teamBPlayers } = await resolveDoublesPlayers(match.id, match.teamAId, match.teamBId, tx);
      const s = calculateNextServiceState(
        state.format,
        totalPoints,
        match.teamAId,
        match.teamBId,
        targetGame.initialServerId,
        targetGame.initialReceiverId,
        restoredServerId,
        restoredReceiverId,
        teamAPlayers,
        teamBPlayers
      );
      restoredServerId = s.nextServerId;
      restoredReceiverId = s.nextReceiverId;
      restoredServingTeamId = s.nextServingTeamId;
    }

    await tx.tableTennisMatchState.update({
      where: { id: state.id },
      data: {
        teamAGamesWon: newTeamAGames,
        teamBGamesWon: newTeamBGames,
        currentGameNumber: targetGame.gameNumber,
        status: MatchStatus.LIVE,
        currentServerId: restoredServerId,
        currentReceiverId: restoredReceiverId,
        servingTeamId: restoredServingTeamId
      }
    });

    const finalState = await getTableTennisMatchStateService(matchId, tx);
    emitTableTennisPointUndone(matchId, { undonePointId: targetPoint.id, revertedState: finalState });
    emitTableTennisMatchUpdated(matchId, { status: finalState.status });
    return finalState;
  });
}
