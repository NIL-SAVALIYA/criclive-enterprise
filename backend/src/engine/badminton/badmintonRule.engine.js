/**
 * @file badmintonRule.engine.js
 * @description Standard Badminton Rally Scoring Engine.
 * Supports:
 * - Best-of-3 games format (first side to win 2 games wins match)
 * - 21-point rally scoring (1 point per rally won)
 * - Deuce rule (at 20-20, side must lead by 2 points, e.g. 22-20, 24-22)
 * - 30-point max cap (at 29-29, 30th point wins game 30-29)
 * - Immediate match completion upon 2nd game victory
 * - Service court calculation (EVEN score = Right court, ODD score = Left court)
 */

export const MAX_GAME_POINTS = 21;
export const MAX_CAP_POINTS = 30;
export const GAMES_TO_WIN_MATCH = 2;

/**
 * Validates whether a game has been won according to Badminton rules.
 * @param {number} pointsA - Points scored by Team A in current game
 * @param {number} pointsB - Points scored by Team B in current game
 * @returns {boolean} True if current game is completed
 */
export function checkGameWon(pointsA, pointsB) {
  if (pointsA < 0 || pointsB < 0) return false;

  // Max cap rule: first to 30 points wins
  if (pointsA === MAX_CAP_POINTS || pointsB === MAX_CAP_POINTS) {
    return true;
  }

  // Standard win: >= 21 points AND lead of >= 2 points
  if (pointsA >= MAX_GAME_POINTS && pointsA - pointsB >= 2) {
    return true;
  }
  if (pointsB >= MAX_GAME_POINTS && pointsB - pointsA >= 2) {
    return true;
  }

  return false;
}

/**
 * Calculates the next Badminton match state after a rally point is scored.
 * @param {Object} currentState - Current BadmintonMatchState
 * @param {Object} match - Match object containing teamAId and teamBId
 * @param {string} scoringTeamId - Team ID that won the rally
 * @param {Object} options - Optional server/receiver metadata
 * @returns {Object} { nextState, pointData, isGameWon, isMatchWon, winningTeamId }
 */
export function calculateRallyPoint(currentState, match, scoringTeamId, options = {}) {
  const { teamAId, teamBId } = match;

  if (!scoringTeamId || (scoringTeamId !== teamAId && scoringTeamId !== teamBId)) {
    const error = new Error("Scoring team ID must belong to Team A or Team B of the match.");
    error.statusCode = 400;
    throw error;
  }

  if (currentState.status === "COMPLETED" || currentState.teamASetsWon >= GAMES_TO_WIN_MATCH || currentState.teamBSetsWon >= GAMES_TO_WIN_MATCH) {
    const error = new Error("Cannot record point. Match is already completed.");
    error.statusCode = 400;
    throw error;
  }

  const currentGame = currentState.currentGame || 1;
  if (currentGame < 1 || currentGame > 3) {
    const error = new Error(`Invalid game number ${currentGame}. Badminton supports best-of-3 games.`);
    error.statusCode = 400;
    throw error;
  }

  // Determine current points key for game
  const pointsAKey = `teamAPointsGame${currentGame}`;
  const pointsBKey = `teamBPointsGame${currentGame}`;

  let currentPointsA = currentState[pointsAKey] || 0;
  let currentPointsB = currentState[pointsBKey] || 0;

  if (scoringTeamId === teamAId) {
    currentPointsA += 1;
  } else {
    currentPointsB += 1;
  }

  // Prevent exceeding 30 points cap
  if (currentPointsA > MAX_CAP_POINTS || currentPointsB > MAX_CAP_POINTS) {
    const error = new Error(`Point cap of ${MAX_CAP_POINTS} reached for game ${currentGame}.`);
    error.statusCode = 400;
    throw error;
  }

  const isGameWon = checkGameWon(currentPointsA, currentPointsB);

  let updatedSetsWonA = currentState.teamASetsWon || 0;
  let updatedSetsWonB = currentState.teamBSetsWon || 0;
  let nextGame = currentGame;
  let isMatchWon = false;
  let winningTeamId = null;

  if (isGameWon) {
    if (currentPointsA > currentPointsB) {
      updatedSetsWonA += 1;
    } else {
      updatedSetsWonB += 1;
    }

    if (updatedSetsWonA >= GAMES_TO_WIN_MATCH) {
      isMatchWon = true;
      winningTeamId = teamAId;
    } else if (updatedSetsWonB >= GAMES_TO_WIN_MATCH) {
      isMatchWon = true;
      winningTeamId = teamBId;
    } else {
      nextGame = currentGame + 1;
    }
  }

  // Determine service court side: EVEN = Right, ODD = Left
  const serverScore = scoringTeamId === teamAId ? currentPointsA : currentPointsB;
  const serviceCourt = serverScore % 2 === 0 ? "RIGHT" : "LEFT";

  const nextState = {
    ...currentState,
    currentGame: nextGame,
    teamASetsWon: updatedSetsWonA,
    teamBSetsWon: updatedSetsWonB,
    [pointsAKey]: currentPointsA,
    [pointsBKey]: currentPointsB,
    servingTeamId: scoringTeamId,
    currentServerId: options.serverId || currentState.currentServerId || null,
    currentReceiverId: options.receiverId || currentState.currentReceiverId || null,
    status: isMatchWon ? "COMPLETED" : "LIVE"
  };

  const pointData = {
    gameNumber: currentGame,
    scoringTeamId,
    servingTeamId: scoringTeamId,
    serverId: options.serverId || currentState.currentServerId || null,
    receiverId: options.receiverId || currentState.currentReceiverId || null,
    scoreTeamA: currentPointsA,
    scoreTeamB: currentPointsB,
    serviceCourt,
    commentary: options.commentary || `Point to ${scoringTeamId === teamAId ? "Team A" : "Team B"} (${currentPointsA}-${currentPointsB})`
  };

  return {
    nextState,
    pointData,
    isGameWon,
    isMatchWon,
    winningTeamId
  };
}
