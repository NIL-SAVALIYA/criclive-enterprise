import {
  startFootballMatchService,
  getFootballMatchStateService,
  getFootballEventsService,
  recordGoalService,
  recordCardService,
  recordSubstitutionService,
  recordPenaltyService,
  recordKickoffService,
  recordHalfTimeService,
  startSecondHalfService,
  recordFullTimeService,
  undoFootballEventService
} from "../services/footballMatch.service.js";

/**
 * POST /api/v1/football/matches/:matchId/start
 */
export async function startMatch(req, res) {
  try {
    const { matchId } = req.params;
    const result = await startFootballMatchService(matchId, req.body, req.user);

    return res.status(200).json({
      success: true,
      message: "Football match started successfully.",
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to start Football match."
    });
  }
}

/**
 * GET /api/v1/football/matches/:matchId/state
 */
export async function getMatchState(req, res) {
  try {
    const { matchId } = req.params;
    const result = await getFootballMatchStateService(matchId);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch Football match state."
    });
  }
}

/**
 * GET /api/v1/football/matches/:matchId/events
 */
export async function getEvents(req, res) {
  try {
    const { matchId } = req.params;
    const result = await getFootballEventsService(matchId);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to fetch Football events."
    });
  }
}

/**
 * POST /api/v1/football/matches/:matchId/events/goal
 */
export async function recordGoal(req, res) {
  try {
    const { matchId } = req.params;
    const { scoringTeamId, playerId, secondaryPlayerId, minute, detail, isPenalty } = req.body;

    if (!scoringTeamId) {
      return res.status(400).json({
        success: false,
        message: "scoringTeamId is required."
      });
    }

    const result = await recordGoalService(
      matchId,
      { scoringTeamId, playerId, secondaryPlayerId, minute, detail, isPenalty },
      req.user
    );

    return res.status(201).json({
      success: true,
      message: "Goal recorded successfully.",
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to record goal."
    });
  }
}

/**
 * POST /api/v1/football/matches/:matchId/events/card
 */
export async function recordCard(req, res) {
  try {
    const { matchId } = req.params;
    const { cardType, teamId, playerId, minute, detail } = req.body;

    if (!cardType) {
      return res.status(400).json({
        success: false,
        message: "cardType is required (YELLOW_CARD or RED_CARD)."
      });
    }

    const result = await recordCardService(
      matchId,
      { cardType, teamId, playerId, minute, detail },
      req.user
    );

    return res.status(201).json({
      success: true,
      message: "Card recorded successfully.",
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to record card."
    });
  }
}

/**
 * POST /api/v1/football/matches/:matchId/events/substitution
 */
export async function recordSubstitution(req, res) {
  try {
    const { matchId } = req.params;
    const { teamId, playerLeavingId, playerEnteringId, minute, detail } = req.body;

    const result = await recordSubstitutionService(
      matchId,
      { teamId, playerLeavingId, playerEnteringId, minute, detail },
      req.user
    );

    return res.status(201).json({
      success: true,
      message: "Substitution recorded successfully.",
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to record substitution."
    });
  }
}

/**
 * POST /api/v1/football/matches/:matchId/events/penalty
 */
export async function recordPenalty(req, res) {
  try {
    const { matchId } = req.params;
    const { teamId, playerId, minute, isScored, detail } = req.body;

    const result = await recordPenaltyService(
      matchId,
      { teamId, playerId, minute, isScored, detail },
      req.user
    );

    return res.status(201).json({
      success: true,
      message: isScored ? "Penalty goal recorded successfully." : "Penalty event recorded successfully.",
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to record penalty."
    });
  }
}

/**
 * POST /api/v1/football/matches/:matchId/events/kickoff
 */
export async function recordKickoff(req, res) {
  try {
    const { matchId } = req.params;
    const { minute, teamId, detail } = req.body;

    const result = await recordKickoffService(
      matchId,
      { minute, teamId, detail },
      req.user
    );

    return res.status(201).json({
      success: true,
      message: "Kickoff recorded successfully.",
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to record kickoff."
    });
  }
}

/**
 * POST /api/v1/football/matches/:matchId/half-time
 */
export async function recordHalfTime(req, res) {
  try {
    const { matchId } = req.params;
    const result = await recordHalfTimeService(matchId, req.body, req.user);

    return res.status(200).json({
      success: true,
      message: "Half-time whistle recorded successfully.",
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to record half-time."
    });
  }
}

/**
 * POST /api/v1/football/matches/:matchId/second-half
 */
export async function startSecondHalf(req, res) {
  try {
    const { matchId } = req.params;
    const result = await startSecondHalfService(matchId, req.body, req.user);

    return res.status(200).json({
      success: true,
      message: "Second half started successfully.",
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to start second half."
    });
  }
}

/**
 * POST /api/v1/football/matches/:matchId/full-time
 */
export async function recordFullTime(req, res) {
  try {
    const { matchId } = req.params;
    const result = await recordFullTimeService(matchId, req.body, req.user);

    return res.status(200).json({
      success: true,
      message: "Full-time recorded and match completed successfully.",
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to record full-time."
    });
  }
}

/**
 * POST /api/v1/football/matches/:matchId/undo-event
 */
export async function undoEvent(req, res) {
  try {
    const { matchId } = req.params;
    const result = await undoFootballEventService(matchId, req.user);

    return res.status(200).json({
      success: true,
      message: "Last football event undone successfully.",
      data: result
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to undo football event."
    });
  }
}
